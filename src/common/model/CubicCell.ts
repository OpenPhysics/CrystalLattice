/**
 * CubicCell.ts
 *
 * Pure geometry and arithmetic for the three cubic Bravais lattices used on the
 * Cubic Systems screen: simple cubic, body-centred cubic and face-centred cubic.
 *
 * Everything is expressed in the conventional cubic cell of edge `a`, with atom
 * positions given in *fractional* coordinates on [0, 1]³ so a caller can scale
 * by whatever `a` the sliders currently hold.
 *
 * ── Atom sharing ──────────────────────────────────────────────────────────────
 * The whole point of the screen is that the eight spheres drawn at the corners
 * are not eight atoms. Each atom is shared with the neighbouring cells that
 * touch it, and the fraction this cell owns is 1/2ᵏ where k is the number of
 * fractional coordinates sitting on a cell face (0 or 1):
 *
 *   corner (k = 3) → 1/8      edge   (k = 2) → 1/4
 *   face   (k = 1) → 1/2      body   (k = 0) → 1
 *
 * Summing those fractions gives the atoms-per-cell tally: 1 for SC, 2 for BCC,
 * 4 for FCC.
 *
 * No Scenery imports — unit-testable without a DOM.
 */

import { Vector3 } from "scenerystack/dot";

/** The three cubic structures the screen can build. */
export const CubicStructure = {
  SIMPLE_CUBIC: "simpleCubic",
  BODY_CENTERED: "bodyCentered",
  FACE_CENTERED: "faceCentered",
} as const;

export type CubicStructure = (typeof CubicStructure)[keyof typeof CubicStructure];

/** Where an atom sits in the conventional cell — drives its sharing fraction. */
export const SiteKind = {
  CORNER: "corner",
  EDGE: "edge",
  FACE: "face",
  BODY: "body",
} as const;

export type SiteKind = (typeof SiteKind)[keyof typeof SiteKind];

/** One atom of the conventional cell, in fractional coordinates. */
export type CellAtom = {
  /** Fractional position on [0, 1]³. Multiply by `a` for model units. */
  readonly fractionalPosition: Vector3;
  /** Which kind of site this is. */
  readonly kind: SiteKind;
  /** Fraction of this atom owned by this cell: 1/8, 1/4, 1/2 or 1. */
  readonly sharingFraction: number;
};

/** Avogadro's number, mol⁻¹ — used for the theoretical-density readout. */
export const AVOGADRO = 6.02214076e23;

/**
 * Classifies a fractional position and returns the fraction of the atom that
 * belongs to this cell. Boundary coordinates are those equal to 0 or 1.
 */
export function sharingFractionFor(fractionalPosition: Vector3): number {
  const onBoundary = (value: number): boolean => Math.abs(value) < 1e-9 || Math.abs(value - 1) < 1e-9;
  const boundaryCount =
    (onBoundary(fractionalPosition.x) ? 1 : 0) +
    (onBoundary(fractionalPosition.y) ? 1 : 0) +
    (onBoundary(fractionalPosition.z) ? 1 : 0);
  return 1 / 2 ** boundaryCount;
}

/** Names the site kind implied by how many coordinates are on a cell face. */
export function siteKindFor(fractionalPosition: Vector3): SiteKind {
  switch (sharingFractionFor(fractionalPosition)) {
    case 1 / 8:
      return SiteKind.CORNER;
    case 1 / 4:
      return SiteKind.EDGE;
    case 1 / 2:
      return SiteKind.FACE;
    default:
      return SiteKind.BODY;
  }
}

function atomAt(x: number, y: number, z: number): CellAtom {
  const fractionalPosition = new Vector3(x, y, z);
  return {
    fractionalPosition,
    kind: siteKindFor(fractionalPosition),
    sharingFraction: sharingFractionFor(fractionalPosition),
  };
}

/** The eight shared corner atoms common to all three cubic structures. */
const CORNERS: readonly CellAtom[] = [
  atomAt(0, 0, 0),
  atomAt(1, 0, 0),
  atomAt(0, 1, 0),
  atomAt(1, 1, 0),
  atomAt(0, 0, 1),
  atomAt(1, 0, 1),
  atomAt(0, 1, 1),
  atomAt(1, 1, 1),
];

/** The six face-centre atoms of the FCC cell. */
const FACE_CENTERS: readonly CellAtom[] = [
  atomAt(0.5, 0.5, 0),
  atomAt(0.5, 0.5, 1),
  atomAt(0.5, 0, 0.5),
  atomAt(0.5, 1, 0.5),
  atomAt(0, 0.5, 0.5),
  atomAt(1, 0.5, 0.5),
];

/** Simple cubic: corner atoms only. n = 8 × 1/8 = 1. */
export function generateSC(): CellAtom[] {
  return [...CORNERS];
}

/** Body-centred cubic: corners plus one wholly-owned atom at the centre. n = 2. */
export function generateBCC(): CellAtom[] {
  return [...CORNERS, atomAt(0.5, 0.5, 0.5)];
}

/** Face-centred cubic: corners plus six half-owned face atoms. n = 4. */
export function generateFCC(): CellAtom[] {
  return [...CORNERS, ...FACE_CENTERS];
}

/** The conventional-cell atoms for a structure. */
export function generateCellAtoms(structure: CubicStructure): CellAtom[] {
  switch (structure) {
    case CubicStructure.SIMPLE_CUBIC:
      return generateSC();
    case CubicStructure.BODY_CENTERED:
      return generateBCC();
    case CubicStructure.FACE_CENTERED:
      return generateFCC();
    default:
      return generateSC();
  }
}

/**
 * Atoms per conventional cell, computed the way a student is asked to compute
 * it: by summing sharing fractions rather than by looking the answer up.
 */
export function atomsPerCell(structure: CubicStructure): number {
  return generateCellAtoms(structure).reduce((sum, atom) => sum + atom.sharingFraction, 0);
}

/** Coordination number — how many nearest neighbours each atom has. */
export function coordinationNumber(structure: CubicStructure): number {
  switch (structure) {
    case CubicStructure.SIMPLE_CUBIC:
      return 6;
    case CubicStructure.BODY_CENTERED:
      return 8;
    case CubicStructure.FACE_CENTERED:
      return 12;
    default:
      return 0;
  }
}

/**
 * The atomic radius at which hard spheres just touch along the close-packed
 * direction, for a cell of edge `a`:
 *
 *   SC  — spheres touch along the cube edge  ⟨100⟩:  a = 2r      → r = a/2
 *   BCC — spheres touch along the body diagonal ⟨111⟩: a = 4r/√3 → r = a√3/4
 *   FCC — spheres touch along the face diagonal ⟨110⟩: a = 2√2·r → r = a√2/4
 */
export function touchingRadius(structure: CubicStructure, edgeLength: number): number {
  switch (structure) {
    case CubicStructure.SIMPLE_CUBIC:
      return edgeLength / 2;
    case CubicStructure.BODY_CENTERED:
      return (edgeLength * Math.sqrt(3)) / 4;
    case CubicStructure.FACE_CENTERED:
      return (edgeLength * Math.SQRT2) / 4;
    default:
      return edgeLength / 2;
  }
}

/** Inverse of {@link touchingRadius}: the edge length at which radius `r` touches. */
export function touchingEdgeLength(structure: CubicStructure, radius: number): number {
  switch (structure) {
    case CubicStructure.SIMPLE_CUBIC:
      return 2 * radius;
    case CubicStructure.BODY_CENTERED:
      return (4 * radius) / Math.sqrt(3);
    case CubicStructure.FACE_CENTERED:
      return 2 * Math.SQRT2 * radius;
    default:
      return 2 * radius;
  }
}

/**
 * Atomic packing factor, APF = n·(4/3)πr³ / a³.
 *
 * Deliberately *not* clamped to the touching-radius value: the screen lets the
 * radius slider run free past the touching point, and seeing APF climb through
 * 1.0 into physically impossible territory is the fastest way to understand why
 * the hard-sphere touching condition is a condition at all.
 */
export function packingFactor(structure: CubicStructure, edgeLength: number, radius: number): number {
  if (edgeLength <= 0) {
    return 0;
  }
  return (atomsPerCell(structure) * (4 / 3) * Math.PI * radius ** 3) / edgeLength ** 3;
}

/** The maximum (hard-sphere) APF for a structure: 0.524, 0.680, 0.740. */
export function maximumPackingFactor(structure: CubicStructure): number {
  return packingFactor(structure, 1, touchingRadius(structure, 1));
}

/** Whether spheres of this radius overlap — i.e. the model is no longer hard-sphere. */
export function spheresOverlap(structure: CubicStructure, edgeLength: number, radius: number): boolean {
  return radius > touchingRadius(structure, edgeLength) * (1 + 1e-9);
}

/**
 * Theoretical density ρ = n·M / (N_A·a³).
 *
 * @param structure - determines n
 * @param edgeLengthNm - lattice constant in nanometres (as tabulated)
 * @param molarMass - molar mass in g/mol
 * @returns density in g/cm³
 */
export function theoreticalDensity(structure: CubicStructure, edgeLengthNm: number, molarMass: number): number {
  if (edgeLengthNm <= 0) {
    return 0;
  }
  const edgeCm = edgeLengthNm * 1e-7; // 1 nm = 1e-7 cm
  return (atomsPerCell(structure) * molarMass) / (AVOGADRO * edgeCm ** 3);
}

/**
 * Expands the conventional cell into world positions in model units, keeping
 * every drawn sphere — including the ones only fractionally owned, since the
 * point of the picture is that they stick out of the cell.
 */
export function cellAtomPositions(structure: CubicStructure, edgeLength: number): Vector3[] {
  return generateCellAtoms(structure).map((atom) => atom.fractionalPosition.timesScalar(edgeLength));
}

/** The eight corners of the cubic cell in model units, for drawing its wireframe. */
export function cellCorners(edgeLength: number): Vector3[] {
  return CORNERS.map((atom) => atom.fractionalPosition.timesScalar(edgeLength));
}

/**
 * The twelve edges of the cubic cell as index pairs into {@link cellCorners}.
 * Two corners share an edge when they differ in exactly one coordinate.
 */
export function cellEdgeIndices(): Array<readonly [number, number]> {
  const edges: Array<readonly [number, number]> = [];
  for (let i = 0; i < CORNERS.length; i++) {
    for (let j = i + 1; j < CORNERS.length; j++) {
      // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loops
      const a = CORNERS[i]!.fractionalPosition;
      // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loops
      const b = CORNERS[j]!.fractionalPosition;
      const differences = (a.x === b.x ? 0 : 1) + (a.y === b.y ? 0 : 1) + (a.z === b.z ? 0 : 1);
      if (differences === 1) {
        edges.push([i, j]);
      }
    }
  }
  return edges;
}
