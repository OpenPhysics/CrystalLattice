# CLAUDE.md — Crystal Lattice

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

A five-screen simulation of crystal structure, forked from
[SceneryStackTemplate](https://github.com/OpenPhysics/SceneryStackTemplate). The screens form an
argument, not a topic list: Screens 1–4 build up the repeating-unit-cell picture, and Screen 5
withdraws it. Educator-facing physics is in [`doc/model.md`](doc/model.md); architecture is in
[`doc/implementation-notes.md`](doc/implementation-notes.md).

## The one thing to understand first

**All crystallography lives in Scenery-free modules under `src/common/model/`.** Those files import
nothing from `scenerystack/scenery` and hold no `Property` — they are pure functions over plain data,
which is why `tests/` can exercise the real physics without a DOM. Each screen's Property-holding
model (`src/cubic-systems/model/CubicSystemsModel.ts` and friends) is a thin reactive layer on top.

When adding physics, put it in the pure layer and derive it into a screen model. Putting a formula in
a view or a screen model is the mistake this codebase is arranged to prevent.

## Key files

| File | Purpose |
|---|---|
| `src/CrystalLatticeColors.ts` | All `ProfileColorProperty` instances (structure, layers, tilings, diffraction) |
| `src/CrystalLatticeConstants.ts` | Every named numeric constant — slider ranges, layout px, diffraction budget |
| `src/CrystalLatticeNamespace.ts` | Namespace for color property names |
| `src/i18n/StringManager.ts` | Singleton localized string accessor; per-screen getters |
| **Pure model** | **no Scenery imports, fully unit-tested** |
| `src/common/model/Projection3D.ts` | Orthographic yaw/pitch camera, depth sorting, and `unproject` for 3D drag handles |
| `src/common/model/Lattice2D.ts` | 2D lattice generation, Bravais classification, Wigner–Seitz |
| `src/common/model/CubicCell.ts` | Cubic cell contents, sharing fractions, APF, theoretical density |
| `src/common/model/ReferenceElements.ts` | Typed access to `elements.json` |
| `src/common/model/ClosePacking.ts` | Layer stacking, Jagodzinski symbols, c/a dependence |
| `src/common/model/MillerIndices.ts` | Exact rational intercept → index pipeline, families, planar density |
| `src/common/model/Affine2D.ts` | Flat 2D affine transforms for the tiling generators |
| `src/common/model/PenroseTiling.ts` | Robinson-triangle inflation, derived vertex atlas, hand-placement candidates |
| `src/common/model/EinsteinTiling.ts` | Hat metatile substitution (ported from hatviz), spectre outline |
| `src/common/model/DiffractionPattern.ts` | Direct-sum DFT, peak finding, symmetry measurement |
| **Shared view** | |
| `src/common/view/Projected3DNode.ts` | Base class for the pseudo-3D screens: camera, drag-to-orbit, `rebuild()` |
| `src/common/view/AtomNode.ts` | Shaded sphere + the sharing-fraction wedge |
| `src/common/view/ControlFactory.ts` | Themed sliders / check boxes / combo boxes / buttons |
| `src/common/view/DerivedQuantitiesPanel.ts` | The live label/value readout every screen carries |
| `src/common/CrystalLatticePanel.ts` | Pre-themed `Panel` wrapper |
| `src/common/CrystalLatticeScreenIcons.ts` | Home/navigation icons, drawn from each screen's own geometry |
| `src/common/CrystalLatticeButtonOptions.ts` | Flat button-appearance bundles + combo-box options |
| **Screens** | each has `model/`, `view/`, a `*Screen.ts`, a summary and a keyboard-help node |
| `src/lattices-2d/` | 2D Lattices |
| `src/cubic-systems/` | Cubic Systems |
| `src/close-packing/` | Close-Packing |
| `src/miller-indices/` | Miller Indices |
| `src/aperiodic-order/` | Aperiodic Order |

## Pitfalls

### `rebuild()` runs before subclass fields exist

`Projected3DNode` calls `rebuild()` from its own constructor, so every subclass guards the top with
`if (this.model === undefined) return;`. Removing that guard crashes on construction.

### Position projected nodes with `x`/`y`, never `centerX`/`centerY`

The projection already centres its content on the node's local origin. A bounds-based `centerX` is
computed once, at a moment when the content may be empty, and then drifts every time a rebuild
changes the extent.

### Miller indices are exact rationals, not floats

`Rational` exists so `(200)` never rounds into `(100)`. Do not "simplify" the pipeline to floats.

### The atomic radius slider is deliberately unclamped

`packingFactor` is computed from the *current* radius and will exceed 1. That is the point — a
student drags into the unphysical regime and the APF follows them there. `spheresOverlap` flags it.

### Diffraction: exclude the forward peak, trim to a disc

I(0) = N² swamps the Bragg peaks; `FORWARD_PEAK_EXCLUSION` keeps it out of the normalization and the
peak search. And a patch's *outline* imprints on its transform, so `circularSubset` runs first.
`measureSymmetryOrder`'s tolerance is tied to the k-grid step — loosening it lets a spurious 11-fold
match beat the genuine 10-fold one.

### Screen 4's intercept handles snap to unit fractions

The plane (hkl) nearest the origin cuts the a axis at exactly 1/h, so the only intercepts a drawable
plane can have are ±1/n up to `MAX_MILLER_INDEX`, plus "parallel". The handles have a stop at each,
and a free continuous track would let two innocuous drags produce (9 8 0). A consequence: **a drag can
only ever produce a reduced triple.** (200) is unreachable by dragging, because an intercept of 1/2
with the other axes parallel reduces to (100) — the common factor is not in the intercepts. That is
why (200) stays a preset button with a note beside it.

The handles live in a layer *outside* `Projected3DNode`'s rebuilt content. A handle created inside
`rebuild()` would be replaced on the first camera frame and the drag would die.

### Screen 5's placement candidates are labelled, not filtered

`candidatePlacements` offers both tile shapes on both sides of every open edge and drops only what
would physically overlap; `isPatchPlacementLegal` then marks each one legal or not. The illegal ones
are drawn. They fit flush and are refused anyway, which is the entire content of "matching rules" —
hiding them would leave a student thinking the shapes simply do not fit.

`isPatchPlacementLegal` reverses a vertex arc when the new corner lands at its clockwise end. That is
sound only because the vertex atlas is closed under reflection, which `tests/AperiodicTiling.test.ts`
pins directly. Getting stuck (no legal slot left) is a reachable, reported state, not a bug.

### The hat port is load-bearing and non-obvious

`EinsteinTiling.ts` carries specific vertex coordinates and a 29-entry rule table from Kaplan's
`hatviz` (BSD 3-Clause — see `CREDITS.md`). None of it can be re-derived by inspection. The tests
guard it with two invariants that break loudly: every hat in a patch has equal area, and the
unreflected:reflected ratio approaches φ⁴.

## Accessibility

Every screen ships all three layers: a `*ScreenSummaryContent` with a **live** `currentDetailsContent`
derived from model Properties, an `accessibleName` on every interactive node, and an explicit
`pdomOrder` with Reset All last. The `ControlFactory` helpers take `accessibleName` as a **required**
argument, so a missing one is a compile error rather than a silent gap. Draggable plain Nodes also
need `tagName: "div"` and `focusable: true`.

A11y strings live under the `a11y` key per screen in each locale JSON, reached through
`StringManager.get{Screen}A11yStrings()`. Full convention: [Baton/ACCESSIBILITY.md](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

- `src/common/model/` holds pure geometry modules rather than `*Model.ts` screen models. This is a
  deliberate split from the fleet's usual one-model-per-screen shape: the pure layer is what makes
  the physics testable without a DOM, and each screen still has its own Property-holding model.
- Four literal colours sit outside `CrystalLatticeColors.ts`, and Baton's compliance check warns
  about them by design. All four are *neutral overlays on top of an already-themed fill* rather than
  palette choices: the sharing wedge's `rgba(255,255,255,0.55)` and the fraction badge's
  `rgba(0,0,0,0.65)` / `#ffffff` in `CubicCellNode.ts` must read against whatever colour the atom
  underneath happens to be, in either profile, and `AtomNode.ts`'s `#ffffff` is the fallback when a
  caller hands it something that is not a colour at all. Putting them in the profile would invite a
  projector-mode value that makes the wedge invisible on a light sphere.
- `scripts/rename-sim.ts` and `scripts/scaffold-screens.ts` are inherited from the template and no
  longer apply to this repo. They stay in the tree so template updates merge cleanly.

## Testing

| Path | Purpose |
|---|---|
| `tests/Projection3D.test.ts` | Camera projection and depth ordering |
| `tests/Lattice2D.test.ts` | Bravais classification, coordination, Wigner–Seitz areas |
| `tests/CubicCell.test.ts` | Atom sharing, APF, theoretical density against textbook values |
| `tests/ClosePacking.test.ts` | Stacking classification, HCP/FCC packing equality, c/a dependence |
| `tests/MillerIndices.test.ts` | The four-stage pipeline, the (200) trap, planar density |
| `tests/AperiodicTiling.test.ts` | Penrose ratios → φ, hat congruence and φ⁴ reflection ratio, hand-placement legality |
| `tests/DiffractionPattern.test.ts` | 4-fold square, 6-fold hexagonal, 10-fold Penrose |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` regression across all five screen models |
| `tests/fuzz/fuzz.spec.ts` | Optional Playwright fuzz smoke via joist `?fuzz` |

Put unit tests only under root `tests/`, mirroring `src/` — never co-located, never `__tests__/`.
Run `npm test`; CI runs the suite on every push.

**When touching the pure model layer, add the assertion that would have caught the bug.** These
modules produce numbers a reader cannot check by eye, so a wrong packing factor or a broken
substitution rule is a silent pedagogical failure rather than a crash.

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run build:single` | Single-file build mode |
| `npm run check` | TypeScript (`tsc --noEmit` + scripts and test projects) |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:fuzz` | Playwright fuzz smoke |
| `npm run icons` | Regenerate PWA icons from `public/icons/icon.svg` |

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).
