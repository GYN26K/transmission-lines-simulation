import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLine, sampleLine } from '../src/calculations/transmissionLine.js';

const base = {
  mode: 'lossy', z0: 50, rl: 100, xl: 0, frequency: 100e6,
  velocity: 2e8, length: 10, v0: 1,
  R: 0.5, L: 250e-9, G: 1e-5, C: 100e-12
};

test('lossless mode has zero attenuation', () => {
  const q = calculateLine({ ...base, mode: 'lossless' });
  assert.equal(q.alpha, 0);
  assert.ok(Math.abs(q.z0.re - 50) < 1e-12);
});

test('general lossy mode calculates positive attenuation', () => {
  const q = calculateLine(base);
  assert.ok(q.alpha > 0);
  assert.ok(q.beta > 0);
  assert.ok(q.attenuationDbPerM > 0);
});

test('reflection magnitude decays from load towards generator', () => {
  const d = sampleLine(base, 0, 1000);
  assert.ok(d.localGamma.at(-1) < d.localGamma[0]);
});

test('power balance closes for a passive lossy line', () => {
  const d = sampleLine(base, 0, 4000);
  assert.ok(Math.abs(d.powerBalanceError) < 1e-8);
  assert.ok(d.integratedLoss > 0);
});

test('lossless limit of low-loss model agrees when R and G are zero', () => {
  const lossless = calculateLine({ ...base, mode: 'lossless', R: 0, G: 0 });
  const lowLoss = calculateLine({ ...base, mode: 'lowloss', R: 0, G: 0 });
  assert.ok(Math.abs(lossless.beta - lowLoss.beta) < 1e-10);
  assert.ok(Math.abs(lossless.z0.re - lowLoss.z0.re) < 1e-10);
});
