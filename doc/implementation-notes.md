# Implementation Notes — Crystal Lattice

Developer-facing notes on this sim's architecture. The educator-facing companion is
[model.md](./model.md).

## Architecture overview

The sim's organising decision is that **all the physics and geometry lives in Scenery-free modules
under `src/common/model/`**, and every screen is a thin layer of reactive Properties on top of them.
Those modules are pure functions over plain data — no DOM, no `Node`, no `Property` — which is why the
test suite can exercise the real crystallography without a browser.

```
main.ts
  ├─ Lattices2DScreen        2D Bravais lattices, Wigner–Seitz, coordination
  ├─ CubicSystemsScreen      SC / BCC / FCC, atom sharing, APF, density
  ├─ ClosePackingScreen      ABAB vs ABCABC, c/a, stacking faults
  ├─ MillerIndicesScreen     (hkl) and [uvw], the four-stage derivation
  └─ AperiodicOrderScreen    Penrose, the hat, and their diffraction

src/common/model/            pure — no Scenery imports, fully unit-tested
  ├─ Projection3D.ts         orthographic yaw/pitch camera + depth sorting
  ├─ Lattice2D.ts            2D lattice generation, Bravais classification, Wigner–Seitz
  ├─ CubicCell.ts            cubic cell contents, sharing fractions, APF, density
  ├─ ReferenceElements.ts    typed access to elements.json
  ├─ ClosePacking.ts         layer stacking, Jagodzinski symbols, c/a dependence
  ├─ MillerIndices.ts        exact rational intercept → index pipeline, families, planar density
  ├─ Affine2D.ts             flat 2D affine transforms for the tiling generators
  ├─ PenroseTiling.ts        Robinson-triangle inflation + derived vertex atlas
  ├─ EinsteinTiling.ts       hat metatile substitution (ported), spectre outline
  └─ DiffractionPattern.ts   direct-sum DFT, peak finding, symmetry measurement

src/common/view/             shared Scenery components
  ├─ AtomNode.ts             shaded sphere + the sharing-fraction wedge
  ├─ Projected3DNode.ts      base class: owns a camera, drag-to-orbit, rebuild hook
  ├─ ControlFactory.ts       themed sliders / check boxes / combo boxes / buttons
  └─ DerivedQuantitiesPanel.ts  the live label/value readout every screen carries
```

Data flows model → view through AXON Properties. The view never computes crystallography; the model
never imports Scenery.

## Pseudo-3D in a 2D scene graph

SceneryStack has no 3D renderer, so Screens 2, 3 and 4 project a `Vector3` model through
`Projection3D` — an immutable orthographic camera holding a yaw, a pitch and a model→view scale.

Two consequences shape the view code:

- **Occlusion comes from child order**, and child order depends on the camera. `Projected3DNode`
  therefore *rebuilds* its children on every camera change rather than repositioning them. Cell
  contents top out at a few hundred spheres, comfortably inside the budget for that.
- **Sorting whole spheres back-to-front is exact** for non-intersecting spheres of equal size, which
  is the hard-sphere case these screens model. Once the radius slider is driven past touching the
  spheres interpenetrate and the sort is no longer exact — but that state is already flagged as
  unphysical, so a slightly wrong occlusion there is the least of its problems.

`CubicCellNode` splits the cube's twelve wireframe edges into two passes, behind and in front of the
atoms, at the cube's centre depth. Without that, the cell reads as a box drawn *over* the spheres
rather than one containing them.

Subclasses guard the top of `rebuild()` with `if (this.model === undefined) return;` — the base class
calls it once from its own constructor, before subclass fields are assigned.

## Exact arithmetic for Miller indices

`MillerIndices.ts` works in a small `Rational` type rather than floats. The intercepts → reciprocals →
clear → reduce pipeline is arithmetic on exact fractions, so `(200)` stays `(200)` and never drifts
into `(100)` through rounding. A dragged handle becomes a rational via a bounded-denominator search
(`Rational.fromNumber`), which is also what gives the intercept handles their snap feel.

The four stages are all exposed on `PlaneDerivation`, because the screen shows the work rather than
just the answer.

## Aperiodic tilings

**Penrose** uses the Robinson-triangle substitution: each triangle is subdivided into smaller copies
of the same two shapes, scaled by φ. Whole rhombi are recovered by pairing triangles that share a
base edge, and the pairing is what makes the tile counts meaningful — the thick:thin ratio converging
to φ is a direct consequence of the substitution matrix.

The **matching rules** for hand placement are *derived*, not hard-coded. Undecorated Penrose rhombi
tile periodically, so "do the shapes fit?" is not the rule worth enforcing; the vertex atlas is. That
atlas is read off inflated tilings — every complete vertex of a large patch contributes its cyclic
sequence of corner angles, and the observed set *is* the atlas. It is computed lazily and cached, and
`tests/AperiodicTiling.test.ts` checks that every star sums to a full turn.

**Hand placement** builds on that atlas. `candidatePlacements` walks the patch boundary and offers
both tile shapes on both sides of every open edge, dropping only the ones that would physically
overlap; `isPatchPlacementLegal` then labels each survivor. Candidates are *labelled* rather than
filtered, because the illegal ones are the lesson: they fit flush and are refused anyway, which is
the whole content of "matching rules". Getting stuck is a reachable state and is reported as such —
it is why nobody grows large Penrose tilings this way, and the `Inflate` button next door is the
answer to it.

Ordering the corners around a vertex is the fiddly part. `isVertexStarLegal` reads a partial vertex
as a contiguous arc of some legal star, so the corners have to be handed to it in true angular order
starting after the empty wedge. `vertexArcs` does that from the wedge geometry — each corner spans its
own angle from its own bearing — and `isPatchPlacementLegal` reverses an arc when the new corner lands
at its clockwise end. That reversal is sound only because the atlas is closed under reflection, which
the tests pin directly.

The strongest correctness check available is that a tiling the inflation guarantees is correct must
accept each of its own interior tiles back into the rest of itself; the tests run it over every
interior tile of a four-step patch.

**The hat** has no local matching rules at all. `EinsteinTiling.ts` is a TypeScript port of Craig
Kaplan's `hatviz`: the hat outline on the kite grid, the H/T/P/F metatile geometry, the 29-rule patch
assembly, and the supertile extraction that cuts the next level's metatiles out of that patch. See
[CREDITS.md](../CREDITS.md) for the BSD 3-Clause notice.

Two invariants make a broken port loud rather than silent, and both are asserted in the tests: every
hat in a patch has the same area (they are congruent copies of one 13-gon), and the
unreflected:reflected ratio approaches φ⁴, a number that falls out of the metatile system and nowhere
else.

## Diffraction

`computeDiffraction` evaluates I(**k**) = |Σⱼ exp(i**k**·**r**ⱼ)|² directly on a k-space grid. This is
not a slow substitute for an FFT — an FFT assumes uniformly sampled input, which a Penrose vertex set
by construction is not, so the direct sum is the correct tool.

Three details matter for the pattern to read correctly:

- **The forward peak is excluded** from both the normalization and the peak search. Every scatterer is
  in phase at **k** = 0, so I(0) = N² swamps everything else; normalizing against it would make the
  pattern look empty. Real diffraction experiments use a beam stop for the same reason.
- **The patch is trimmed to a disc** before transforming. A finite patch's *outline* shows up in its
  transform, and an untrimmed decagonal patch would imprint its own shape on the pattern.
- **The display is gamma-compressed** (`DISPLAY_GAMMA` in `DiffractionNode`). Bragg peaks are orders of
  magnitude brighter than the background; displayed linearly, only a handful are visible.

`measureSymmetryOrder` reports the largest n whose 2π/n rotation maps the peak set onto itself. Its
tolerance is tied to the k-grid step — peaks sit on grid nodes, so about one and a half steps is the
right allowance. Loosening it further lets a spurious 11-fold match slip past the genuine 10-fold one.

Cost is O(points × resolution²). At the screen's 96 × 96 grid, a few hundred scatterers is tens of
milliseconds; the inflation controls are capped (`MAX_INFLATION_STEPS`, `MAX_HAT_STEPS`) so the
transform stays interactive, and the Inflate button disables at the cap rather than letting the frame
rate quietly collapse.

## Accessibility

Every screen ships the three required layers:

- a `*ScreenSummaryContent` with a **live** `currentDetailsContent` derived from model Properties, so
  re-reading the summary reports the current state — including the answers the screen exists to
  produce (the Bravais type, the packing fraction, the measured symmetry order);
- an `accessibleName` on every interactive node, sourced from the `a11y` string group. The
  `ControlFactory` helpers take it as a *required* argument, so the compiler catches an omission;
- an explicit `pdomOrder` on a wrapper Node, with Reset All last.

Draggable plain Nodes (the 2D vector handles, the rotatable cells) also carry `tagName: "div"` and
`focusable: true`, without which they are unreachable by keyboard.

## Deviations from the original spec

- The spec sketched a `js/` tree with `*Model.ts` files under `common/model/`. This uses the fleet's
  `src/` layout instead, and reserves `common/model/` for the *pure* modules while each screen's
  Property-holding model lives in its own folder (`src/cubic-systems/model/CubicSystemsModel.ts`).
  Keeping the two apart is what lets the pure layer stay DOM-free.
- Screen 3's custom-sequence entry offers a short list of instructive stacking faults rather than a
  free-text field: a six-character answer typed on a touch screen is a poor interaction, and the
  presets cover the cases worth seeing.
- The spec left the home-screen and navigation-bar icons unspecified. Each one is drawn from the
  geometry module its screen uses rather than hand-composed, so a wrong camera or a wrong plane shows
  up in the icon too (`CrystalLatticeScreenIcons.ts`).

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```
