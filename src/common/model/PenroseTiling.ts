/**
 * PenroseTiling.ts
 *
 * Generates Penrose P3 (rhombus) tilings by inflation, for sub-mode A of the
 * Aperiodic Order screen.
 *
 * ── Why inflation and not matching rules ──────────────────────────────────────
 * Placing tiles by matching their edge markings is the *definition* of a
 * Penrose tiling, but generating a large one that way is a constraint-satisfaction
 * search that can dead-end. The substitution ("inflation") rule instead
 * subdivides every tile deterministically, so n steps always produce a correct
 * tiling of φ²ⁿ times the area. The screen uses matching rules for the
 * hand-placement mode and inflation for the "grow me a big one" button.
 *
 * ── The Robinson triangles ────────────────────────────────────────────────────
 * Each rhombus is cut along a diagonal into two mirror-image Robinson triangles,
 * and the substitution is stated on those halves:
 *
 *   ACUTE  (36°–72°–72°) — half of a THIN rhombus (36°/144°)
 *   OBTUSE (108°–36°–36°) — half of a THICK rhombus (72°/108°)
 *
 * Every triangle is isoceles with the apex listed first; the two legs run from
 * the apex to `b` and `c`, and `b`→`c` is the base along which two halves glue
 * back into a rhombus.
 *
 * ── Tile frequency ────────────────────────────────────────────────────────────
 * The substitution matrix is [[1, 1], [1, 2]] (an acute yields one of each; an
 * obtuse yields one acute and two obtuse), whose leading eigenvalue is φ² and
 * whose eigenvector ratio is φ. So thick:thin → φ = 1.618… as the tiling grows —
 * the quantitative payoff the screen reports.
 *
 * No Scenery imports — unit-testable without a DOM.
 */

import { Vector2 } from "scenerystack/dot";

/** The golden ratio, φ = (1 + √5)/2. Both the inflation factor's root and the tile-count limit. */
export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

/** The two Robinson triangles. */
export const RobinsonTriangleType = {
  /** 36°–72°–72°; two of these make a thin rhombus. */
  ACUTE: "acute",
  /** 108°–36°–36°; two of these make a thick rhombus. */
  OBTUSE: "obtuse",
} as const;

export type RobinsonTriangleType = (typeof RobinsonTriangleType)[keyof typeof RobinsonTriangleType];

/** The two Penrose rhombi. */
export const RhombusType = {
  /** 36°/144° — built from two acute Robinson triangles. */
  THIN: "thin",
  /** 72°/108° — built from two obtuse Robinson triangles. */
  THICK: "thick",
} as const;

export type RhombusType = (typeof RhombusType)[keyof typeof RhombusType];

/** Half a rhombus: the apex `a`, and the base running `b` → `c`. */
export type RobinsonTriangle = {
  readonly type: RobinsonTriangleType;
  readonly a: Vector2;
  readonly b: Vector2;
  readonly c: Vector2;
};

/** A whole rhombus, as its four vertices in order. */
export type PenroseRhombus = {
  readonly type: RhombusType;
  /** Vertices in cyclic order, starting at one of the two apexes. */
  readonly vertices: readonly [Vector2, Vector2, Vector2, Vector2];
};

/** The rhombus a Robinson triangle is half of. */
export function rhombusTypeOf(triangleType: RobinsonTriangleType): RhombusType {
  return triangleType === RobinsonTriangleType.ACUTE ? RhombusType.THIN : RhombusType.THICK;
}

/**
 * The classic "sun" seed: ten acute triangles fanned around the origin, forming
 * a decagon of unit radius. Alternate triangles are mirrored so adjacent halves
 * glue into whole rhombi, giving a patch with exact 10-fold symmetry to start
 * from — the symmetry the diffraction pattern later makes quantitative.
 */
export function penroseSeed(radius = 1, type: RobinsonTriangleType = RobinsonTriangleType.ACUTE): RobinsonTriangle[] {
  const triangles: RobinsonTriangle[] = [];
  const origin = new Vector2(0, 0);

  for (let i = 0; i < 10; i++) {
    const angleB = ((2 * i - 1) * Math.PI) / 10;
    const angleC = ((2 * i + 1) * Math.PI) / 10;
    const first = Vector2.createPolar(radius, angleB);
    const second = Vector2.createPolar(radius, angleC);

    // Mirroring every other triangle keeps the winding consistent around the
    // wheel, so the substitution does not produce overlapping children.
    const [b, c] = i % 2 === 0 ? [second, first] : [first, second];
    triangles.push({ type, a: origin, b, c });
  }
  return triangles;
}

/**
 * One inflation step. Every triangle is replaced by smaller triangles of the
 * same two shapes, scaled down by φ; running this n times from the seed yields
 * a correct Penrose tiling with φ²ⁿ times as many tiles.
 *
 * The two rules, in terms of a triangle's apex `a` and base `b`→`c`:
 *
 *   ACUTE:  cut the leg a→b at p = a + (b − a)/φ, giving
 *           an acute (apex c, base p→b) and an obtuse (apex p, base c→a)
 *
 *   OBTUSE: cut the leg b→a at q = b + (a − b)/φ and the base b→c at
 *           r = b + (c − b)/φ, giving obtuse (apex r, base c→a),
 *           obtuse (apex q, base r→b) and acute (apex r, base q→a)
 */
export function inflate(triangles: readonly RobinsonTriangle[]): RobinsonTriangle[] {
  const result: RobinsonTriangle[] = [];

  for (const triangle of triangles) {
    const { type, a, b, c } = triangle;

    if (type === RobinsonTriangleType.ACUTE) {
      const p = a.plus(b.minus(a).timesScalar(1 / GOLDEN_RATIO));
      result.push({ type: RobinsonTriangleType.ACUTE, a: c, b: p, c: b });
      result.push({ type: RobinsonTriangleType.OBTUSE, a: p, b: c, c: a });
    } else {
      const q = b.plus(a.minus(b).timesScalar(1 / GOLDEN_RATIO));
      const r = b.plus(c.minus(b).timesScalar(1 / GOLDEN_RATIO));
      result.push({ type: RobinsonTriangleType.OBTUSE, a: r, b: c, c: a });
      result.push({ type: RobinsonTriangleType.OBTUSE, a: q, b: r, c: b });
      result.push({ type: RobinsonTriangleType.ACUTE, a: r, b: q, c: a });
    }
  }
  return result;
}

/** Runs `steps` inflation steps starting from a seed. */
export function generatePenroseTiling(
  steps: number,
  radius = 1,
  seedType: RobinsonTriangleType = RobinsonTriangleType.ACUTE,
): RobinsonTriangle[] {
  let triangles = penroseSeed(radius, seedType);
  for (let step = 0; step < steps; step++) {
    triangles = inflate(triangles);
  }
  return triangles;
}

/**
 * Glues Robinson triangles back into whole rhombi. Two triangles of the same
 * type sharing a base edge are the two halves of one rhombus; triangles left
 * unpaired sit on the patch boundary and are dropped, since half a rhombus is
 * not a tile.
 */
export function mergeIntoRhombi(triangles: readonly RobinsonTriangle[], tolerance = 1e-6): PenroseRhombus[] {
  const byEdge = new Map<string, RobinsonTriangle[]>();

  for (const triangle of triangles) {
    const key = `${triangle.type}|${edgeKey(triangle.b, triangle.c, tolerance)}`;
    const bucket = byEdge.get(key);
    if (bucket) {
      bucket.push(triangle);
    } else {
      byEdge.set(key, [triangle]);
    }
  }

  const rhombi: PenroseRhombus[] = [];
  for (const bucket of byEdge.values()) {
    // Pair them off; a well-formed interior always yields exactly two.
    for (let i = 0; i + 1 < bucket.length; i += 2) {
      // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loop
      const first = bucket[i]!;
      // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loop
      const second = bucket[i + 1]!;
      // Apex, base start, other apex, base end — a valid cyclic order. Force it
      // counter-clockwise so edge indices mean the same thing on every rhombus.
      rhombi.push({
        type: rhombusTypeOf(first.type),
        vertices: counterClockwise([first.a, first.b, second.a, first.c]),
      });
    }
  }
  return rhombi;
}

/** Reverses the vertex order when the quad winds clockwise. */
function counterClockwise(
  vertices: readonly [Vector2, Vector2, Vector2, Vector2],
): [Vector2, Vector2, Vector2, Vector2] {
  const [v0, v1, v2, v3] = vertices;
  const signedArea =
    (v1.x - v0.x) * (v1.y + v0.y) +
    (v2.x - v1.x) * (v2.y + v1.y) +
    (v3.x - v2.x) * (v3.y + v2.y) +
    (v0.x - v3.x) * (v0.y + v3.y);
  // The shoelace sum above is positive for clockwise winding in a y-up frame.
  return signedArea > 0 ? [v0, v3, v2, v1] : [v0, v1, v2, v3];
}

/** Order-independent key for an undirected edge, quantized to `tolerance`. */
function edgeKey(p: Vector2, q: Vector2, tolerance: number): string {
  const quantize = (value: number): number => Math.round(value / tolerance);
  const a = `${quantize(p.x)},${quantize(p.y)}`;
  const b = `${quantize(q.x)},${quantize(q.y)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** How many rhombi of each type a tiling contains. */
export type TileCounts = {
  readonly thick: number;
  readonly thin: number;
  /**
   * thick / thin. Converges to φ = 1.618… as the tiling grows — a number the
   * screen shows creeping toward the golden ratio with each inflation.
   */
  readonly ratio: number;
};

/** Counts rhombi by type. Works on either triangles or merged rhombi. */
export function countTiles(tiles: readonly (RobinsonTriangle | PenroseRhombus)[]): TileCounts {
  let thick = 0;
  let thin = 0;

  for (const tile of tiles) {
    const type = tile.type;
    if (type === RhombusType.THICK || type === RobinsonTriangleType.OBTUSE) {
      thick++;
    } else {
      thin++;
    }
  }

  // Triangles come in pairs, so the counts halve — but the ratio is unchanged.
  return { thick, thin, ratio: thin > 0 ? thick / thin : Number.POSITIVE_INFINITY };
}

/**
 * The distinct vertex positions of a tiling — the "atom" positions fed to the
 * diffraction calculation. Deduplicated on a tolerance grid, since inflation
 * reaches the same vertex from several tiles.
 */
export function tilingVertices(tiles: readonly (RobinsonTriangle | PenroseRhombus)[], tolerance = 1e-6): Vector2[] {
  const seen = new Set<string>();
  const vertices: Vector2[] = [];

  const consider = (point: Vector2): void => {
    const key = `${Math.round(point.x / tolerance)},${Math.round(point.y / tolerance)}`;
    if (!seen.has(key)) {
      seen.add(key);
      vertices.push(point);
    }
  };

  for (const tile of tiles) {
    if ("vertices" in tile) {
      for (const vertex of tile.vertices) {
        consider(vertex);
      }
    } else {
      consider(tile.a);
      consider(tile.b);
      consider(tile.c);
    }
  }
  return vertices;
}

/** The polygon a triangle draws as. */
export function trianglePolygon(triangle: RobinsonTriangle): Vector2[] {
  return [triangle.a, triangle.b, triangle.c];
}

/**
 * The unit edge length of a tiling after `steps` inflations from a seed of the
 * given radius — each step divides every length by φ.
 */
export function edgeLengthAfter(steps: number, radius = 1): number {
  return radius / GOLDEN_RATIO ** steps;
}

// ── Matching rules for hand placement ────────────────────────────────────────
//
// Undecorated Penrose rhombi will happily tile the plane periodically, so
// "do the shapes fit?" is not the rule the screen wants to enforce. The rule
// that *does* forbid periodicity, and that a student can see, is the vertex
// atlas: only eight arrangements of corners around a vertex ever occur in a
// Penrose tiling, out of the many whose angles happen to sum to 360°.
//
// Rather than hard-coding those eight, they are read off a tiling the inflation
// already guarantees is correct — every interior vertex of a large inflated
// patch contributes its cyclic sequence of corner angles, and the set of
// sequences observed *is* the atlas.

// Corner angles in units of 36°, so every rhombus corner is an integer. The
// first entry is the angle at the two *apex* vertices (the even indices of
// `vertices`), the second the angle at the two base corners.
const THIN_CORNERS = [1, 4]; // apex 36°, base 144° — from acute Robinson halves
const THICK_CORNERS = [3, 2]; // apex 108°, base 72° — from obtuse Robinson halves

/** A full turn, in the same 36° units. */
const FULL_TURN_UNITS = 10;

/** The corner angle (in 36° units) at vertex `index` of a rhombus. */
export function cornerAngleUnits(rhombus: PenroseRhombus, index: number): number {
  const corners = rhombus.type === RhombusType.THIN ? THIN_CORNERS : THICK_CORNERS;
  // Vertices alternate between the two apexes (even indices) and the two
  // base corners (odd), so the angle alternates with them.
  return (index % 2 === 0 ? corners[0] : corners[1]) ?? 0;
}

/** A vertex configuration, as the cyclic sequence of corner angles meeting there. */
export type VertexStar = readonly number[];

let atlasCache: ReadonlySet<string> | null = null;

/** Canonical key for a cyclic sequence: the lexicographically smallest rotation. */
function cyclicKey(sequence: readonly number[]): string {
  let best: string | null = null;
  for (let start = 0; start < sequence.length; start++) {
    const rotated = [...sequence.slice(start), ...sequence.slice(0, start)].join(",");
    if (best === null || rotated < best) {
      best = rotated;
    }
  }
  return best ?? "";
}

/**
 * The Penrose vertex atlas: the legal cyclic arrangements of corner angles
 * around a vertex, derived once from inflated tilings and cached.
 *
 * Both the "sun" seed (ten acute halves) and the "star" seed (ten obtuse
 * halves) are inflated and unioned, because a single seed's tiling need not
 * contain every legal configuration. The result is stable from four inflations
 * onward, so five is used for headroom.
 */
export function vertexAtlas(): ReadonlySet<string> {
  if (atlasCache !== null) {
    return atlasCache;
  }

  const atlas = new Set<string>();
  for (const seedType of [RobinsonTriangleType.ACUTE, RobinsonTriangleType.OBTUSE]) {
    for (const star of completeVertexStars(mergeIntoRhombi(generatePenroseTiling(5, 1, seedType)))) {
      atlas.add(star);
    }
  }

  atlasCache = atlas;
  return atlas;
}

/** The complete (360°) vertex stars of a set of rhombi, as canonical cyclic keys. */
function completeVertexStars(rhombi: readonly PenroseRhombus[]): Set<string> {
  const byVertex = new Map<string, Array<{ angle: number; direction: number }>>();

  for (const rhombus of rhombi) {
    for (let index = 0; index < 4; index++) {
      // biome-ignore lint/style/noNonNullAssertion: index < 4 and vertices has length 4
      const vertex = rhombus.vertices[index]!;
      // biome-ignore lint/style/noNonNullAssertion: modular index stays in range
      const next = rhombus.vertices[(index + 1) % 4]!;
      const key = `${Math.round(vertex.x / 1e-6)},${Math.round(vertex.y / 1e-6)}`;
      const entry = {
        angle: cornerAngleUnits(rhombus, index),
        // Order corners around the vertex by the bearing of one bounding edge.
        direction: Math.atan2(next.y - vertex.y, next.x - vertex.x),
      };
      const bucket = byVertex.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        byVertex.set(key, [entry]);
      }
    }
  }

  const stars = new Set<string>();
  for (const corners of byVertex.values()) {
    const total = corners.reduce((sum, corner) => sum + corner.angle, 0);
    // Only complete vertices belong in the atlas; the rest are patch boundary.
    if (total !== FULL_TURN_UNITS) {
      continue;
    }
    corners.sort((a, b) => a.direction - b.direction);
    stars.add(cyclicKey(corners.map((corner) => corner.angle)));
  }
  return stars;
}

/**
 * Whether a partially-filled vertex could still be completed legally: its
 * corner angles must appear consecutively somewhere in one of the atlas's
 * cyclic sequences. This is the live feedback the hand-placement mode gives —
 * a placement is rejected the moment it makes *every* completion impossible,
 * rather than only when the vertex is full.
 *
 * @param corners - corner angles in 36° units, in order around the vertex
 */
export function isVertexStarLegal(corners: readonly number[]): boolean {
  const total = corners.reduce((sum, angle) => sum + angle, 0);
  if (total > FULL_TURN_UNITS) {
    return false;
  }

  const atlas = vertexAtlas();
  if (total === FULL_TURN_UNITS) {
    return atlas.has(cyclicKey(corners));
  }

  // Partial: accept if the run appears as a contiguous arc of some legal star.
  const run = corners.join(",");
  for (const entry of atlas) {
    const star = entry.split(",").map(Number);
    const doubled = [...star, ...star].join(",");
    if (doubled.includes(run)) {
      return true;
    }
  }
  return false;
}

/**
 * Whether placing `candidate` is legal given the corners already meeting at
 * each of its four vertices — the check the hand-placement mode runs on drop.
 *
 * @param candidate - the rhombus being placed
 * @param existingCorners - for each of the candidate's four vertices, the
 *   corner angles (in 36° units) already present there, in order around the vertex
 */
export function isPlacementLegal(candidate: PenroseRhombus, existingCorners: readonly (readonly number[])[]): boolean {
  for (let index = 0; index < 4; index++) {
    const corners = [...(existingCorners[index] ?? []), cornerAngleUnits(candidate, index)];
    if (!isVertexStarLegal(corners)) {
      return false;
    }
  }
  return true;
}
