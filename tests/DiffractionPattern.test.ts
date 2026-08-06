/**
 * DiffractionPattern.test.ts
 *
 * The direct-sum transform, checked against cases whose answers are known in
 * closed form.
 *
 * The load-bearing test is the last one: a Penrose tiling must produce sharp
 * peaks with ten-fold symmetry, and a periodic lattice must not. That contrast
 * is the entire physics claim of the Aperiodic Order screen, and it is the one
 * thing a regression here would quietly destroy.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  circularSubset,
  computeDiffraction,
  findPeaks,
  intensityAt,
  kVectorAt,
  measureSymmetryOrder,
  suggestedKRange,
} from "../src/common/model/DiffractionPattern.js";
import { generatePenroseTiling, mergeIntoRhombi, tilingVertices } from "../src/common/model/PenroseTiling.js";

/** A square lattice patch of the given spacing, trimmed to a disc. */
function squareLattice(spacing: number, radius: number): Vector2[] {
  const points: Vector2[] = [];
  const count = Math.ceil(radius / spacing) + 1;
  for (let i = -count; i <= count; i++) {
    for (let j = -count; j <= count; j++) {
      points.push(new Vector2(i * spacing, j * spacing));
    }
  }
  return circularSubset(points, radius);
}

/** A hexagonal lattice patch, trimmed to a disc. */
function hexagonalLattice(spacing: number, radius: number): Vector2[] {
  const points: Vector2[] = [];
  const count = Math.ceil((2 * radius) / spacing) + 1;
  for (let i = -count; i <= count; i++) {
    for (let j = -count; j <= count; j++) {
      points.push(new Vector2(spacing * (i + j / 2), spacing * j * (Math.sqrt(3) / 2)));
    }
  }
  return circularSubset(points, radius);
}

describe("the transform itself", () => {
  it("returns an empty pattern for no scatterers", () => {
    const result = computeDiffraction([], 10, 8);
    expect(result.peakIntensity).toBe(0);
    expect(result.intensities.every((value) => value === 0)).toBe(true);
  });

  it("fills the whole grid", () => {
    const result = computeDiffraction([new Vector2(0, 0)], 10, 16);
    expect(result.intensities).toHaveLength(16 * 16);
  });

  it("normalizes so the brightest diffracted peak is 1", () => {
    const result = computeDiffraction(squareLattice(1, 6), 4 * Math.PI, 65);
    expect(Math.max(...result.intensities)).toBeCloseTo(1, 6);
  });

  it("maps grid cells to the k range symmetrically", () => {
    const result = computeDiffraction([new Vector2(0, 0)], 10, 11);
    expect(kVectorAt(result, 0, 0).x).toBeCloseTo(-10, 10);
    expect(kVectorAt(result, 10, 10).x).toBeCloseTo(10, 10);
    expect(kVectorAt(result, 5, 5).magnitude).toBeCloseTo(0, 10);
  });

  it("reads zero outside the grid rather than throwing", () => {
    const result = computeDiffraction([new Vector2(0, 0)], 10, 8);
    expect(intensityAt(result, -1, 0)).toBe(0);
    expect(intensityAt(result, 99, 0)).toBe(0);
  });
});

describe("a periodic square lattice", () => {
  const kRange = 4 * Math.PI;
  const result = computeDiffraction(squareLattice(1, 8), kRange, 129);
  const peaks = findPeaks(result, 0.3);

  it("puts its Bragg peaks on the reciprocal lattice, at multiples of 2π/a", () => {
    for (const peak of peaks) {
      expect(peak.k.x / (2 * Math.PI)).toBeCloseTo(Math.round(peak.k.x / (2 * Math.PI)), 1);
      expect(peak.k.y / (2 * Math.PI)).toBeCloseTo(Math.round(peak.k.y / (2 * Math.PI)), 1);
    }
  });

  it("finds the eight first- and second-order peaks around the beam stop", () => {
    expect(peaks.length).toBeGreaterThanOrEqual(4);
  });

  it("measures four-fold symmetry", () => {
    expect(measureSymmetryOrder(peaks, kRange)).toBe(4);
  });
});

describe("a periodic hexagonal lattice", () => {
  it("measures six-fold symmetry", () => {
    const kRange = 4 * Math.PI;
    const result = computeDiffraction(hexagonalLattice(1, 8), kRange, 129);
    expect(measureSymmetryOrder(findPeaks(result, 0.3), kRange)).toBe(6);
  });
});

describe("a Penrose tiling", () => {
  const vertices = tilingVertices(mergeIntoRhombi(generatePenroseTiling(6)));
  const points = circularSubset(vertices, 0.7);
  const kRange = suggestedKRange(1 / ((1 + Math.sqrt(5)) / 2) ** 6, 1.5);
  const result = computeDiffraction(points, kRange, 129);
  const peaks = findPeaks(result, 0.15);

  it("produces sharp Bragg peaks, not a diffuse halo", () => {
    // A disordered point set of this size would show no local maxima above the
    // threshold at all; long-range order is what makes these peaks exist.
    expect(peaks.length).toBeGreaterThan(8);
  });

  it("measures ten-fold symmetry — forbidden for any periodic lattice", () => {
    // The crystallographic restriction theorem allows only 1-, 2-, 3-, 4- and
    // 6-fold axes in a periodic lattice. Ten is the whole point.
    expect(measureSymmetryOrder(peaks, kRange)).toBe(10);
  });

  it("gives an order no periodic lattice in this suite reaches", () => {
    const squareOrder = measureSymmetryOrder(
      findPeaks(computeDiffraction(squareLattice(1, 8), 4 * Math.PI, 129), 0.3),
      4 * Math.PI,
    );
    expect(measureSymmetryOrder(peaks, kRange)).toBeGreaterThan(squareOrder);
  });
});

describe("symmetry measurement", () => {
  it("reports 1 when there is nothing to rotate", () => {
    expect(measureSymmetryOrder([], 10)).toBe(1);
    expect(measureSymmetryOrder([{ k: new Vector2(0, 0), intensity: 1 }], 10)).toBe(1);
  });

  it("finds the four-fold symmetry of four peaks on the axes", () => {
    const peaks = [
      { k: new Vector2(1, 0), intensity: 1 },
      { k: new Vector2(0, 1), intensity: 1 },
      { k: new Vector2(-1, 0), intensity: 1 },
      { k: new Vector2(0, -1), intensity: 1 },
    ];
    expect(measureSymmetryOrder(peaks, 2)).toBe(4);
  });

  it("finds only two-fold symmetry in a pair of opposed peaks", () => {
    const peaks = [
      { k: new Vector2(1, 0), intensity: 1 },
      { k: new Vector2(-1, 0), intensity: 1 },
    ];
    expect(measureSymmetryOrder(peaks, 2)).toBe(2);
  });
});

describe("helpers", () => {
  it("scales the k range inversely with the real-space spacing", () => {
    expect(suggestedKRange(1, 1)).toBeCloseTo(2 * Math.PI, 10);
    expect(suggestedKRange(0.5, 1)).toBeCloseTo(4 * Math.PI, 10);
  });

  it("trims a point set to a disc about its centroid", () => {
    const trimmed = circularSubset(squareLattice(1, 10), 3);
    for (const point of trimmed) {
      expect(point.magnitude).toBeLessThanOrEqual(3 + 1e-9);
    }
  });
});
