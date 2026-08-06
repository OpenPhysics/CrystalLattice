/**
 * Lattice2D.ts
 *
 * Pure geometry for the 2D Lattices screen: generating lattice points from a
 * pair of primitive vectors, classifying the result against the five 2D Bravais
 * lattices, counting the first coordination shell, and constructing the
 * Wigner–Seitz cell.
 *
 * A 2D lattice is the set of points
 *
 *     R = n₁·a₁ + n₂·a₂,     n₁, n₂ ∈ ℤ
 *
 * with a₁ laid along +x and a₂ at the interior angle γ:
 *
 *     a₁ = (a₁, 0)
 *     a₂ = (a₂·cos γ, a₂·sin γ)
 *
 * No Scenery imports — everything here is unit-testable without a DOM.
 */

import { Vector2 } from "scenerystack/dot";

/** The five 2D Bravais lattices. */
export const Lattice2DType = {
  SQUARE: "square",
  RECTANGULAR: "rectangular",
  CENTERED_RECTANGULAR: "centeredRectangular",
  HEXAGONAL: "hexagonal",
  OBLIQUE: "oblique",
} as const;

export type Lattice2DType = (typeof Lattice2DType)[keyof typeof Lattice2DType];

/**
 * Tolerance bands for classification. They are deliberately generous: the
 * screen is designed so a student *finds* the square lattice by dragging into
 * it, which only feels like a discovery if the target has some width.
 */
export const LENGTH_TOLERANCE_FRACTION = 0.02;
export const ANGLE_TOLERANCE_RADIANS = (1.5 * Math.PI) / 180;

/** Primitive-vector description of a 2D lattice. */
export type Lattice2DParameters = {
  /** |a₁| in model units (nm on the 2D Lattices screen). */
  readonly a1: number;
  /** |a₂| in model units. */
  readonly a2: number;
  /** Interior angle γ between a₁ and a₂, in radians. */
  readonly gamma: number;
  /**
   * Whether the motif places a second basis atom at the cell centre. A centred
   * basis on an otherwise rectangular cell is what makes the lattice *centred*
   * rectangular rather than plain rectangular.
   */
  readonly centered?: boolean;
};

/** The first primitive vector, always along +x. */
export function primitiveVector1(parameters: Lattice2DParameters): Vector2 {
  return new Vector2(parameters.a1, 0);
}

/** The second primitive vector, at angle γ from a₁. */
export function primitiveVector2(parameters: Lattice2DParameters): Vector2 {
  return new Vector2(parameters.a2 * Math.cos(parameters.gamma), parameters.a2 * Math.sin(parameters.gamma));
}

/**
 * Generates every lattice point with |n₁| ≤ range and |n₂| ≤ range.
 * Returned in row-major (n₂ outer, n₁ inner) order so callers get a
 * deterministic sequence for tests and for stable Scenery child ordering.
 */
export function generateLatticePoints(parameters: Lattice2DParameters, range: number): Vector2[] {
  const v1 = primitiveVector1(parameters);
  const v2 = primitiveVector2(parameters);
  const points: Vector2[] = [];

  for (let n2 = -range; n2 <= range; n2++) {
    for (let n1 = -range; n1 <= range; n1++) {
      points.push(new Vector2(n1 * v1.x + n2 * v2.x, n1 * v1.y + n2 * v2.y));
    }
  }
  return points;
}

/**
 * Generates the centring points (one per cell, at the cell centre) for a
 * centred basis. These are *basis* positions rather than lattice points of the
 * primitive description, which is exactly the motif-vs-lattice distinction the
 * screen is trying to teach.
 */
export function generateCenteringPoints(parameters: Lattice2DParameters, range: number): Vector2[] {
  const v1 = primitiveVector1(parameters);
  const v2 = primitiveVector2(parameters);
  const offset = new Vector2((v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
  const points: Vector2[] = [];

  for (let n2 = -range; n2 <= range; n2++) {
    for (let n1 = -range; n1 <= range; n1++) {
      points.push(new Vector2(n1 * v1.x + n2 * v2.x + offset.x, n1 * v1.y + n2 * v2.y + offset.y));
    }
  }
  return points;
}

/** The four corners of the primitive unit cell, anchored at the origin. */
export function primitiveCellCorners(parameters: Lattice2DParameters): Vector2[] {
  const v1 = primitiveVector1(parameters);
  const v2 = primitiveVector2(parameters);
  return [Vector2.ZERO.copy(), v1, v1.plus(v2), v2];
}

/**
 * Area of the primitive cell, |a₁ × a₂| = a₁·a₂·sin γ.
 * Every areal density in the sim is per *this* area.
 */
export function cellArea(parameters: Lattice2DParameters): number {
  return Math.abs(parameters.a1 * parameters.a2 * Math.sin(parameters.gamma));
}

/**
 * Areal density in atoms per unit area: ρ = (atoms per cell) / A.
 *
 * @param parameters - the lattice
 * @param atomsPerCell - motif size (1 for a single-atom basis, 2 when centred)
 */
export function arealDensity(parameters: Lattice2DParameters, atomsPerCell: number): number {
  const area = cellArea(parameters);
  return area > 0 ? atomsPerCell / area : Number.POSITIVE_INFINITY;
}

/**
 * Packing fraction of non-overlapping discs of the largest radius the lattice
 * admits (touching discs, r = half the nearest-neighbour distance).
 * Reaches π/4 ≈ 0.785 for the square lattice and π/(2√3) ≈ 0.907 — the 2D
 * maximum — for the hexagonal lattice.
 */
export function arealPackingFraction(parameters: Lattice2DParameters): number {
  const shell = firstCoordinationShell(parameters);
  const area = cellArea(parameters);
  if (area <= 0 || !Number.isFinite(shell.distance)) {
    return 0;
  }
  const radius = shell.distance / 2;
  return (Math.PI * radius * radius) / area;
}

/** Nearest-neighbour distance and how many neighbours sit at it. */
export type CoordinationShell = {
  /** Distance to the first shell, in model units. */
  readonly distance: number;
  /** Number of lattice points in that shell — the 2D coordination number. */
  readonly count: number;
};

/**
 * Finds the first coordination shell by brute force over a small neighbourhood.
 * A ±2 window is comfortably enough: for any lattice reachable by the screen's
 * sliders the nearest neighbour is within one or two steps of the origin.
 */
export function firstCoordinationShell(parameters: Lattice2DParameters): CoordinationShell {
  const v1 = primitiveVector1(parameters);
  const v2 = primitiveVector2(parameters);

  let minimum = Number.POSITIVE_INFINITY;
  const distances: number[] = [];

  for (let n2 = -2; n2 <= 2; n2++) {
    for (let n1 = -2; n1 <= 2; n1++) {
      if (n1 === 0 && n2 === 0) {
        continue;
      }
      const distance = Math.hypot(n1 * v1.x + n2 * v2.x, n1 * v1.y + n2 * v2.y);
      distances.push(distance);
      minimum = Math.min(minimum, distance);
    }
  }

  // Count everything within the same tolerance band used for classification, so
  // a lattice the readout calls "square" also reports 4 nearest neighbours.
  const tolerance = minimum * LENGTH_TOLERANCE_FRACTION;
  return {
    distance: minimum,
    count: distances.filter((distance) => Math.abs(distance - minimum) <= tolerance).length,
  };
}

/**
 * Classifies the lattice into one of the five 2D Bravais types.
 *
 * The order of the tests matters — the more symmetric types are strictly
 * special cases of the less symmetric ones, so square and hexagonal must be
 * checked before rectangular, and rectangular before oblique.
 *
 * A rhombic cell (a₁ = a₂ with γ neither 90° nor 120°) *is* the centred
 * rectangular lattice viewed through its primitive vectors, so it is reported
 * as such — that equivalence is one of the things the screen exists to show.
 */
export function classifyLattice(parameters: Lattice2DParameters): Lattice2DType {
  const { a1, a2, gamma, centered = false } = parameters;

  const equalLengths = Math.abs(a1 - a2) <= LENGTH_TOLERANCE_FRACTION * Math.max(a1, a2);
  const isAngle = (degrees: number): boolean => Math.abs(gamma - (degrees * Math.PI) / 180) <= ANGLE_TOLERANCE_RADIANS;
  const rightAngle = isAngle(90);
  const hexAngle = isAngle(120) || isAngle(60);

  if (equalLengths && rightAngle) {
    // A centred square is still a square lattice with a smaller primitive cell.
    return Lattice2DType.SQUARE;
  }
  if (equalLengths && hexAngle) {
    return Lattice2DType.HEXAGONAL;
  }
  if (rightAngle) {
    return centered ? Lattice2DType.CENTERED_RECTANGULAR : Lattice2DType.RECTANGULAR;
  }
  if (equalLengths) {
    // Rhombic primitive cell — the centred rectangular lattice in disguise.
    return Lattice2DType.CENTERED_RECTANGULAR;
  }
  return Lattice2DType.OBLIQUE;
}

/** Canonical (a₁, a₂, γ) for each Bravais type, used by the "snap to" control. */
export function snapParametersFor(type: Lattice2DType, referenceLength: number): Lattice2DParameters {
  const half = Math.PI / 2;
  switch (type) {
    case Lattice2DType.SQUARE:
      return { a1: referenceLength, a2: referenceLength, gamma: half, centered: false };
    case Lattice2DType.HEXAGONAL:
      return { a1: referenceLength, a2: referenceLength, gamma: (2 * Math.PI) / 3, centered: false };
    case Lattice2DType.RECTANGULAR:
      return { a1: referenceLength, a2: referenceLength * 1.5, gamma: half, centered: false };
    case Lattice2DType.CENTERED_RECTANGULAR:
      return { a1: referenceLength, a2: referenceLength * 1.5, gamma: half, centered: true };
    case Lattice2DType.OBLIQUE:
      return { a1: referenceLength, a2: referenceLength * 1.4, gamma: (75 * Math.PI) / 180, centered: false };
    default:
      return { a1: referenceLength, a2: referenceLength, gamma: half, centered: false };
  }
}

/**
 * Builds the Wigner–Seitz cell: the set of points closer to the origin than to
 * any other lattice point. Constructed the way it is taught — start with a
 * generous bounding polygon and clip it against the perpendicular bisector of
 * the segment to each neighbour, keeping the origin's side.
 *
 * @param parameters - the lattice
 * @param neighborRange - how many shells of neighbours to bisect against; 2 is
 *   ample, since a farther point's bisector can never cut inside the cell.
 * @returns the cell's vertices in counter-clockwise order
 */
export function wignerSeitzCell(parameters: Lattice2DParameters, neighborRange = 2): Vector2[] {
  const v1 = primitiveVector1(parameters);
  const v2 = primitiveVector2(parameters);

  // Start with a square guaranteed to contain the cell: no Wigner–Seitz cell
  // can extend past half the longest primitive vector in any direction.
  const extent = 2 * Math.max(v1.magnitude, v2.magnitude, parameters.a1, parameters.a2);
  let polygon: Vector2[] = [
    new Vector2(-extent, -extent),
    new Vector2(extent, -extent),
    new Vector2(extent, extent),
    new Vector2(-extent, extent),
  ];

  for (let n2 = -neighborRange; n2 <= neighborRange; n2++) {
    for (let n1 = -neighborRange; n1 <= neighborRange; n1++) {
      if (n1 === 0 && n2 === 0) {
        continue;
      }
      const neighbor = new Vector2(n1 * v1.x + n2 * v2.x, n1 * v1.y + n2 * v2.y);
      if (neighbor.magnitude === 0) {
        continue;
      }
      polygon = clipToBisectorHalfPlane(polygon, neighbor);
      if (polygon.length === 0) {
        return [];
      }
    }
  }
  // Clipping against a bisector that passes exactly through an existing corner
  // emits that corner twice; collapse those before handing the polygon to the view.
  return removeDuplicateVertices(polygon, 1e-9 * extent);
}

/** Drops vertices that coincide with their predecessor (cyclically). */
function removeDuplicateVertices(polygon: readonly Vector2[], tolerance: number): Vector2[] {
  const result: Vector2[] = [];
  for (const vertex of polygon) {
    const previous = result[result.length - 1];
    if (previous === undefined || previous.distance(vertex) > tolerance) {
      result.push(vertex);
    }
  }
  const first = result[0];
  const last = result[result.length - 1];
  if (result.length > 1 && first !== undefined && last !== undefined && first.distance(last) <= tolerance) {
    result.pop();
  }
  return result;
}

/**
 * The perpendicular bisectors that actually bound the Wigner–Seitz cell, as
 * (neighbour, midpoint) pairs. The screen animates these one at a time, so it
 * needs to know which neighbours contribute an edge and which are cut off by
 * closer ones.
 */
export type BisectorConstruction = {
  /** The neighbouring lattice point whose bisector bounds the cell. */
  readonly neighbor: Vector2;
  /** Midpoint of the segment from the origin to that neighbour. */
  readonly midpoint: Vector2;
};

/**
 * Returns the contributing bisectors, nearest neighbour first, so the
 * construction animation reveals the cell in the order a person would draw it.
 */
export function wignerSeitzBisectors(parameters: Lattice2DParameters, neighborRange = 2): BisectorConstruction[] {
  const cell = wignerSeitzCell(parameters, neighborRange);
  if (cell.length === 0) {
    return [];
  }

  const v1 = primitiveVector1(parameters);
  const v2 = primitiveVector2(parameters);
  const contributing: BisectorConstruction[] = [];

  for (let n2 = -neighborRange; n2 <= neighborRange; n2++) {
    for (let n1 = -neighborRange; n1 <= neighborRange; n1++) {
      if (n1 === 0 && n2 === 0) {
        continue;
      }
      const neighbor = new Vector2(n1 * v1.x + n2 * v2.x, n1 * v1.y + n2 * v2.y);
      if (neighbor.magnitude === 0) {
        continue;
      }
      // The bisector bounds the cell only if some cell vertex lies on it.
      const halfSquared = neighbor.magnitudeSquared / 2;
      const touches = cell.some((vertex) => Math.abs(vertex.dot(neighbor) - halfSquared) <= 1e-6 * halfSquared);
      if (touches) {
        contributing.push({ neighbor, midpoint: neighbor.timesScalar(0.5) });
      }
    }
  }

  return contributing.sort((a, b) => a.neighbor.magnitude - b.neighbor.magnitude);
}

/**
 * Sutherland–Hodgman clip of a convex polygon against the half-plane
 * `p · neighbor ≤ |neighbor|²/2` — i.e. "at least as close to the origin as to
 * `neighbor`".
 */
function clipToBisectorHalfPlane(polygon: readonly Vector2[], neighbor: Vector2): Vector2[] {
  const limit = neighbor.magnitudeSquared / 2;
  const inside = (point: Vector2): boolean => point.dot(neighbor) <= limit;
  const result: Vector2[] = [];

  for (let i = 0; i < polygon.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: index is bounded by the loop
    const current = polygon[i]!;
    // biome-ignore lint/style/noNonNullAssertion: modular index stays in range
    const next = polygon[(i + 1) % polygon.length]!;
    const currentInside = inside(current);
    const nextInside = inside(next);

    if (currentInside) {
      result.push(current);
    }
    if (currentInside !== nextInside) {
      const currentValue = current.dot(neighbor);
      const nextValue = next.dot(neighbor);
      const t = (limit - currentValue) / (nextValue - currentValue);
      result.push(current.plus(next.minus(current).timesScalar(t)));
    }
  }
  return result;
}
