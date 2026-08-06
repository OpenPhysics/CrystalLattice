/**
 * CubicCell.test.ts
 *
 * The three cubic structures' counting and packing results, checked against the
 * textbook values every solid-state course quotes. These numbers are the whole
 * point of the Cubic Systems screen, so getting one wrong would be a silent
 * pedagogical failure rather than a crash.
 */

import { Vector3 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  atomsPerCell,
  CubicStructure,
  cellEdgeIndices,
  coordinationNumber,
  generateBCC,
  generateFCC,
  generateSC,
  maximumPackingFactor,
  packingFactor,
  SiteKind,
  sharingFractionFor,
  siteKindFor,
  spheresOverlap,
  theoreticalDensity,
  touchingEdgeLength,
  touchingRadius,
} from "../src/common/model/CubicCell.js";

describe("atom sharing", () => {
  it("gives a corner atom one eighth of itself", () => {
    expect(sharingFractionFor(new Vector3(0, 0, 0))).toBe(1 / 8);
    expect(siteKindFor(new Vector3(1, 1, 1))).toBe(SiteKind.CORNER);
  });

  it("gives an edge atom one quarter", () => {
    expect(sharingFractionFor(new Vector3(0.5, 0, 0))).toBe(1 / 4);
    expect(siteKindFor(new Vector3(0.5, 0, 0))).toBe(SiteKind.EDGE);
  });

  it("gives a face atom one half", () => {
    expect(sharingFractionFor(new Vector3(0.5, 0.5, 0))).toBe(1 / 2);
    expect(siteKindFor(new Vector3(0.5, 0.5, 0))).toBe(SiteKind.FACE);
  });

  it("gives a body-centre atom all of itself", () => {
    expect(sharingFractionFor(new Vector3(0.5, 0.5, 0.5))).toBe(1);
    expect(siteKindFor(new Vector3(0.5, 0.5, 0.5))).toBe(SiteKind.BODY);
  });
});

describe("cell contents", () => {
  it("draws eight corners for simple cubic and counts one atom", () => {
    expect(generateSC()).toHaveLength(8);
    expect(atomsPerCell(CubicStructure.SIMPLE_CUBIC)).toBe(1);
  });

  it("draws nine spheres for BCC and counts two atoms", () => {
    expect(generateBCC()).toHaveLength(9);
    expect(atomsPerCell(CubicStructure.BODY_CENTERED)).toBe(2);
  });

  it("draws fourteen spheres for FCC and counts four atoms", () => {
    expect(generateFCC()).toHaveLength(14);
    expect(atomsPerCell(CubicStructure.FACE_CENTERED)).toBe(4);
  });

  it("has twelve edges on the cube", () => {
    expect(cellEdgeIndices()).toHaveLength(12);
  });
});

describe("coordination numbers", () => {
  it("matches the textbook values", () => {
    expect(coordinationNumber(CubicStructure.SIMPLE_CUBIC)).toBe(6);
    expect(coordinationNumber(CubicStructure.BODY_CENTERED)).toBe(8);
    expect(coordinationNumber(CubicStructure.FACE_CENTERED)).toBe(12);
  });
});

describe("touching radius", () => {
  it("puts SC spheres in contact along the cube edge", () => {
    expect(touchingRadius(CubicStructure.SIMPLE_CUBIC, 1)).toBeCloseTo(0.5, 10);
  });

  it("puts BCC spheres in contact along the body diagonal", () => {
    expect(touchingRadius(CubicStructure.BODY_CENTERED, 1)).toBeCloseTo(Math.sqrt(3) / 4, 10);
  });

  it("puts FCC spheres in contact along the face diagonal", () => {
    expect(touchingRadius(CubicStructure.FACE_CENTERED, 1)).toBeCloseTo(Math.SQRT2 / 4, 10);
  });

  it("round-trips through the inverse relation", () => {
    for (const structure of Object.values(CubicStructure)) {
      const radius = touchingRadius(structure, 0.36);
      expect(touchingEdgeLength(structure, radius)).toBeCloseTo(0.36, 10);
    }
  });
});

describe("atomic packing factor", () => {
  it("reaches 0.524 for simple cubic", () => {
    expect(maximumPackingFactor(CubicStructure.SIMPLE_CUBIC)).toBeCloseTo(0.5236, 4);
  });

  it("reaches 0.680 for BCC", () => {
    expect(maximumPackingFactor(CubicStructure.BODY_CENTERED)).toBeCloseTo(0.6802, 4);
  });

  it("reaches 0.740 for FCC", () => {
    expect(maximumPackingFactor(CubicStructure.FACE_CENTERED)).toBeCloseTo(0.7405, 4);
  });

  it("keeps climbing past 1 when the radius is driven past touching", () => {
    // Not clamped on purpose: the screen lets a student drag into the
    // unphysical regime, and the APF has to follow them there to make the point.
    const beyond = packingFactor(CubicStructure.FACE_CENTERED, 1, 0.5);
    expect(beyond).toBeGreaterThan(1);
    expect(spheresOverlap(CubicStructure.FACE_CENTERED, 1, 0.5)).toBe(true);
  });

  it("does not report overlap exactly at the touching radius", () => {
    const radius = touchingRadius(CubicStructure.BODY_CENTERED, 0.287);
    expect(spheresOverlap(CubicStructure.BODY_CENTERED, 0.287, radius)).toBe(false);
  });
});

describe("theoretical density", () => {
  it("reproduces iron's 7.87 g/cm³ from its BCC cell", () => {
    expect(theoreticalDensity(CubicStructure.BODY_CENTERED, 0.287, 55.845)).toBeCloseTo(7.87, 1);
  });

  it("reproduces copper's 8.96 g/cm³ from its FCC cell", () => {
    expect(theoreticalDensity(CubicStructure.FACE_CENTERED, 0.3615, 63.546)).toBeCloseTo(8.94, 1);
  });

  it("returns zero for a degenerate cell rather than dividing by zero", () => {
    expect(theoreticalDensity(CubicStructure.SIMPLE_CUBIC, 0, 100)).toBe(0);
  });
});
