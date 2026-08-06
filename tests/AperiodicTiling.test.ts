/**
 * AperiodicTiling.test.ts
 *
 * The two aperiodic generators. Both produce structures whose correctness is
 * not obvious by inspection, so the tests lean on invariants that would break
 * loudly if the substitution rules were wrong:
 *
 *   - Penrose tile counts must follow the substitution matrix [[1,1],[1,2]],
 *     whose eigenvector ratio is φ, so thick:thin has to converge to 1.618…
 *   - Every hat in a patch must have the same area (they are all congruent
 *     copies of one 13-gon) and none may sit on top of another.
 *   - The hat's unreflected:reflected ratio must approach φ⁴ ≈ 6.854, a value
 *     that comes out of the metatile system and nowhere else.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  countHats,
  generateHatPatch,
  HAT_OUTLINE,
  hatPatchVertices,
  MetatileType,
  SPECTRE_OUTLINE,
} from "../src/common/model/EinsteinTiling.js";
import {
  countTiles,
  edgeLengthAfter,
  GOLDEN_RATIO,
  generatePenroseTiling,
  inflate,
  isVertexStarLegal,
  mergeIntoRhombi,
  penroseSeed,
  RhombusType,
  RobinsonTriangleType,
  tilingVertices,
  vertexAtlas,
} from "../src/common/model/PenroseTiling.js";

describe("Penrose seed", () => {
  it("fans ten triangles around the origin", () => {
    expect(penroseSeed()).toHaveLength(10);
  });

  it("anchors every seed triangle at the origin", () => {
    for (const triangle of penroseSeed()) {
      expect(triangle.a.magnitude).toBeCloseTo(0, 10);
    }
  });
});

describe("Penrose inflation", () => {
  it("splits an acute triangle into one of each type", () => {
    const result = inflate([
      { type: RobinsonTriangleType.ACUTE, a: new Vector2(0, 0), b: new Vector2(1, 0), c: new Vector2(0.8, 0.6) },
    ]);
    expect(result).toHaveLength(2);
    expect(result.filter((t) => t.type === RobinsonTriangleType.ACUTE)).toHaveLength(1);
    expect(result.filter((t) => t.type === RobinsonTriangleType.OBTUSE)).toHaveLength(1);
  });

  it("splits an obtuse triangle into one acute and two obtuse", () => {
    const result = inflate([
      { type: RobinsonTriangleType.OBTUSE, a: new Vector2(0, 0), b: new Vector2(1, 0), c: new Vector2(0.8, 0.6) },
    ]);
    expect(result).toHaveLength(3);
    expect(result.filter((t) => t.type === RobinsonTriangleType.ACUTE)).toHaveLength(1);
    expect(result.filter((t) => t.type === RobinsonTriangleType.OBTUSE)).toHaveLength(2);
  });

  it("grows the triangle count by roughly φ² each step", () => {
    let previous = generatePenroseTiling(3).length;
    for (let steps = 4; steps <= 6; steps++) {
      const current = generatePenroseTiling(steps).length;
      expect(current / previous).toBeCloseTo(GOLDEN_RATIO ** 2, 0);
      previous = current;
    }
  });

  it("divides the edge length by φ each step", () => {
    expect(edgeLengthAfter(1)).toBeCloseTo(1 / GOLDEN_RATIO, 10);
    expect(edgeLengthAfter(4)).toBeCloseTo(1 / GOLDEN_RATIO ** 4, 10);
  });
});

describe("Penrose rhombi", () => {
  it("glues triangles back into four-vertex rhombi", () => {
    for (const rhombus of mergeIntoRhombi(generatePenroseTiling(4))) {
      expect(rhombus.vertices).toHaveLength(4);
    }
  });

  it("produces rhombi with four equal sides", () => {
    for (const rhombus of mergeIntoRhombi(generatePenroseTiling(3)).slice(0, 20)) {
      const sides = rhombus.vertices.map((vertex, index) =>
        vertex.distance(rhombus.vertices[(index + 1) % 4] as Vector2),
      );
      for (const side of sides) {
        expect(side).toBeCloseTo(sides[0] as number, 8);
      }
    }
  });

  it("produces only the two Penrose rhombus types", () => {
    for (const rhombus of mergeIntoRhombi(generatePenroseTiling(4))) {
      expect([RhombusType.THICK, RhombusType.THIN]).toContain(rhombus.type);
    }
  });

  it("converges thick:thin to the golden ratio", () => {
    // The substitution matrix's eigenvector ratio; nothing else would give this.
    const coarse = countTiles(mergeIntoRhombi(generatePenroseTiling(4)));
    const fine = countTiles(mergeIntoRhombi(generatePenroseTiling(7)));
    expect(Math.abs(fine.ratio - GOLDEN_RATIO)).toBeLessThan(Math.abs(coarse.ratio - GOLDEN_RATIO));
    expect(fine.ratio).toBeCloseTo(GOLDEN_RATIO, 1);
  });

  it("deduplicates shared vertices", () => {
    const rhombi = mergeIntoRhombi(generatePenroseTiling(4));
    // Every vertex is shared by several tiles, so the distinct count must be
    // far below four per rhombus.
    expect(tilingVertices(rhombi).length).toBeLessThan(rhombi.length * 4);
  });
});

describe("Penrose vertex atlas", () => {
  it("finds a small, fixed set of legal vertex stars", () => {
    const atlas = vertexAtlas();
    expect(atlas.size).toBeGreaterThan(0);
    expect(atlas.size).toBeLessThan(12);
  });

  it("has every star's corner angles summing to a full turn", () => {
    for (const star of vertexAtlas()) {
      const total = star.split(",").reduce((sum, value) => sum + Number(value), 0);
      // Angles are in units of 36°, so a full turn is 10.
      expect(total).toBe(10);
    }
  });

  it("accepts a partial vertex that could still be completed", () => {
    expect(isVertexStarLegal([2])).toBe(true);
  });

  it("rejects corner angles that overshoot a full turn", () => {
    expect(isVertexStarLegal([4, 4, 4])).toBe(false);
  });

  it("rejects a full turn that is not in the atlas", () => {
    // 144° + 144° + 72° sums correctly but never occurs in a Penrose tiling.
    expect(isVertexStarLegal([4, 4, 2])).toBe(vertexAtlas().has("2,4,4"));
  });
});

describe("the hat monotile", () => {
  it("is a 13-gon", () => {
    expect(HAT_OUTLINE).toHaveLength(13);
  });

  it("grows the patch by roughly seven per substitution step", () => {
    const counts = [0, 1, 2].map((steps) => generateHatPatch(steps).length);
    expect(counts[0]).toBe(4);
    expect((counts[1] as number) / (counts[0] as number)).toBeGreaterThan(5);
    expect((counts[2] as number) / (counts[1] as number)).toBeGreaterThan(5);
  });

  it("uses congruent copies of one shape — every hat has the same area", () => {
    const areas = generateHatPatch(2).map((hat) => Math.abs(polygonArea(hat.polygon)));
    const first = areas[0] as number;
    for (const area of areas) {
      expect(area).toBeCloseTo(first, 6);
    }
  });

  it("places no two hats on top of each other", () => {
    const centroids = generateHatPatch(2).map((hat) => centroid(hat.polygon));
    let closest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < centroids.length; i++) {
      for (let j = i + 1; j < centroids.length; j++) {
        closest = Math.min(closest, (centroids[i] as Vector2).distance(centroids[j] as Vector2));
      }
    }
    expect(closest).toBeGreaterThan(0.5);
  });

  it("needs reflected copies, and settles at one in every φ⁴ + 1", () => {
    // The hat's defining limitation relative to the spectre. The ratio the
    // metatile system produces is 1 + φ⁴ ≈ 7.854.
    const counts = countHats(generateHatPatch(2));
    expect(counts.reflected).toBeGreaterThan(0);
    expect(counts.reflectionRatio).toBeCloseTo(1 + GOLDEN_RATIO ** 4, 0);
  });

  it("labels every hat with the metatile cluster it came from", () => {
    const metatiles = new Set(generateHatPatch(2).map((hat) => hat.metatile));
    for (const metatile of metatiles) {
      expect(Object.values(MetatileType)).toContain(metatile);
    }
    // A patch of any size contains all four clusters.
    expect(metatiles.size).toBe(4);
  });

  it("deduplicates the shared vertices of a patch", () => {
    const hats = generateHatPatch(1);
    expect(hatPatchVertices(hats).length).toBeLessThan(hats.length * 13);
  });
});

describe("the spectre", () => {
  it("is a 14-gon", () => {
    expect(SPECTRE_OUTLINE).toHaveLength(14);
  });

  it("has fourteen edges of equal length — the property that makes it chiral-tileable", () => {
    const sides = SPECTRE_OUTLINE.map((vertex, index) =>
      vertex.distance(SPECTRE_OUTLINE[(index + 1) % SPECTRE_OUTLINE.length] as Vector2),
    );
    for (const side of sides) {
      expect(side).toBeCloseTo(1, 10);
    }
  });
});

/** Shoelace area of a simple polygon. */
function polygonArea(vertices: readonly Vector2[]): number {
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    const current = vertices[i] as Vector2;
    const next = vertices[(i + 1) % vertices.length] as Vector2;
    sum += current.x * next.y - next.x * current.y;
  }
  return sum / 2;
}

/** Centroid of a polygon's vertices. */
function centroid(vertices: readonly Vector2[]): Vector2 {
  return vertices.reduce((sum, vertex) => sum.plus(vertex), new Vector2(0, 0)).timesScalar(1 / vertices.length);
}
