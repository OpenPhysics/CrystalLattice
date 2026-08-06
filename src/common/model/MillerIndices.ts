/**
 * MillerIndices.ts
 *
 * The plane/direction indexing arithmetic behind the Miller Indices screen,
 * kept exact by working in rationals rather than floats.
 *
 * ── Planes: intercepts → (hkl) ────────────────────────────────────────────────
 * The step students most often invert on an exam is the order of operations, so
 * the pipeline is exposed as explicit stages rather than a single number:
 *
 *   1. read the intercepts on the a, b, c axes, in units of the lattice
 *      constant (a plane parallel to an axis has an intercept of ∞)
 *   2. take reciprocals  (1/∞ = 0 — this is what makes "parallel" mean "index 0")
 *   3. clear the fractions by multiplying through by the LCM of denominators
 *   4. divide by the GCD to reach the smallest integer triple
 *
 * ── Directions: components → [uvw] ────────────────────────────────────────────
 * Same clearing step, but with *no* reciprocal — which is exactly why (200) and
 * [200] behave so differently, and why (200) ≠ (100) even though the planes look
 * parallel: for planes the common factor encodes a real halving of the spacing.
 *
 * No Scenery imports — unit-testable without a DOM.
 */

import { gcd, Vector2, Vector3 } from "scenerystack/dot";

/**
 * An exact rational, used for intercepts and direction components so the
 * clearing step is arithmetic rather than float-matching. `denominator` is
 * always positive and the fraction is always in lowest terms.
 */
export class Rational {
  public readonly numerator: number;
  public readonly denominator: number;

  public constructor(numerator: number, denominator = 1) {
    if (denominator === 0) {
      throw new Error("Rational denominator must be non-zero");
    }
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(Math.abs(numerator), Math.abs(denominator)) || 1;
    this.numerator = (sign * numerator) / divisor;
    this.denominator = (sign * denominator) / divisor;
  }

  /** Multiplicative inverse. Throws on zero, which has no reciprocal. */
  public reciprocal(): Rational {
    if (this.numerator === 0) {
      throw new Error("Cannot take the reciprocal of zero");
    }
    return new Rational(this.denominator, this.numerator);
  }

  public get value(): number {
    return this.numerator / this.denominator;
  }

  public isZero(): boolean {
    return this.numerator === 0;
  }

  public toString(): string {
    return this.denominator === 1 ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
  }

  /**
   * Best rational approximation of `value` with denominator at most
   * `maxDenominator` — how a dragged intercept handle becomes an exact
   * fraction. Uses a Stern–Brocot / continued-fraction search.
   */
  public static fromNumber(value: number, maxDenominator = 12): Rational {
    let bestNumerator = Math.round(value);
    let bestDenominator = 1;
    let bestError = Math.abs(value - bestNumerator);

    for (let denominator = 2; denominator <= maxDenominator; denominator++) {
      const numerator = Math.round(value * denominator);
      const error = Math.abs(value - numerator / denominator);
      if (error < bestError - 1e-12) {
        bestNumerator = numerator;
        bestDenominator = denominator;
        bestError = error;
      }
    }
    return new Rational(bestNumerator, bestDenominator);
  }
}

/**
 * An axis intercept: either an exact rational multiple of the lattice constant,
 * or `null` meaning the plane is parallel to that axis (intercept at infinity).
 */
export type Intercept = Rational | null;

/** The three axis intercepts defining a plane. */
export type Intercepts = readonly [Intercept, Intercept, Intercept];

/** An integer index triple — (hkl) for a plane, [uvw] for a direction. */
export type IndexTriple = readonly [number, number, number];

/** The intermediate stages of the intercepts → (hkl) derivation, for display. */
export type PlaneDerivation = {
  /** Stage 1: the intercepts, with null for "parallel to this axis". */
  readonly intercepts: Intercepts;
  /** Stage 2: reciprocals, with 0 where the intercept was infinite. */
  readonly reciprocals: readonly [Rational, Rational, Rational];
  /** The multiplier used to clear all three denominators at once. */
  readonly clearingMultiplier: number;
  /** Stage 3: reciprocals after clearing fractions, before reducing. */
  readonly cleared: IndexTriple;
  /** Stage 4: the reduced triple — the Miller indices themselves. */
  readonly indices: IndexTriple;
};

/** Least common multiple of two non-negative integers. */
function lcmOf(a: number, b: number): number {
  if (a === 0 || b === 0) {
    return Math.max(a, b);
  }
  return Math.abs(a * b) / gcd(Math.abs(a), Math.abs(b));
}

/** Greatest common divisor of a triple, ignoring zeros. Returns 1 for (0,0,0). */
function gcdOfTriple(triple: IndexTriple): number {
  const magnitudes = triple.map(Math.abs).filter((value) => value !== 0);
  if (magnitudes.length === 0) {
    return 1;
  }
  return magnitudes.reduce((accumulated, value) => gcd(accumulated, value));
}

/**
 * Runs the full intercepts → (hkl) derivation, keeping every intermediate
 * stage so the screen can show the work rather than just the answer.
 *
 * A plane parallel to an axis contributes a reciprocal of 0 and therefore an
 * index of 0 — the one step students most reliably get backwards.
 */
export function derivePlaneIndices(intercepts: Intercepts): PlaneDerivation {
  const reciprocals = intercepts.map((intercept) =>
    intercept === null || intercept.isZero() ? new Rational(0) : intercept.reciprocal(),
  ) as unknown as readonly [Rational, Rational, Rational];

  const clearingMultiplier = reciprocals.reduce((accumulated, r) => lcmOf(accumulated, r.denominator), 1);

  const cleared = reciprocals.map((r) => (r.numerator * clearingMultiplier) / r.denominator) as unknown as IndexTriple;

  const divisor = gcdOfTriple(cleared);
  const indices = cleared.map((value) => value / divisor) as unknown as IndexTriple;

  return { intercepts, reciprocals, clearingMultiplier, cleared, indices };
}

/**
 * The inverse map: the axis intercepts of the plane (hkl) that lies closest to
 * the origin without passing through it. An index of 0 gives a null intercept.
 */
export function interceptsFromIndices(indices: IndexTriple): Intercepts {
  return indices.map((index) => (index === 0 ? null : new Rational(1, index))) as unknown as Intercepts;
}

/**
 * Reduces a direction's components to the smallest integer triple [uvw],
 * clearing denominators first and then dividing out the common factor.
 * Unlike planes, no reciprocal is taken.
 */
export function deriveDirectionIndices(components: readonly [Rational, Rational, Rational]): {
  readonly clearingMultiplier: number;
  readonly cleared: IndexTriple;
  readonly indices: IndexTriple;
} {
  const clearingMultiplier = components.reduce((accumulated, c) => lcmOf(accumulated, c.denominator), 1);
  const cleared = components.map((c) => (c.numerator * clearingMultiplier) / c.denominator) as unknown as IndexTriple;
  const divisor = gcdOfTriple(cleared);
  const indices = cleared.map((value) => value / divisor) as unknown as IndexTriple;

  return { clearingMultiplier, cleared, indices };
}

/** Reduces a dragged direction vector to [uvw] via a rational approximation. */
export function directionIndicesFromVector(vector: Vector3, maxDenominator = 12): IndexTriple {
  const components = [
    Rational.fromNumber(vector.x, maxDenominator),
    Rational.fromNumber(vector.y, maxDenominator),
    Rational.fromNumber(vector.z, maxDenominator),
  ] as const;
  return deriveDirectionIndices(components).indices;
}

/**
 * Interplanar spacing for a cubic crystal, d = a / √(h² + k² + l²).
 * Cubic only — the general formula depends on the full metric tensor, which
 * this sim deliberately stays clear of.
 */
export function interplanarSpacing(indices: IndexTriple, latticeConstant: number): number {
  const [h, k, l] = indices;
  const magnitude = Math.sqrt(h * h + k * k + l * l);
  return magnitude === 0 ? Number.POSITIVE_INFINITY : latticeConstant / magnitude;
}

/**
 * The plane normal in a cubic crystal. Because the cubic metric is the
 * identity, the normal to (hkl) is simply [hkl] — the property that lets the
 * screen overlay a direction on its perpendicular plane.
 */
export function planeNormal(indices: IndexTriple): Vector3 {
  const [h, k, l] = indices;
  return new Vector3(h, k, l);
}

/**
 * The symmetry-equivalent family of a triple under cubic symmetry: every
 * permutation of the components with every combination of signs, de-duplicated
 * and sorted for a stable display order. {100} yields the 6 cube faces;
 * {111} yields 8; ⟨110⟩ yields 12.
 */
export function equivalentFamily(indices: IndexTriple): IndexTriple[] {
  const permutations: IndexTriple[] = [];
  const [x, y, z] = indices;
  const orderings: IndexTriple[] = [
    [x, y, z],
    [x, z, y],
    [y, x, z],
    [y, z, x],
    [z, x, y],
    [z, y, x],
  ];

  const seen = new Set<string>();
  for (const ordering of orderings) {
    for (const signX of [1, -1]) {
      for (const signY of [1, -1]) {
        for (const signZ of [1, -1]) {
          const candidate: IndexTriple = [
            signX * (ordering[0] ?? 0),
            signY * (ordering[1] ?? 0),
            signZ * (ordering[2] ?? 0),
          ];
          const key = candidate.join(",");
          if (!seen.has(key)) {
            seen.add(key);
            permutations.push(candidate);
          }
        }
      }
    }
  }

  return permutations.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
}

/** Combining overline (U+0305) — renders a negative index as the crystallographer's bar. */
const COMBINING_OVERLINE = "̅";

/** Formats one index with a bar over it when negative: −1 → "1̄". */
export function formatIndex(index: number): string {
  return index < 0 ? `${Math.abs(index)}${COMBINING_OVERLINE}` : `${index}`;
}

/** Formats a triple with the given brackets, e.g. "(1̄10)" or "[111]". */
export function formatTriple(indices: IndexTriple, open: string, close: string): string {
  return `${open}${indices.map(formatIndex).join("")}${close}`;
}

/** "(hkl)" — a specific plane. */
export function formatPlane(indices: IndexTriple): string {
  return formatTriple(indices, "(", ")");
}

/** "{hkl}" — the symmetry-equivalent family of planes. */
export function formatPlaneFamily(indices: IndexTriple): string {
  return formatTriple(indices, "{", "}");
}

/** "[uvw]" — a specific direction. */
export function formatDirection(indices: IndexTriple): string {
  return formatTriple(indices, "[", "]");
}

/** "⟨uvw⟩" — the symmetry-equivalent family of directions. */
export function formatDirectionFamily(indices: IndexTriple): string {
  return formatTriple(indices, "⟨", "⟩");
}

/**
 * Parses a typed index string into a triple. Accepts optional brackets, an
 * optional separating comma or space, and negatives written either with a
 * leading minus or with a combining overline: "(1-10)", "1̄10", "[1,-1,0]".
 * Returns null when the text is not three indices.
 */
export function parseIndexTriple(text: string): IndexTriple | null {
  const stripped = text
    .trim()
    .replace(/^[([{⟨<]/, "")
    .replace(/[)\]}⟩>]$/, "");
  const values: number[] = [];

  // Comma- or space-separated form first, since it is the only way to type
  // multi-digit indices unambiguously.
  if (/[,\s]/.test(stripped)) {
    for (const token of stripped.split(/[,\s]+/).filter((part) => part.length > 0)) {
      const parsed = parseSingleIndex(token);
      if (parsed === null) {
        return null;
      }
      values.push(parsed);
    }
  } else {
    // Compact form: one digit per index, with "-" or an overline marking a bar.
    let pending: 1 | -1 = 1;
    for (const character of stripped) {
      if (character === "-") {
        pending = -1;
        continue;
      }
      if (character === COMBINING_OVERLINE) {
        // The overline follows its digit, so retro-negate the value just pushed.
        const last = values.pop();
        if (last === undefined) {
          return null;
        }
        values.push(-Math.abs(last));
        continue;
      }
      if (!/\d/.test(character)) {
        return null;
      }
      values.push(pending * Number(character));
      pending = 1;
    }
  }

  if (values.length !== 3) {
    return null;
  }
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0];
}

function parseSingleIndex(token: string): number | null {
  const hasOverline = token.includes(COMBINING_OVERLINE);
  const digits = token.replace(new RegExp(COMBINING_OVERLINE, "g"), "");
  const parsed = Number(digits);
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return hasOverline ? -Math.abs(parsed) : parsed;
}

/**
 * The polygon where the plane (hkl) cuts the unit cube [0, a]³ — the outline
 * the screen actually draws. Returns the vertices in convex-hull order around
 * the plane normal, or an empty array when the plane misses the cell.
 *
 * @param indices - the Miller indices
 * @param latticeConstant - cube edge length in model units
 * @param offset - which member of the family of parallel planes to draw, as a
 *   multiple of d_hkl from the origin; 1 gives the plane through the standard
 *   intercepts
 */
export function planePolygonInCell(indices: IndexTriple, latticeConstant: number, offset = 1): Vector3[] {
  const [h, k, l] = indices;
  if (h === 0 && k === 0 && l === 0) {
    return [];
  }

  // Plane: h·x + k·y + l·z = offset·a  (with x, y, z in model units).
  const normal = new Vector3(h, k, l);
  const constant = offset * latticeConstant;
  const points: Vector3[] = [];

  // Intersect the plane with each of the cube's twelve edges.
  const corners: Array<readonly [number, number, number]> = [];
  for (const x of [0, 1]) {
    for (const y of [0, 1]) {
      for (const z of [0, 1]) {
        corners.push([x, y, z]);
      }
    }
  }

  for (let i = 0; i < corners.length; i++) {
    for (let j = i + 1; j < corners.length; j++) {
      // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loops
      const from = corners[i]!;
      // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loops
      const to = corners[j]!;
      const differing = (from[0] === to[0] ? 0 : 1) + (from[1] === to[1] ? 0 : 1) + (from[2] === to[2] ? 0 : 1);
      if (differing !== 1) {
        continue; // not a cube edge
      }

      const start = new Vector3(from[0], from[1], from[2]).timesScalar(latticeConstant);
      const end = new Vector3(to[0], to[1], to[2]).timesScalar(latticeConstant);
      const startValue = normal.dot(start);
      const endValue = normal.dot(end);

      if (Math.abs(endValue - startValue) < 1e-12) {
        continue; // edge parallel to the plane
      }
      const t = (constant - startValue) / (endValue - startValue);
      if (t < -1e-9 || t > 1 + 1e-9) {
        continue; // crossing lies outside this edge
      }
      points.push(start.plus(end.minus(start).timesScalar(t)));
    }
  }

  return sortAroundNormal(deduplicate(points), normal);
}

function deduplicate(points: readonly Vector3[]): Vector3[] {
  const unique: Vector3[] = [];
  for (const point of points) {
    if (!unique.some((existing) => existing.distance(point) < 1e-6)) {
      unique.push(point);
    }
  }
  return unique;
}

/** Orders coplanar points counter-clockwise about their centroid, seen along `normal`. */
function sortAroundNormal(points: readonly Vector3[], normal: Vector3): Vector3[] {
  if (points.length < 3) {
    return [...points];
  }

  const centroid = points.reduce((sum, point) => sum.plus(point), new Vector3(0, 0, 0)).timesScalar(1 / points.length);
  const unitNormal = normal.normalized();

  // Any vector in the plane works as the angular origin.
  // biome-ignore lint/style/noNonNullAssertion: guarded by the length check above
  const reference = points[0]!.minus(centroid).normalized();
  const orthogonal = unitNormal.cross(reference);

  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.minus(centroid).dot(orthogonal), a.minus(centroid).dot(reference));
    const angleB = Math.atan2(b.minus(centroid).dot(orthogonal), b.minus(centroid).dot(reference));
    return angleA - angleB;
  });
}

/**
 * The atoms of a cubic structure that lie *in* the plane (hkl) through the
 * origin, expressed as 2D coordinates within that plane. This is the Screen 1
 * areal-density machinery applied to a slice of a 3D crystal — the callback
 * that ties the two screens together.
 *
 * @param indices - the plane
 * @param basis - the structure's basis, in fractional cell coordinates
 *   (e.g. [(0,0,0)] for SC, plus (½,½,½) for BCC)
 * @param latticeConstant - cube edge length in model units
 * @param cellRange - how many cells out from the origin to search, per axis
 */
export function atomsInPlane(
  indices: IndexTriple,
  basis: readonly Vector3[],
  latticeConstant: number,
  cellRange = 4,
): Vector2[] {
  const [h, k, l] = indices;
  if (h === 0 && k === 0 && l === 0) {
    return [];
  }

  const normal = new Vector3(h, k, l).normalized();
  // Two orthonormal in-plane axes, used as the 2D coordinate frame.
  const seed = Math.abs(normal.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
  const inPlaneX = normal.cross(seed).normalized();
  const inPlaneY = normal.cross(inPlaneX);

  const found: Vector2[] = [];
  const tolerance = 1e-6 * latticeConstant;

  for (let i = -cellRange; i <= cellRange; i++) {
    for (let j = -cellRange; j <= cellRange; j++) {
      for (let m = -cellRange; m <= cellRange; m++) {
        for (const basisPosition of basis) {
          const position = new Vector3(
            (i + basisPosition.x) * latticeConstant,
            (j + basisPosition.y) * latticeConstant,
            (m + basisPosition.z) * latticeConstant,
          );
          if (Math.abs(position.dot(normal)) > tolerance) {
            continue;
          }
          const projected = new Vector2(position.dot(inPlaneX), position.dot(inPlaneY));
          if (!found.some((existing) => existing.distance(projected) < tolerance)) {
            found.push(projected);
          }
        }
      }
    }
  }
  return found;
}

/**
 * Planar density — atoms per unit area on the (hkl) plane.
 *
 * The in-plane atoms form a 2D lattice with exactly one atom per 2D cell, so
 * the density is the reciprocal of that cell's area. Finding the cell exactly
 * (rather than counting atoms in a disc) keeps the answer free of the
 * boundary bias a finite patch would introduce: FCC (100) gives exactly 2/a²,
 * (110) exactly √2/a², (111) exactly 4/(√3·a²).
 *
 * @returns atoms per unit area in the same length units as `latticeConstant`
 */
export function planarDensity(
  indices: IndexTriple,
  basis: readonly Vector3[],
  latticeConstant: number,
  cellRange = 4,
): number {
  const area = inPlaneCellArea(indices, basis, latticeConstant, cellRange);
  return area > 0 ? 1 / area : 0;
}

/**
 * The area of the 2D primitive cell of the atoms lying in the (hkl) plane,
 * found as |v₁ × v₂| for the two shortest independent in-plane lattice vectors.
 */
export function inPlaneCellArea(
  indices: IndexTriple,
  basis: readonly Vector3[],
  latticeConstant: number,
  cellRange = 4,
): number {
  const points = atomsInPlane(indices, basis, latticeConstant, cellRange).filter((point) => point.magnitude > 1e-9);
  if (points.length < 2) {
    return 0;
  }

  const byLength = [...points].sort((a, b) => a.magnitude - b.magnitude);
  // biome-ignore lint/style/noNonNullAssertion: guarded by the length check above
  const shortest = byLength[0]!;

  // The second vector must be independent of the first — a non-zero cross product.
  for (const candidate of byLength) {
    const cross = Math.abs(shortest.x * candidate.y - shortest.y * candidate.x);
    if (cross > 1e-9 * shortest.magnitude * candidate.magnitude) {
      return cross;
    }
  }
  return 0;
}
