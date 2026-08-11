# Crystal Lattice

[![CI](https://github.com/OpenPhysics/CrystalLattice/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenPhysics/CrystalLattice/actions/workflows/ci.yml)

An interactive simulation of crystal structure, built with
[SceneryStack](https://scenerystack.org/), Vite 8, TypeScript 7, and Biome 2.

Students build 2D Bravais lattices and 3D cubic and close-packed structures, read off the
quantities that follow from them, learn to index planes and directions — and then, on the last
screen, meet the case where the repeating unit cell every earlier screen assumed turns out not to
be necessary at all.

## Features

| Screen | What it shows |
|---|---|
| **2D Lattices** | Drag two primitive vectors and find the five 2D Bravais lattices. Primitive cell, Wigner–Seitz construction, coordination shell, areal density. |
| **Cubic Systems** | Build SC, BCC and FCC cells. Count shared atoms, discover the touching condition by dragging into it, and compare the computed density against real cubic metals. |
| **Close-Packing** | Stack ABAB versus ABCABC and watch the packing fraction *not* move. Axial-ratio slider, real-metal c/a table, and classification of any stacking fault. |
| **Miller Indices** | Drag an intercept handle along each axis and watch the derivation follow: intercepts → reciprocals → clear → reduce, shown in full. Includes why (200) ≠ (100). |
| **Aperiodic Order** | Penrose tilings and the 2023 "hat" monotile, with a live diffraction pattern beside a periodic lattice's: both sharp, but only one with ten-fold symmetry. Lay Penrose rhombi by hand against the matching rules, and find the dead ends that make inflation the practical way to grow one. |

The physics is documented for educators in [`doc/model.md`](doc/model.md) and for developers in
[`doc/implementation-notes.md`](doc/implementation-notes.md).

### Under the hood

- Model/view separation, with all crystallography in Scenery-free modules under `src/common/model/`
- 205 unit tests covering the geometry, the tiling generators, the matching rules, and the diffraction transform
- Full Interactive Description support: live screen summaries, named controls, explicit PDOM order
- English, Spanish, and French localization via `StringManager`
- Default and projector color profiles
- Progressive Web App (installable, offline-capable)
- Git hooks for Biome pre-commit checks
- Shared GitHub Actions CI via `OpenPhysics/Baton`

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke (`?fuzz`, default 15s) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

The sim starts at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag).

`scripts/rename-sim.ts` and `scripts/scaffold-screens.ts` are inherited from the template and are no longer used here; they remain in the tree so template updates can still be merged cleanly.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^7 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenPhysics org license](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

`src/common/model/EinsteinTiling.ts` is a port of Craig S. Kaplan's `hatviz`, used under its
BSD 3-Clause licence; the full notice and the scientific sources are in [CREDITS.md](CREDITS.md).

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
