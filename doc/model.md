# Model — Crystal Lattice

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

Crystal Lattice is a five-screen tour of crystal structure, arranged as an argument rather than a
list of topics.

Screens 1–4 build up the standard picture: a crystal is one small motif repeated by translation, and
everything else — how many atoms are in a cell, how densely they pack, how we name the planes through
them — follows from that repetition. Screen 5 then withdraws the assumption and asks whether *order*
requires *periodicity* at all. It does not, and the diffraction pattern on that screen is how we know.

The arc, screen by screen:

1. **2D Lattices** — symmetry and repetition, in the plane, where they can be seen whole.
2. **Cubic Systems** — why the choice of 3D packing matters, and how to count a shared atom.
3. **Close-Packing** — why nature prefers certain packings, and why two structures that look nothing
   alike can pack identically well.
4. **Miller Indices** — how crystallographers communicate about planes and directions.
5. **Aperiodic Order** — what survives when translational periodicity is abandoned.

## Quantities and units

Lattice constants are conventionally quoted in nanometres rather than metres, so the simulation works
in nm throughout. Ranges below are the ones the controls enforce (see `src/CrystalLatticeConstants.ts`).

| Quantity | Symbol | Units | Range |
|---|---|---|---|
| 2D primitive vector lengths | \|a₁\|, \|a₂\| | nm | 0.15 – 0.50 |
| 2D interior angle | γ | ° | 30 – 150 |
| Cubic cell edge | a | nm | 0.20 – 0.60 |
| Atomic radius | r | nm | 0.02 – 0.30 (free; not clamped to touching) |
| Close-packed layers | — | — | 2 – 6 |
| Axial ratio | c/a | — | 1.40 – 2.00 (ideal √(8/3) ≈ 1.633) |
| Miller indices | h, k, l / u, v, w | — | integers, \|index\| ≤ 4 |
| Penrose inflation steps | — | — | 1 – 6 |
| Hat substitution steps | — | — | 0 – 2 |

Derived quantities carry the units they are quoted in: areas in nm², areal and planar densities in
atoms/nm², densities in g/cm³.

## Governing equations

### Screen 1 — 2D lattices

A 2D lattice is the point set **R** = n₁**a₁** + n₂**a₂** for integers n₁, n₂. The primitive cell's
area is A = \|**a₁** × **a₂**\| = a₁·a₂·sin γ, and the areal density is ρ = (atoms per cell)/A.

Classification into the five 2D Bravais lattices is derived from (a₁, a₂, γ) with tolerance bands,
not chosen from a menu — a square lattice is something the student drags into. A rhombic primitive
cell (a₁ = a₂, γ ∉ {90°, 120°}) *is* the centred rectangular lattice, and is reported as such.

The Wigner–Seitz cell is built the way it is taught: clip the plane by the perpendicular bisector of
the segment to each neighbouring lattice point, keeping the origin's side.

### Screen 2 — cubic systems

Each conventional cubic cell holds atoms whose ownership is shared with neighbouring cells. An atom
with k of its three fractional coordinates on a cell face is shared 2ᵏ ways:

| Site | Shared fraction | SC | BCC | FCC |
|---|---|---|---|---|
| corner | 1/8 | 8 | 8 | 8 |
| face | 1/2 | — | — | 6 |
| body | 1 | — | 1 | — |
| **atoms per cell** | | **1** | **2** | **4** |

Spheres touch along the close-packed direction, which differs per structure, and the atomic packing
factor follows:

| Structure | Coordination number | Touching condition | APF |
|---|---|---|---|
| Simple cubic | 6 | a = 2r (along ⟨100⟩) | π/6 ≈ 0.524 |
| BCC | 8 | a = 4r/√3 (along ⟨111⟩) | √3π/8 ≈ 0.680 |
| FCC | 12 | a = 2√2·r (along ⟨110⟩) | √2π/6 ≈ 0.740 |

APF = n·(4/3)πr³/a³ is computed from the *current* radius, not the touching one, so a student who
drags the radius past touching watches the number climb through 1 into impossibility. Theoretical
density is ρ = n·M/(N_A·a³).

### Screen 3 — close-packing

A close-packed layer is the 2D hexagonal lattice with a = 2r. The next layer drops into one of two
sets of hollows, B = (a/2, a√3/6) or C = 2B, and the three offsets cycle A → B → C → A. Stacking ABAB…
gives HCP; ABCABC… gives FCC. **The only difference is where the third layer goes**, and both reach
the three-dimensional maximum packing fraction π/(3√2) ≈ 0.7405.

An arbitrary sequence is classified by the Jagodzinski construction: a layer is *cubic* (c) when the
step into it equals the step out of it, and *hexagonal* (h) otherwise. All-c is FCC, all-h is HCP,
anything mixed is a stacking fault, and two adjacent layers in the same position are not close-packed
at all.

Away from the ideal axial ratio c/a = √(8/3), packing degrades:

  APF(c/a) = 2·(4/3)πr³ / ((√3/2)·a²·c),  with r = ½·min(a, √(a²/3 + c²/4))

Above the ideal ratio the in-plane contacts bind and r = a/2; below it, the interlayer contacts bind
first. Real HCP metals all miss the ideal value — Ti 1.587, Mg 1.624, Zn 1.856 — which is why the
screen shows them.

### Screen 4 — Miller indices

For a plane, in this order:

1. read the intercepts on the a, b, c axes in units of the lattice constant (∞ if parallel to an axis);
2. take reciprocals (1/∞ = 0 — this is what makes "parallel" mean "index 0");
3. clear the fractions by multiplying through by the LCM of the denominators;
4. divide by the GCD.

The order matters and is the step students most reliably invert, so the screen shows all four stages
rather than only the answer. For directions the same clearing step applies with **no** reciprocal —
which is exactly why (200) ≠ (100) even though the two planes look parallel: for planes the common
factor encodes a real halving of the spacing.

Interplanar spacing, for cubic systems only: d_hkl = a/√(h² + k² + l²). In a cubic crystal the normal
to (hkl) is the direction [hkl] with the same numbers, which is what lets the screen overlay one on
the other. Equivalent families {hkl} and ⟨uvw⟩ are all permutations of the indices with all sign
combinations — six members for {100}, eight for {111}, twelve for ⟨110⟩.

Planar density is the reciprocal of the 2D primitive-cell area of the atoms lying in the plane: on
FCC, 2/a² for (100), √2/a² for (110), and 4/(√3·a²) for (111), the densest cubic plane.

### Screen 5 — aperiodic order

Penrose tilings are generated by inflation rather than by placing tiles against matching rules: each
Robinson triangle is subdivided into smaller copies of the same two shapes, scaled by the golden ratio
φ = (1+√5)/2. The substitution matrix is [[1,1],[1,2]], whose eigenvector ratio is φ, so the thick:thin
rhombus ratio converges to 1.618… as the tiling grows.

The hat monotile has no local matching rules — whether a placement extends to a tiling of the plane is
not a local question. What the 2023 discovery established instead is that hats assemble into four
metatiles (H, T, P, F) which themselves obey a substitution, and a correct patch of any size follows
from substituting metatiles and reading off the hats at the leaves. The hat needs reflected copies to
tile; the *spectre*, found months later, is the equilateral member of the same family and tiles using
rotations of a single chirality.

The diffraction pattern is the direct sum

  I(**k**) = |Σⱼ exp(i **k**·**r**ⱼ)|²

over the tiling's vertices, evaluated on a k-space grid. A periodic lattice gives sharp peaks on a
periodic reciprocal lattice. A Penrose tiling gives peaks that are *also* sharp — the signature of
long-range order — but arranged with **ten-fold** symmetry, which the crystallographic restriction
theorem forbids for any periodic 2D lattice (only 1-, 2-, 3-, 4- and 6-fold axes are compatible with
translational periodicity). That combination is what Shechtman measured in rapidly cooled Al–Mn in
1982 and what the 2011 Nobel Prize in Chemistry was awarded for.

## Simplifications and assumptions

- **Hard spheres throughout.** Atoms are incompressible spheres of a single radius. Real bonding is
  neither spherical nor incompressible, and the packing factors are upper bounds under that model.
- **Cubic symmetry only for Miller indices.** d_hkl = a/√(h²+k²+l²) and the identity [hkl] ⊥ (hkl)
  hold only for cubic crystals; the general case needs the full metric tensor. Hexagonal
  Miller–Bravais (hkil) indices are deliberately out of scope.
- **Static structures.** Nothing in the simulation is time-dependent: no thermal motion, no defects
  beyond the stacking faults on Screen 3, no relaxation of atoms near a surface.
- **The 2D screen's centred rectangular lattice** is presented both as a rectangular cell with a
  centring basis atom and as a rhombic primitive cell; these are the same lattice, and the screen
  says so rather than picking one.
- **A finite patch is not an infinite tiling.** Diffraction from a few hundred scatterers has broader
  peaks and more background than the ideal transform. The patch is trimmed to a disc first so its
  outline does not imprint itself on the pattern, and the point count is capped so the transform
  stays interactive.
- **Screen 5's Penrose vertex atlas** is derived from inflated tilings rather than asserted, so it
  covers the configurations reachable by that construction. It is a correct necessary condition for a
  legal placement.

## References

See [CREDITS.md](../CREDITS.md) for the full source list, including the aperiodic-monotile papers,
Shechtman's 1984 measurement, and the crystallographic tables behind
`src/common/model/elements.json`.
