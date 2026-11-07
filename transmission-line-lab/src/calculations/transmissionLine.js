// Complex arithmetic and transmission-line calculations.
// Convention: x=0 at load, x increases towards generator; current is positive towards load.
// Time convention: exp(+j omega t). V0Plus is the peak incident-voltage phasor at the load.

export const c = (re = 0, im = 0) => ({ re, im });
export const add = (a, b) => c(a.re + b.re, a.im + b.im);
export const sub = (a, b) => c(a.re - b.re, a.im - b.im);
export const mul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const scale = (a, k) => c(a.re * k, a.im * k);
export const abs = a => Math.hypot(a.re, a.im);
export const arg = a => Math.atan2(a.im, a.re);
export const conj = a => c(a.re, -a.im);
export const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  if (d < 1e-30) return c(Infinity, Infinity);
  return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
export const exp = a => {
  const m = Math.exp(a.re);
  return c(m * Math.cos(a.im), m * Math.sin(a.im));
};
export const sqrt = a => {
  const r = abs(a);
  const re = Math.sqrt(Math.max(0, (r + a.re) / 2));
  const im = Math.sign(a.im || 1) * Math.sqrt(Math.max(0, (r - a.re) / 2));
  return c(re, im);
};
export const tanh = a => {
  const den = Math.cosh(2 * a.re) + Math.cos(2 * a.im);
  if (Math.abs(den) < 1e-14) return c(Infinity, Infinity);
  return c(Math.sinh(2 * a.re) / den, Math.sin(2 * a.im) / den);
};

const positiveRoot = z => {
  let root = sqrt(z);
  // Passive forward propagation uses Re(gamma)>=0 and Im(gamma)>=0 for ordinary positive R,L,G,C.
  if (root.re < 0 || (Math.abs(root.re) < 1e-14 && root.im < 0)) root = scale(root, -1);
  return root;
};

export function calculateLine(p) {
  const omega = 2 * Math.PI * p.frequency;
  const zl = c(p.rl, p.xl);
  const R = Math.max(0, p.R || 0);
  const L = Math.max(0, p.L || 0);
  const G = Math.max(0, p.G || 0);
  const C = Math.max(0, p.C || 0);
  let z0;
  let gamma;

  if (p.mode === 'lossless') {
    const zReal = Math.max(1e-12, p.z0 || 50);
    const velocity = Math.max(1, p.velocity || 2e8);
    z0 = c(zReal, 0);
    gamma = c(0, omega / velocity);
  } else if (p.mode === 'lowloss') {
    if (!(L > 0 && C > 0)) throw new Error('L and C must be positive in distributed-parameter modes.');
    const zReal = Math.sqrt(L / C);
    const alpha = (R / 2) * Math.sqrt(C / L) + (G / 2) * Math.sqrt(L / C);
    const beta = omega * Math.sqrt(L * C);
    z0 = c(zReal, 0);
    gamma = c(alpha, beta);
  } else {
    if (!(L > 0 && C > 0)) throw new Error('L and C must be positive in distributed-parameter modes.');
    const numerator = c(R, omega * L);
    const denominator = c(G, omega * C);
    z0 = positiveRoot(div(numerator, denominator));
    gamma = positiveRoot(mul(numerator, denominator));
  }

  const gammaLoad = div(sub(zl, z0), add(zl, z0));
  const gm = abs(gammaLoad);
  const alpha = gamma.re;
  const beta = gamma.im;
  const lambda = beta > 0 ? 2 * Math.PI / beta : Infinity;
  const velocity = beta > 0 ? omega / beta : Infinity;
  const vswrLoad = gm >= 1 - 1e-12 ? Infinity : (1 + gm) / (1 - gm);
  const zin = mul(z0, div(
    add(zl, mul(z0, tanh(scale(gamma, p.length)))),
    add(z0, mul(zl, tanh(scale(gamma, p.length))))
  ));
  const gammaIn = mul(gammaLoad, exp(scale(gamma, -2 * p.length)));
  return {
    zl, z0, gamma: gammaLoad, gm, gammaPhase: arg(gammaLoad), gammaProp: gamma,
    alpha, beta, omega, lambda, velocity, vswr: vswrLoad, zin, gammaIn,
    attenuationDbPerM: 8.685889638 * alpha,
    classification: gm < 1e-8 ? 'Matched · no reflected wave' : gm > 1 - 1e-8 ? 'Total reflection' : 'Partial reflection · mixed wave'
  };
}

export function sampleLine(p, time, count = 360) {
  const q = calculateLine(p);
  const xs = Array.from({ length: count + 1 }, (_, i) => p.length * i / count);
  const vi = [], vr = [], vt = [], ii = [], ir = [], it = [];
  const vUpper = [], vLower = [], iUpper = [], iLower = [];
  const localGamma = [], localVswr = [], attenuation = [], power = [], lossPerM = [];
  const V0 = c(p.v0, 0);
  for (const x of xs) {
    const forwardFactor = exp(scale(q.gammaProp, x));
    const reverseFactor = exp(scale(q.gammaProp, -x));
    const viPh = mul(V0, forwardFactor);
    const vrPh = mul(mul(V0, q.gamma), reverseFactor);
    const vPh = add(viPh, vrPh);
    const iiPh = div(viPh, q.z0);
    const irPh = scale(div(vrPh, q.z0), -1);
    const iPh = add(iiPh, irPh);
    const wt = c(Math.cos(q.omega * time), Math.sin(q.omega * time));
    const instant = z => mul(z, wt).re;

    vi.push(instant(viPh)); vr.push(instant(vrPh)); vt.push(instant(vPh));
    ii.push(instant(iiPh)); ir.push(instant(irPh)); it.push(instant(iPh));

    const incidentMag = abs(viPh);
    const reflectedMag = abs(vrPh);
    vUpper.push(incidentMag + reflectedMag);
    vLower.push(Math.abs(incidentMag - reflectedMag));
    const incidentIMag = abs(iiPh);
    const reflectedIMag = abs(irPh);
    iUpper.push(incidentIMag + reflectedIMag);
    iLower.push(Math.abs(incidentIMag - reflectedIMag));

    const gl = abs(mul(q.gamma, exp(scale(q.gammaProp, -2 * x))));
    localGamma.push(gl);
    localVswr.push(gl >= 1 - 1e-12 ? Infinity : (1 + gl) / (1 - gl));
    attenuation.push(Math.exp(-q.alpha * x));
    const sComplex = mul(vPh, conj(iPh));
    const pAvg = 0.5 * sComplex.re;
    power.push(pAvg);
    const loss = 0.5 * (Math.max(0, p.R || 0) * abs(iPh) ** 2 + Math.max(0, p.G || 0) * abs(vPh) ** 2);
    lossPerM.push(loss);
  }

  let integratedLoss = 0;
  for (let i = 1; i < xs.length; i++) {
    integratedLoss += (lossPerM[i] + lossPerM[i - 1]) * 0.5 * (xs[i] - xs[i - 1]);
  }
  const loadPower = power[0];
  const generatorEndNetPower = power[power.length - 1];
  return {
    xs, vi, vr, vt, ii, ir, it,
    vEnv: vUpper, vMinEnv: vLower, iEnv: iUpper, iMinEnv: iLower,
    localGamma, localVswr, attenuation, power, lossPerM, integratedLoss,
    loadPower, generatorEndNetPower, powerBalanceError: generatorEndNetPower - loadPower - integratedLoss,
    q
  };
}
