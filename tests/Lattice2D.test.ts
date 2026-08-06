/**
 * Lattice2D.test.ts
 *
 * Classification of the five 2D Bravais lattices, the coordination counts that
 * go with them, and the Wigner–Seitz construction.
 *
 * The classification tolerances matter as much as the classification itself:
 * the screen is built so a student *finds* the square lattice by dragging, and
 * a target with no width would make that impossible.
 */

import { describe, expect, it } from "vitest";
import {
  arealDensity,
  arealPackingFraction,
  cellArea,
  classifyLattice,
  firstCoordinationShell,
  generateCenteringPoints,
  generateLatticePoints,
  type Lattice2DParameters,
  Lattice2DType,
  primitiveCellCorners,
  snapParametersFor,
  wignerSeitzBisectors,
  wignerSeitzCell,
} from "../src/common/model/Lattice2D.js";

const degrees = (value: number): number => (value * Math.PI) / 180;

const SQUARE: Lattice2DParameters = { a1: 1, a2: 1, gamma: degrees(90) };
const HEXAGONAL: Lattice2DParameters = { a1: 1, a2: 1, gamma: degrees(120) };
const RECTANGULAR: Lattice2DParameters = { a1: 1, a2: 1.5, gamma: degrees(90) };
const OBLIQUE: Lattice2DParameters = { a1: 1, a2: 1.4, gamma: degrees(70) };

describe("classification", () => {
  it("recognizes the square lattice", () => {
    expect(classifyLattice(SQUARE)).toBe(Lattice2DType.SQUARE);
  });

  it("recognizes the hexagonal lattice at 120°", () => {
    expect(classifyLattice(HEXAGONAL)).toBe(Lattice2DType.HEXAGONAL);
  });

  it("also recognizes the hexagonal lattice at its supplementary 60°", () => {
    expect(classifyLattice({ a1: 1, a2: 1, gamma: degrees(60) })).toBe(Lattice2DType.HEXAGONAL);
  });

  it("recognizes the rectangular lattice", () => {
    expect(classifyLattice(RECTANGULAR)).toBe(Lattice2DType.RECTANGULAR);
  });

  it("calls a rectangular cell with a centred basis centred rectangular", () => {
    expect(classifyLattice({ ...RECTANGULAR, centered: true })).toBe(Lattice2DType.CENTERED_RECTANGULAR);
  });

  it("calls a rhombic cell centred rectangular, since that is what it is", () => {
    // A rhombic primitive cell and a centred rectangular cell describe the same
    // lattice — one of the equivalences the screen exists to reveal.
    expect(classifyLattice({ a1: 1, a2: 1, gamma: degrees(100) })).toBe(Lattice2DType.CENTERED_RECTANGULAR);
  });

  it("falls back to oblique for the general case", () => {
    expect(classifyLattice(OBLIQUE)).toBe(Lattice2DType.OBLIQUE);
  });

  it("keeps calling it square just inside the tolerance band", () => {
    expect(classifyLattice({ a1: 1, a2: 1.01, gamma: degrees(90.5) })).toBe(Lattice2DType.SQUARE);
  });

  it("stops calling it square well outside the tolerance band", () => {
    expect(classifyLattice({ a1: 1, a2: 1.2, gamma: degrees(90) })).toBe(Lattice2DType.RECTANGULAR);
  });

  it("classifies each snap target as the type it snapped to", () => {
    for (const type of Object.values(Lattice2DType)) {
      expect(classifyLattice(snapParametersFor(type, 0.3))).toBe(type);
    }
  });
});

describe("cell geometry", () => {
  it("gives unit area for the unit square", () => {
    expect(cellArea(SQUARE)).toBeCloseTo(1, 10);
  });

  it("gives a₁·a₂·sin γ in general", () => {
    expect(cellArea(OBLIQUE)).toBeCloseTo(1 * 1.4 * Math.sin(degrees(70)), 10);
  });

  it("draws the primitive cell as a four-cornered parallelogram", () => {
    expect(primitiveCellCorners(SQUARE)).toHaveLength(4);
  });

  it("divides atoms per cell by the area for the areal density", () => {
    expect(arealDensity(SQUARE, 1)).toBeCloseTo(1, 10);
    expect(arealDensity(SQUARE, 2)).toBeCloseTo(2, 10);
  });
});

describe("lattice generation", () => {
  it("produces (2n+1)² points over the requested range", () => {
    expect(generateLatticePoints(SQUARE, 2)).toHaveLength(25);
  });

  it("produces one centring point per cell", () => {
    expect(generateCenteringPoints(SQUARE, 2)).toHaveLength(25);
  });

  it("places a centring point at the cell centre", () => {
    const centers = generateCenteringPoints(SQUARE, 0);
    expect(centers[0]?.x).toBeCloseTo(0.5, 10);
    expect(centers[0]?.y).toBeCloseTo(0.5, 10);
  });
});

describe("coordination shell", () => {
  it("finds four nearest neighbours on the square lattice", () => {
    expect(firstCoordinationShell(SQUARE).count).toBe(4);
  });

  it("finds six on the hexagonal lattice", () => {
    expect(firstCoordinationShell(HEXAGONAL).count).toBe(6);
  });

  it("finds two on a general oblique lattice", () => {
    expect(firstCoordinationShell(OBLIQUE).count).toBe(2);
  });

  it("reports the nearest-neighbour distance", () => {
    expect(firstCoordinationShell(SQUARE).distance).toBeCloseTo(1, 10);
  });
});

describe("areal packing fraction", () => {
  it("gives π/4 for the square lattice", () => {
    expect(arealPackingFraction(SQUARE)).toBeCloseTo(Math.PI / 4, 6);
  });

  it("gives π/(2√3) for the hexagonal lattice — the 2D maximum", () => {
    expect(arealPackingFraction(HEXAGONAL)).toBeCloseTo(Math.PI / (2 * Math.sqrt(3)), 6);
  });

  it("never exceeds the hexagonal maximum", () => {
    const maximum = Math.PI / (2 * Math.sqrt(3));
    for (const parameters of [SQUARE, HEXAGONAL, RECTANGULAR, OBLIQUE]) {
      expect(arealPackingFraction(parameters)).toBeLessThanOrEqual(maximum + 1e-9);
    }
  });
});

describe("Wigner–Seitz cell", () => {
  it("is a square for the square lattice", () => {
    expect(wignerSeitzCell(SQUARE)).toHaveLength(4);
  });

  it("is a hexagon for the hexagonal lattice", () => {
    expect(wignerSeitzCell(HEXAGONAL)).toHaveLength(6);
  });

  it("has the same area as the primitive cell", () => {
    // The Wigner–Seitz cell is a different shape but the same area — it is
    // still one cell's worth of the plane.
    for (const parameters of [SQUARE, HEXAGONAL, RECTANGULAR, OBLIQUE]) {
      expect(polygonArea(wignerSeitzCell(parameters))).toBeCloseTo(cellArea(parameters), 6);
    }
  });

  it("is centred on the origin", () => {
    for (const vertex of wignerSeitzCell(HEXAGONAL)) {
      expect(vertex.magnitude).toBeLessThan(1);
    }
  });

  it("reports one contributing bisector per edge", () => {
    expect(wignerSeitzBisectors(SQUARE)).toHaveLength(4);
    expect(wignerSeitzBisectors(HEXAGONAL)).toHaveLength(6);
  });

  it("puts each bisector's midpoint halfway to its neighbour", () => {
    for (const { neighbor, midpoint } of wignerSeitzBisectors(SQUARE)) {
      expect(midpoint.x).toBeCloseTo(neighbor.x / 2, 10);
      expect(midpoint.y).toBeCloseTo(neighbor.y / 2, 10);
    }
  });
});

/** Shoelace area of a simple polygon. */
function polygonArea(vertices: ReadonlyArray<{ x: number; y: number }>): number {
  let sum = 0;
  for (let i = 0; i < vertices.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: index is bounded by the loop
    const current = vertices[i]!;
    // biome-ignore lint/style/noNonNullAssertion: modular index stays in range
    const next = vertices[(i + 1) % vertices.length]!;
    sum += current.x * next.y - next.x * current.y;
  }
  return Math.abs(sum) / 2;
}
