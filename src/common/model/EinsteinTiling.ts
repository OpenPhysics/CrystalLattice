/**
 * EinsteinTiling.ts
 *
 * Generates patches of the 2023 "hat" aperiodic monotile for sub-mode B of the
 * Aperiodic Order screen, plus the outline of its chiral cousin the "spectre".
 *
 * ── Why a substitution and not a search ───────────────────────────────────────
 * The hat has no local matching rules to follow the way Penrose rhombi do:
 * whether a placement extends to a tiling of the whole plane is not a local
 * question. What the discoverers proved instead is that hats assemble into four
 * *metatiles* — H, T, P and F — which themselves obey a substitution rule. So a
 * correct patch of any size is produced by substituting metatiles and reading
 * off the hats at the leaves, exactly as in Kaplan's reference visualizer.
 *
 * ── Hat vs. spectre ───────────────────────────────────────────────────────────
 * The hat tiles the plane only if reflected copies are allowed. Within months a
 * refinement appeared: the "spectre", an equilateral member of the same family
 * that tiles using rotations and translations of a single chirality — a strictly
 * stronger result, and a nice illustration of a research finding being sharpened
 * in the same year it was announced.
 *
 * ── Attribution ───────────────────────────────────────────────────────────────
 * The hat outline, the H/T/P/F metatile geometry, the 29-rule patch assembly and
 * the supertile extraction below are a TypeScript port of `hatviz` by Craig S.
 * Kaplan (https://github.com/isohedral/hatviz), used under its BSD 3-Clause
 * licence; the spectre outline comes from the companion `spectre` visualizer.
 * The underlying mathematics is from "An aperiodic monotile" (Smith, Myers,
 * Kaplan & Goodman-Strauss, 2023) and "A chiral aperiodic monotile" (2023).
 * See CREDITS.md for the full licence text.
 *
 * No Scenery imports — unit-testable without a DOM.
 */

import { Vector2 } from "scenerystack/dot";
import {
  type Affine2D,
  compose,
  IDENTITY,
  isReflecting,
  lineIntersection,
  matchSegments,
  rotation,
  rotationAbout,
  translation,
} from "./Affine2D.js";

const HALF_ROOT_3 = Math.sqrt(3) / 2;

/** The four metatiles the hat clusters into. */
export const MetatileType = {
  /** Irregular hexagon; a cluster of four hats, one of them reflected. */
  H: "H",
  /** Equilateral triangle; a single isolated hat. */
  T: "T",
  /** Parallelogram; a pair of hats. */
  P: "P",
  /** Pentagon; the pair of hats on one arm of a triskelion. */
  F: "F",
} as const;

export type MetatileType = (typeof MetatileType)[keyof typeof MetatileType];

/** A point on the kite grid: hexagonal coordinates mapped to the plane. */
function hexPoint(x: number, y: number): Vector2 {
  return new Vector2(x + 0.5 * y, HALF_ROOT_3 * y);
}

/**
 * The hat: a 13-gon assembled from eight kites of the [3.4.6.4] Laves tiling,
 * given here in the hexagonal coordinates that make every vertex exact.
 */
export const HAT_OUTLINE: readonly Vector2[] = [
  hexPoint(0, 0),
  hexPoint(-1, -1),
  hexPoint(0, -2),
  hexPoint(2, -2),
  hexPoint(2, -1),
  hexPoint(4, -2),
  hexPoint(5, -1),
  hexPoint(4, 0),
  hexPoint(3, 0),
  hexPoint(2, 2),
  hexPoint(0, 3),
  hexPoint(0, 2),
  hexPoint(-1, 2),
];

/**
 * The spectre, "Tile(1,1)": the equilateral member of the hat's continuous
 * family, whose fourteen equal edges let it tile with a single chirality — no
 * reflections needed. Shown on the screen alongside the hat for comparison.
 */
export const SPECTRE_OUTLINE: readonly Vector2[] = [
  new Vector2(0, 0),
  new Vector2(1, 0),
  new Vector2(1.5, -HALF_ROOT_3),
  new Vector2(1.5 + HALF_ROOT_3, 0.5 - HALF_ROOT_3),
  new Vector2(1.5 + HALF_ROOT_3, 1.5 - HALF_ROOT_3),
  new Vector2(2.5 + HALF_ROOT_3, 1.5 - HALF_ROOT_3),
  new Vector2(3 + HALF_ROOT_3, 1.5),
  new Vector2(3, 2),
  new Vector2(3 - HALF_ROOT_3, 1.5),
  new Vector2(2.5 - HALF_ROOT_3, 1.5 + HALF_ROOT_3),
  new Vector2(1.5 - HALF_ROOT_3, 1.5 + HALF_ROOT_3),
  new Vector2(0.5 - HALF_ROOT_3, 1.5 + HALF_ROOT_3),
  new Vector2(-HALF_ROOT_3, 1.5),
  new Vector2(0, 1),
];

/**
 * A node of the substitution hierarchy. Leaves carry the hat outline and no
 * children; interior nodes carry a metatile outline and the transformed
 * children that fill it.
 */
type Cluster = {
  /** The node's own outline, drawn when the recursion bottoms out. */
  readonly outline: readonly Vector2[];
  /** Which metatile this hat belongs to, for the four-colour rendering. */
  readonly metatile: MetatileType;
  readonly children: Array<{ readonly transform: Affine2D; readonly cluster: Cluster }>;
};

function leafHat(metatile: MetatileType): Cluster {
  return { outline: HAT_OUTLINE, metatile, children: [] };
}

/** The four hat leaves, one per metatile, so the render can colour by cluster. */
const H_HAT = leafHat(MetatileType.H);
const T_HAT = leafHat(MetatileType.T);
const P_HAT = leafHat(MetatileType.P);
const F_HAT = leafHat(MetatileType.F);

/** The H metatile: an irregular hexagon holding four hats, one reflected. */
function buildH(): Cluster {
  const outline = [
    new Vector2(0, 0),
    new Vector2(4, 0),
    new Vector2(4.5, HALF_ROOT_3),
    new Vector2(2.5, 5 * HALF_ROOT_3),
    new Vector2(1.5, 5 * HALF_ROOT_3),
    new Vector2(-0.5, HALF_ROOT_3),
  ];
  const at = (index: number): Vector2 => outline[index] as Vector2;
  const hat = (index: number): Vector2 => HAT_OUTLINE[index] as Vector2;

  return {
    outline,
    metatile: MetatileType.H,
    children: [
      { transform: matchSegments(hat(5), hat(7), at(5), at(0)), cluster: H_HAT },
      { transform: matchSegments(hat(9), hat(11), at(1), at(2)), cluster: H_HAT },
      { transform: matchSegments(hat(5), hat(7), at(3), at(4)), cluster: H_HAT },
      {
        // The reflected hat at the centre of the H cluster.
        transform: compose(
          translation(2.5, HALF_ROOT_3),
          compose([-0.5, -HALF_ROOT_3, 0, HALF_ROOT_3, -0.5, 0], [0.5, 0, 0, 0, -0.5, 0]),
        ),
        cluster: H_HAT,
      },
    ],
  };
}

/** The T metatile: an equilateral triangle holding a single hat. */
function buildT(): Cluster {
  return {
    outline: [new Vector2(0, 0), new Vector2(3, 0), new Vector2(1.5, 3 * HALF_ROOT_3)],
    metatile: MetatileType.T,
    children: [{ transform: [0.5, 0, 0.5, 0, 0.5, HALF_ROOT_3], cluster: T_HAT }],
  };
}

/** The pair of hats shared by the P and F metatiles. */
function hatPair(cluster: Cluster): Cluster["children"] {
  return [
    { transform: [0.5, 0, 1.5, 0, 0.5, HALF_ROOT_3], cluster },
    {
      transform: compose(
        translation(0, 2 * HALF_ROOT_3),
        compose([0.5, HALF_ROOT_3, 0, -HALF_ROOT_3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0]),
      ),
      cluster,
    },
  ];
}

/** The P metatile: a parallelogram holding two hats. */
function buildP(): Cluster {
  return {
    outline: [new Vector2(0, 0), new Vector2(4, 0), new Vector2(3, 2 * HALF_ROOT_3), new Vector2(-1, 2 * HALF_ROOT_3)],
    metatile: MetatileType.P,
    children: hatPair(P_HAT),
  };
}

/** The F metatile: a pentagon holding two hats. */
function buildF(): Cluster {
  return {
    outline: [
      new Vector2(0, 0),
      new Vector2(3, 0),
      new Vector2(3.5, HALF_ROOT_3),
      new Vector2(3, 2 * HALF_ROOT_3),
      new Vector2(-1, 2 * HALF_ROOT_3),
    ],
    metatile: MetatileType.F,
    children: hatPair(F_HAT),
  };
}

/** The four base metatiles — level 1 of the hierarchy, hats at the leaves. */
export function baseMetatiles(): [Cluster, Cluster, Cluster, Cluster] {
  return [buildH(), buildT(), buildP(), buildF()];
}

/**
 * The assembly rules for one substitution step, laid out as a sequence of
 * placements. Each entry adds one metatile to a growing patch:
 *
 *   `[type]`                        — seed the patch with this metatile
 *   `[i, e, type, f]`               — attach `type`'s edge `f` to edge `e` of
 *                                     the already-placed child `i`
 *   `[i, e, j, g, type, f]`         — attach `type`'s edge `f` to the segment
 *                                     running from child `j`'s vertex `g` to
 *                                     child `i`'s vertex `e`
 *
 * The 29 rules produce the patch from which the next level's supertiles are cut.
 */
type PatchRule =
  | readonly [MetatileType]
  | readonly [number, number, MetatileType, number]
  | readonly [number, number, number, number, MetatileType, number];

const PATCH_RULES: readonly PatchRule[] = [
  ["H"],
  [0, 0, "P", 2],
  [1, 0, "H", 2],
  [2, 0, "P", 2],
  [3, 0, "H", 2],
  [4, 4, "P", 2],
  [0, 4, "F", 3],
  [2, 4, "F", 3],
  [4, 1, 3, 2, "F", 0],
  [8, 3, "H", 0],
  [9, 2, "P", 0],
  [10, 2, "H", 0],
  [11, 4, "P", 2],
  [12, 0, "H", 2],
  [13, 0, "F", 3],
  [14, 2, "F", 1],
  [15, 3, "H", 4],
  [8, 2, "F", 1],
  [17, 3, "H", 0],
  [18, 2, "P", 0],
  [19, 2, "H", 2],
  [20, 4, "F", 3],
  [20, 0, "P", 2],
  [22, 0, "H", 2],
  [23, 4, "F", 3],
  [23, 0, "F", 3],
  [16, 0, "P", 2],
  [9, 4, 0, 2, "T", 2],
  [4, 0, "F", 3],
];

/** A placed metatile within an assembled patch. */
type PlacedCluster = { readonly transform: Affine2D; readonly cluster: Cluster };

/** The vertex `index` of a placed cluster, in patch coordinates. */
function placedVertex(placed: PlacedCluster, index: number): Vector2 {
  const outline = placed.cluster.outline;
  const point = outline[index % outline.length] as Vector2;
  const t = placed.transform;
  return new Vector2(t[0] * point.x + t[1] * point.y + t[2], t[3] * point.x + t[4] * point.y + t[5]);
}

/** Assembles the 29-metatile patch from which the next level's supertiles are cut. */
function constructPatch(metatiles: readonly [Cluster, Cluster, Cluster, Cluster]): PlacedCluster[] {
  const byType: Record<MetatileType, Cluster> = {
    H: metatiles[0],
    T: metatiles[1],
    P: metatiles[2],
    F: metatiles[3],
  };
  const placed: PlacedCluster[] = [];

  for (const rule of PATCH_RULES) {
    if (rule.length === 1) {
      placed.push({ transform: IDENTITY, cluster: byType[rule[0]] });
      continue;
    }

    if (rule.length === 4) {
      const [anchorIndex, edgeIndex, type, targetEdge] = rule;
      const anchor = placed[anchorIndex] as PlacedCluster;
      const p = placedVertex(anchor, edgeIndex + 1);
      const q = placedVertex(anchor, edgeIndex);
      const cluster = byType[type];
      const outline = cluster.outline;
      placed.push({
        transform: matchSegments(
          outline[targetEdge] as Vector2,
          outline[(targetEdge + 1) % outline.length] as Vector2,
          p,
          q,
        ),
        cluster,
      });
      continue;
    }

    const [firstIndex, firstVertex, secondIndex, secondVertex, type, targetEdge] = rule;
    const first = placed[firstIndex] as PlacedCluster;
    const second = placed[secondIndex] as PlacedCluster;
    const p = placedVertex(second, secondVertex);
    const q = placedVertex(first, firstVertex);
    const cluster = byType[type];
    const outline = cluster.outline;
    placed.push({
      transform: matchSegments(
        outline[targetEdge] as Vector2,
        outline[(targetEdge + 1) % outline.length] as Vector2,
        p,
        q,
      ),
      cluster,
    });
  }

  return placed;
}

/** The patch vertex used as a construction landmark: vertex `v` of child `n`. */
function patchVertex(patch: readonly PlacedCluster[], n: number, v: number): Vector2 {
  return placedVertex(patch[n] as PlacedCluster, v);
}

/** Re-centres a cluster on its outline's centroid, adjusting its children to match. */
function recentre(cluster: Cluster): Cluster {
  const count = cluster.outline.length;
  if (count === 0) {
    return cluster;
  }
  let cx = 0;
  let cy = 0;
  for (const point of cluster.outline) {
    cx += point.x;
    cy += point.y;
  }
  cx /= count;
  cy /= count;

  const shift = translation(-cx, -cy);
  return {
    outline: cluster.outline.map((point) => new Vector2(point.x - cx, point.y - cy)),
    metatile: cluster.metatile,
    children: cluster.children.map((child) => ({
      transform: compose(shift, child.transform),
      cluster: child.cluster,
    })),
  };
}

/**
 * Cuts the four next-level supertiles out of an assembled patch. The supertiles
 * are not geometrically similar to the metatiles they replace — only T is — but
 * they are combinatorially equivalent, which is what lets the substitution
 * repeat indefinitely.
 */
function constructMetatiles(patch: readonly PlacedCluster[]): [Cluster, Cluster, Cluster, Cluster] {
  const bps1 = patchVertex(patch, 8, 2);
  const bps2 = patchVertex(patch, 21, 2);
  const rotated = applyTo(rotationAbout(bps1, (-2 * Math.PI) / 3), bps2);

  const p72 = patchVertex(patch, 7, 2);
  const p252 = patchVertex(patch, 25, 2);
  const p62 = patchVertex(patch, 6, 2);

  const lowerLeft = lineIntersection(bps1, rotated, p62, p72);

  let w = p62.minus(lowerLeft);
  const hOutline: Vector2[] = [lowerLeft, bps1];
  w = applyTo(rotation(-Math.PI / 3), w);
  hOutline.push((hOutline[1] as Vector2).plus(w));
  hOutline.push(patchVertex(patch, 14, 2));
  w = applyTo(rotation(-Math.PI / 3), w);
  hOutline.push((hOutline[3] as Vector2).minus(w));
  hOutline.push(p62);

  const pick = (indices: readonly number[]): Cluster["children"] =>
    indices.map((index) => {
      const placed = patch[index] as PlacedCluster;
      return { transform: placed.transform, cluster: placed.cluster };
    });

  const newH: Cluster = {
    outline: hOutline,
    metatile: MetatileType.H,
    children: pick([0, 9, 16, 27, 26, 6, 1, 8, 10, 15]),
  };

  const newP: Cluster = {
    outline: [p72, p72.plus(bps1.minus(lowerLeft)), bps1, lowerLeft],
    metatile: MetatileType.P,
    children: pick([7, 2, 3, 4, 28]),
  };

  const newF: Cluster = {
    outline: [bps2, patchVertex(patch, 24, 2), patchVertex(patch, 25, 0), p252, p252.plus(lowerLeft.minus(bps1))],
    metatile: MetatileType.F,
    children: pick([21, 20, 22, 23, 24, 25]),
  };

  const apexA = hOutline[2] as Vector2;
  const apexB = (hOutline[1] as Vector2).plus((hOutline[4] as Vector2).minus(hOutline[5] as Vector2));
  const apexC = applyTo(rotationAbout(apexB, -Math.PI / 3), apexA);
  const newT: Cluster = {
    outline: [apexB, apexC, apexA],
    metatile: MetatileType.T,
    children: pick([11]),
  };

  return [recentre(newH), recentre(newT), recentre(newP), recentre(newF)];
}

/** Applies an affine transform to a point (local helper mirroring Affine2D.apply). */
function applyTo(t: Affine2D, point: Vector2): Vector2 {
  return new Vector2(t[0] * point.x + t[1] * point.y + t[2], t[3] * point.x + t[4] * point.y + t[5]);
}

/** One hat in a generated patch, ready for the view to draw. */
export type PlacedHat = {
  /** The hat's outline in patch coordinates. */
  readonly polygon: readonly Vector2[];
  /** Which metatile cluster the hat belongs to — drives its colour. */
  readonly metatile: MetatileType;
  /** Whether this copy is reflected. The hat needs both chiralities to tile. */
  readonly reflected: boolean;
};

/**
 * Walks the substitution hierarchy to its leaves, collecting the hats.
 *
 * @param cluster - a metatile at level `depth`
 * @param transform - accumulated placement
 * @param depth - remaining levels to descend; must equal the cluster's own
 *   depth, since a leaf reached early has no children to draw
 */
function collectHats(cluster: Cluster, transform: Affine2D, depth: number, into: PlacedHat[]): void {
  if (depth > 0 && cluster.children.length > 0) {
    for (const child of cluster.children) {
      collectHats(child.cluster, compose(transform, child.transform), depth - 1, into);
    }
    return;
  }
  into.push({
    polygon: cluster.outline.map((point) => applyTo(transform, point)),
    metatile: cluster.metatile,
    reflected: isReflecting(transform),
  });
}

/**
 * Grows a patch of hats by repeated substitution.
 *
 * @param steps - substitution steps; 0 gives the four hats of a single H
 *   metatile, and each step multiplies the count by roughly 4
 * @param which - which of the four supertiles to expand; H gives the roundest
 *   patch and is what the screen's "auto-tile" button uses
 */
export function generateHatPatch(steps: number, which: MetatileType = MetatileType.H): PlacedHat[] {
  let metatiles = baseMetatiles();
  for (let step = 0; step < steps; step++) {
    metatiles = constructMetatiles(constructPatch(metatiles));
  }

  const index = { H: 0, T: 1, P: 2, F: 3 }[which];
  const hats: PlacedHat[] = [];
  collectHats(metatiles[index] as Cluster, IDENTITY, steps + 1, hats);
  return hats;
}

/** How many hats a patch holds, split by chirality. */
export type HatCounts = {
  readonly total: number;
  /** Reflected copies — the ones the spectre makes unnecessary. */
  readonly reflected: number;
  /** Unreflected copies. */
  readonly unreflected: number;
  /** How many hats there are per reflected hat; approaches 7 as patches grow. */
  readonly reflectionRatio: number;
};

/** Counts a patch's hats by chirality. */
export function countHats(hats: readonly PlacedHat[]): HatCounts {
  const reflected = hats.filter((hat) => hat.reflected).length;
  const unreflected = hats.length - reflected;
  return {
    total: hats.length,
    reflected,
    unreflected,
    reflectionRatio: reflected > 0 ? hats.length / reflected : Number.POSITIVE_INFINITY,
  };
}

/** The distinct vertex positions of a hat patch, for the diffraction calculation. */
export function hatPatchVertices(hats: readonly PlacedHat[], tolerance = 1e-4): Vector2[] {
  const seen = new Set<string>();
  const vertices: Vector2[] = [];

  for (const hat of hats) {
    for (const point of hat.polygon) {
      const key = `${Math.round(point.x / tolerance)},${Math.round(point.y / tolerance)}`;
      if (!seen.has(key)) {
        seen.add(key);
        vertices.push(point);
      }
    }
  }
  return vertices;
}
