# UHF — Unified Hydrodynamic Framework

A Theory of Everything grounded in quantum vacuum hydrodynamics. The universe is modeled as an incompressible superfluid; General Relativity, the Standard Model, and quantum mechanics emerge as effective infrared limits of the underlying fluid dynamics.

---

## Papers

All documents are SHA-256 hashed and permanently registered on the **Polygon blockchain** (Contract [`0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054`](https://polygonscan.com/address/0xe0bB4bC3116e19F2c0c183eFf8802C4F707B0054)).

| Document | SHA-256 | Polygon TX |
|---|---|---|
| [Part I — Physical Core](UHF_Part_I_Core.md) | `026e919e...a1e7b` | [v8.4](https://polygonscan.com/tx/0xc4f18abc225b84186b5b000e8c582ff3e0c55a17629b75f5d7c99d2b00c8c3af) |
| [Part II — Mathematical Foundations](UHF_Part_II_Mathematical_Foundations.md) | `ad6ee786...735a3e` | [v8.4](https://polygonscan.com/tx/0xc2e7150c48a53d0e3ad1a21e16746c278758841ad08d3a09b46db283371ffefb) |
| [Part III — Standard Model Extension](UHF_Part_III_Standard_Model.md) | `020ec276...03471` | [v8.4](https://polygonscan.com/tx/0xf6aafd64b27c0184b352a913e1f812cddb3a90398631c7456605799b816cc5fd) |
| [Defense Addendum](UHF_Defense_Addendum.md) | `9cc42b74...5094d` | [v8.5](https://polygonscan.com/tx/0x255e56192dbf14cd7edb6f068e5c93c95723edc376e3c262d762816ff74c49e5) |

## Simulation Suite

The `simulation/` directory contains GPU-accelerated Python code used to generate all empirical results cited in the papers. It runs on an RTX 3090 and covers:

- **LIGO GW150914** matched-filter SNR comparison (UHF vs GR, mismatch 4.46 × 10⁻⁸)
- **NANOGrav 15-year PTA** spectral fit (χ²_ν = 0.14 UHF vs 5.79 GR, ΔAIC ≈ 37.69)
- **JWST impossible galaxies** — halo enhancement factor 6.01× at z = 10
- **Core-Cusp problem** — Bohm quantum pressure halts collapse, α = −0.00 at r = 0.05 kpc
- **Muon g-2** — knot topology prediction, Δa_μ = 1.58 × 10⁻⁹ (63% of anomaly, zero free parameters)

Simulation suite SHA-256: `8f00520b...bc0d8b6`  
Polygon TX (v8.5-Simulation): [0x22bf...1658](https://polygonscan.com/tx/0x22bf049c114f01ddab790df6d980f4bd9faf4eb145ef619bdc68f3bbfd861658)

## Landing Page

The live landing page is at: **[https://amiramitai.github.io/uhf](https://amiramitai.github.io/uhf)**  
Source: `src/App.svelte` (Svelte/Vite SPA)

---

## Peer Review Invitation

**UHF makes specific, falsifiable predictions. We actively invite peer review.**

If you believe you have found:
- A mathematical error in the framework
- A failed experimental prediction
- A stronger alternative explanation for any cited result

Please [open a GitHub Issue](https://github.com/amiramitai/uhf/issues/new) and label it with one of:
- `objection` — a theoretical critique
- `proof-of-error` — a demonstrated failure of the framework
- `proposed-test` — a new experimental test that could decide the matter

Cite the specific equation or section, and reference the SHA-256 version so the record is unambiguous. Every substantive critique will receive a written response. Decisive falsifications will be acknowledged publicly and recorded on-chain.

---

## Quick Start (Simulations)

```bash
# Clone
git clone https://github.com/amiramitai/uhf.git
cd uhf/simulation

# Install dependencies (Python 3.10+, CUDA optional)
pip install numpy scipy matplotlib torch

# Run the LIGO hunter
python uhf_ligo_hunter.py

# Run the NANOGrav spectral fit
python uhf_nanograv_hunter.py

# Run the JWST halo enhancement
python uhf_jwst_hunter.py
```

## Repository Structure

```
UHF_Part_I_Core.md               — Part I paper (Markdown + PDF)
UHF_Part_II_Mathematical_Foundations.md  — Part II paper
UHF_Part_III_Standard_Model.md   — Part III paper
UHF_Defense_Addendum.md          — Empirical rebuttals to 9 objection categories
simulation/                       — GPU Python verification suite
scripts/                          — Blockchain registration scripts
src/                              — Landing page (Svelte/Vite)
```

## On-Chain Log

All registration events are appended to [`scripts/on-chain-log.txt`](scripts/on-chain-log.txt).

---

*"The universe is not a geometry. It is a fluid."*  
© 2026 Amir Benjamin Amitay · All Rights Reserved · Immutably timestamped on Polygon
