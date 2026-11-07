# WaveLab — Transmission Line Laboratory

A React + Vite educational simulator for sinusoidal steady-state waves on an ideal, lossless transmission line.

## Requirements

- Node.js 18.18+ (Node 20 LTS recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

The production-ready site is generated in `dist/`.

## Features

- Editable load impedance `ZL = RL + jXL`, characteristic impedance, frequency, propagation velocity, line length and incident voltage amplitude.
- Matched, open-circuit approximation, short-circuit, mismatch and reactive-load presets.
- Play/pause time animation.
- Incident, reflected and resultant voltage plots.
- Voltage and current standing-wave envelopes and instantaneous current.
- Movable observation probe.
- Reflection coefficient, VSWR, wavelength, phase constant and return loss calculations.
- Theory and equation reference pages.

## Model and sign convention

The model is sinusoidal steady state and assumes a lossless line with real, positive characteristic impedance `Z0`. The load is complex: `ZL = RL + jXL`.

Distance `x` is measured from the load towards the generator. With the `exp(jωt)` phasor convention:

- Incident voltage phasor: `Vi(x) = V0+ exp(+jβx)`
- Reflected voltage phasor: `Vr(x) = V0+ ΓL exp(-jβx)`
- Reflection coefficient: `ΓL = (ZL - Z0)/(ZL + Z0)`
- Voltage: `v(x,t) = Re{[Vi(x) + Vr(x)] exp(jωt)}`
- Current, positive towards the load: `I(x) = [Vi(x) - Vr(x)]/Z0`

This is not a transient pulse/reflection simulator. It does not yet model line attenuation, dispersion, frequency-dependent parameters, or a finite source impedance.

## Lossy transmission-line model

The simulator now has three modes:

- **Lossless:** uses the entered real characteristic impedance and propagation velocity.
- **Low-loss:** uses the low-loss approximations for attenuation and phase constants.
- **General lossy:** computes complex characteristic impedance and propagation constant from distributed R, L, G and C.

The distributed parameters are per metre. The phasor convention is `exp(+jωt)`, the load is at `x = 0`, x increases towards the generator, and current is positive towards the load. `V0+` is the peak incident-voltage phasor referenced at the load plane.

For the general lossy model:

```text
Z0 = sqrt((R + jωL) / (G + jωC))
γ  = α + jβ = sqrt((R + jωL)(G + jωC))
ΓL = (ZL - Z0) / (ZL + Z0)
Vi(x) = V0+ exp(+γx)
Vr(x) = V0+ ΓL exp(-γx)
V(x) = Vi(x) + Vr(x)
Ii(x) = Vi(x) / Z0
Ir(x) = -Vr(x) / Z0
I(x) = Ii(x) + Ir(x)
Zin = Z0 (ZL + Z0 tanh(γl)) / (Z0 + ZL tanh(γl))
Γin = ΓL exp(-2γl)
```

The application plots instantaneous voltage/current, voltage and current upper/lower magnitude envelopes, relative attenuation, local reflection magnitude/VSWR, average power flow and distributed conductor/dielectric power loss. Power is calculated using peak phasors, so `Pavg = 0.5 Re(V I*)`.

**Model limits:** sinusoidal steady state only; no transient pulse simulation, frequency-dependent material models, skin-effect model, or dispersive dielectric model. In the complex-Z0 general lossy mode, voltage-wave reflection coefficient is used. Conventional VSWR interpretation is most straightforward when the reference impedance is real and positive.

## Publish the website on GitHub Pages

This repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml` and a relative Vite base path, so the site can be hosted from a GitHub repository without changing source paths.

1. Create a new GitHub repository (for example, `transmission-line-lab`).
2. Extract this project ZIP and upload the **contents** of the `transmission-line-lab` folder to the repository root. The root must contain `package.json`, `index.html`, `vite.config.js`, `src/`, and `.github/`.
3. Commit the files to the `main` branch.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment → Source**, select **GitHub Actions**.
6. Open the repository's **Actions** tab and wait for the **Deploy to GitHub Pages** workflow to finish successfully.
7. Open the published URL shown in the workflow's deployment summary. It will normally be `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

Whenever you push a new commit to `main`, GitHub Actions automatically rebuilds and republishes the website. The repository itself stores the source code; GitHub Pages hosts the built website so visitors can open the URL without installing Node.js.
