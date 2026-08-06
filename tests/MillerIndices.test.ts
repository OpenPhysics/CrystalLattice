/**
 * MillerIndices.test.ts
 *
 * The intercept → reciprocal → clear → reduce pipeline, including the cases
 * students most often get wrong: an intercept at infinity becoming index 0, and
 * (200) *not* reducing to (100).
 */

import { Vector3 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { CubicStructure, generateCellAtoms } from "../src/common/model/CubicCell.js";
import {
  deriveDirectionIndices,
  derivePlaneIndices,
  directionIndicesFromVector,
  equivalentFamily,
  formatDirection,
  formatIndex,
  formatPlane,
  type IndexTriple,
  type Intercepts,
  interceptsFromIndices,
  interplanarSpacing,
  parseIndexTriple,
  planarDensity,
  planeNormal,
  planePolygonInCell,
  Rational,
} from "../src/common/model/MillerIndices.js";

/** Shorthand for building an intercept triple, with null meaning "parallel". */
function intercepts(a: number | null, b: number | null, c: number | null, denominator = 1): Intercepts {
  const make = (value: number | null): Rational | null => (value === null ? null : new Rational(value, denominator));
  return [make(a), make(b), make(c)];
}

describe("Rational", () => {
  it("reduces to lowest terms", () => {
    const value = new Rational(6, 8);
    expect(value.numerator).toBe(3);
    expect(value.denominator).toBe(4);
  });

  it("keeps the denominator positive", () => {
    const value = new Rational(1, -2);
    expect(value.numerator).toBe(-1);
    expect(value.denominator).toBe(2);
  });

  it("refuses to reciprocate zero", () => {
    expect(() => new Rational(0).reciprocal()).toThrow();
  });

  it("approximates a dragged value as a small fraction", () => {
    expect(Rational.fromNumber(0.3333, 4).toString()).toBe("1/3");
    expect(Rational.fromNumber(0.5, 4).toString()).toBe("1/2");
  });
});

describe("plane derivation", () => {
  it("turns an infinite intercept into index zero", () => {
    const derivation = derivePlaneIndices(intercepts(1, null, null));
    expect(derivation.reciprocals.map((r) => r.value)).toEqual([1, 0, 0]);
    expect(derivation.indices).toEqual([1, 0, 0]);
  });

  it("handles (110)", () => {
    expect(derivePlaneIndices(intercepts(1, 1, null)).indices).toEqual([1, 1, 0]);
  });

  it("handles (111)", () => {
    expect(derivePlaneIndices(intercepts(1, 1, 1)).indices).toEqual([1, 1, 1]);
  });

  it("reciprocates before clearing, so a half-intercept gives index 2", () => {
    // The classic exam trap: clearing fractions first would give (100).
    const derivation = derivePlaneIndices(intercepts(1, null, null, 2));
    expect(derivation.cleared).toEqual([2, 0, 0]);
  });

  it("clears a mixed set of fractions with one common multiplier", () => {
    const derivation = derivePlaneIndices(intercepts(3, 2, 1));
    expect(derivation.clearingMultiplier).toBe(6);
    expect(derivation.indices).toEqual([2, 3, 6]);
  });

  it("carries a negative intercept through to a barred index", () => {
    const derivation = derivePlaneIndices(intercepts(1, -1, null));
    expect(derivation.indices).toEqual([1, -1, 0]);
    expect(formatPlane(derivation.indices)).toBe("(11̅0)");
  });

  it("round-trips indices through their intercepts", () => {
    for (const indices of [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [2, 1, 0],
      [1, -1, 0],
    ] as IndexTriple[]) {
      expect(derivePlaneIndices(interceptsFromIndices(indices)).indices).toEqual(indices);
    }
  });
});

describe("direction derivation", () => {
  it("does not reciprocate", () => {
    const result = deriveDirectionIndices([new Rational(1), new Rational(1), new Rational(0)]);
    expect(result.indices).toEqual([1, 1, 0]);
  });

  it("reduces [222] to [111]", () => {
    expect(directionIndicesFromVector(new Vector3(2, 2, 2))).toEqual([1, 1, 1]);
  });

  it("clears a half-integer component", () => {
    expect(directionIndicesFromVector(new Vector3(0.5, 1, 0))).toEqual([1, 2, 0]);
  });
});

describe("interplanar spacing", () => {
  it("gives a for (100)", () => {
    expect(interplanarSpacing([1, 0, 0], 0.4)).toBeCloseTo(0.4, 10);
  });

  it("gives a/√2 for (110)", () => {
    expect(interplanarSpacing([1, 1, 0], 0.4)).toBeCloseTo(0.4 / Math.SQRT2, 10);
  });

  it("gives a/√3 for (111)", () => {
    expect(interplanarSpacing([1, 1, 1], 0.4)).toBeCloseTo(0.4 / Math.sqrt(3), 10);
  });

  it("gives half of (100)'s spacing for (200), which is the point of not reducing", () => {
    expect(interplanarSpacing([2, 0, 0], 0.4)).toBeCloseTo(interplanarSpacing([1, 0, 0], 0.4) / 2, 10);
  });
});

describe("equivalent families", () => {
  it("gives the cube's six faces for {100}", () => {
    expect(equivalentFamily([1, 0, 0])).toHaveLength(6);
  });

  it("gives eight members for {111}", () => {
    expect(equivalentFamily([1, 1, 1])).toHaveLength(8);
  });

  it("gives twelve members for ⟨110⟩", () => {
    expect(equivalentFamily([1, 1, 0])).toHaveLength(12);
  });

  it("includes the original triple", () => {
    expect(equivalentFamily([1, -1, 0])).toContainEqual([1, -1, 0]);
  });
});

describe("plane normals", () => {
  it("is [hkl] itself in a cubic crystal", () => {
    const normal = planeNormal([1, 1, 0]);
    expect([normal.x, normal.y, normal.z]).toEqual([1, 1, 0]);
  });
});

describe("plane cross-sections", () => {
  it("cuts a triangle out of the cell for (111)", () => {
    expect(planePolygonInCell([1, 1, 1], 1)).toHaveLength(3);
  });

  it("cuts a square face for (100)", () => {
    expect(planePolygonInCell([1, 0, 0], 1)).toHaveLength(4);
  });

  it("cuts a rectangle across the diagonal for (110)", () => {
    expect(planePolygonInCell([1, 1, 0], 1)).toHaveLength(4);
  });

  it("returns nothing for the degenerate (000)", () => {
    expect(planePolygonInCell([0, 0, 0], 1)).toHaveLength(0);
  });
});

describe("index formatting and parsing", () => {
  it("bars a negative index", () => {
    expect(formatIndex(-1)).toBe("1̅");
    expect(formatDirection([1, -1, 0])).toBe("[11̅0]");
  });

  it("parses a compact string with a minus sign", () => {
    expect(parseIndexTriple("(1-10)")).toEqual([1, -1, 0]);
  });

  it("parses a comma-separated string", () => {
    expect(parseIndexTriple("[1,-1,0]")).toEqual([1, -1, 0]);
  });

  it("parses its own barred output", () => {
    expect(parseIndexTriple(formatPlane([1, -1, 0]))).toEqual([1, -1, 0]);
  });

  it("rejects a string that is not three indices", () => {
    expect(parseIndexTriple("(11)")).toBeNull();
    expect(parseIndexTriple("(abc)")).toBeNull();
  });
});

describe("planar density", () => {
  const fccBasis = generateCellAtoms(CubicStructure.FACE_CENTERED)
    .filter((atom) => atom.fractionalPosition.x < 1 && atom.fractionalPosition.y < 1 && atom.fractionalPosition.z < 1)
    .map((atom) => atom.fractionalPosition);

  it("gives 2/a² on FCC (100)", () => {
    expect(planarDensity([1, 0, 0], fccBasis, 1)).toBeCloseTo(2, 6);
  });

  it("gives √2/a² on FCC (110)", () => {
    expect(planarDensity([1, 1, 0], fccBasis, 1)).toBeCloseTo(Math.SQRT2, 6);
  });

  it("gives 4/(√3·a²) on FCC (111), the densest cubic plane", () => {
    expect(planarDensity([1, 1, 1], fccBasis, 1)).toBeCloseTo(4 / Math.sqrt(3), 6);
  });
});
