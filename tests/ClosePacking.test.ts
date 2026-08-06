/**
 * ClosePacking.test.ts
 *
 * Layer stacking and its consequences. The headline assertion is that HCP and
 * FCC reach exactly the same packing fraction — if that ever stopped being true
 * the Close-Packing screen would have nothing to say.
 */

import { describe, expect, it } from "vitest";
import {
  canonicalSequence,
  classifyStacking,
  generateLayer,
  generateStack,
  hcpCoordinationNumber,
  hcpPackingFraction,
  hcpSphereRadius,
  IDEAL_C_OVER_A,
  idealInterlayerSpacing,
  jagodzinskiSymbols,
  LAYER_ORDER,
  type LayerPosition,
  layerOffset,
  MAXIMUM_PACKING_FRACTION,
  parseSequence,
  REAL_HCP_METALS,
  StackingType,
} from "../src/common/model/ClosePacking.js";

/** Parses a sequence string, failing the test if it does not parse. */
function sequence(text: string): LayerPosition[] {
  const parsed = parseSequence(text);
  expect(parsed).not.toBeNull();
  return parsed as LayerPosition[];
}

describe("layer offsets", () => {
  it("puts the A layer at the origin", () => {
    expect(layerOffset("A", 1).magnitude).toBeCloseTo(0, 10);
  });

  it("puts B at the centroid of an up triangle", () => {
    const offset = layerOffset("B", 1);
    expect(offset.x).toBeCloseTo(0.5, 10);
    expect(offset.y).toBeCloseTo(Math.sqrt(3) / 6, 10);
  });

  it("puts C at twice B's offset, so the three cycle", () => {
    const b = layerOffset("B", 1);
    const c = layerOffset("C", 1);
    expect(c.x).toBeCloseTo(2 * b.x, 10);
    expect(c.y).toBeCloseTo(2 * b.y, 10);
  });
});

describe("layer generation", () => {
  it("produces a hexagonal grid of the requested extent", () => {
    expect(generateLayer("A", 1, 0, 2)).toHaveLength(25);
  });

  it("puts every sphere in a layer at the layer's height", () => {
    for (const center of generateLayer("B", 1, 3, 1)) {
      expect(center.z).toBeCloseTo(3, 10);
    }
  });

  it("stacks layers at equal spacing", () => {
    const stack = generateStack(["A", "B", "C"], 1, 0.8, 1);
    expect(stack.map((layer) => layer.height)).toEqual([0, 0.8, 1.6]);
  });
});

describe("stacking classification", () => {
  it("calls ABAB hexagonal close packing", () => {
    expect(classifyStacking(sequence("ABAB"))).toBe(StackingType.HCP);
  });

  it("calls ABCABC cubic close packing", () => {
    expect(classifyStacking(sequence("ABCABC"))).toBe(StackingType.FCC);
  });

  it("calls the mirrored ACBACB cubic too", () => {
    expect(classifyStacking(sequence("ACBACB"))).toBe(StackingType.FCC);
  });

  it("calls ABCACB a stacking fault", () => {
    expect(classifyStacking(sequence("ABCACB"))).toBe(StackingType.MIXED);
  });

  it("rejects two adjacent layers in the same position as not close-packed", () => {
    expect(classifyStacking(sequence("AAB"))).toBe(StackingType.INVALID);
  });

  it("treats a two-layer sequence as ambiguous, since AB starts both", () => {
    expect(classifyStacking(sequence("AB"))).toBe(StackingType.MIXED);
  });

  it("marks every interior layer of an HCP stack hexagonal", () => {
    expect(jagodzinskiSymbols(sequence("ABABA")).slice(1, -1)).toEqual(["h", "h", "h"]);
  });

  it("marks every interior layer of an FCC stack cubic", () => {
    expect(jagodzinskiSymbols(sequence("ABCABC")).slice(1, -1)).toEqual(["c", "c", "c", "c"]);
  });

  it("leaves the end layers unclassified, having no environment", () => {
    const symbols = jagodzinskiSymbols(sequence("ABAB"));
    expect(symbols[0]).toBeNull();
    expect(symbols[symbols.length - 1]).toBeNull();
  });
});

describe("canonical sequences", () => {
  it("alternates two positions for HCP", () => {
    expect(canonicalSequence(StackingType.HCP, 5)).toEqual(["A", "B", "A", "B", "A"]);
  });

  it("cycles three positions for FCC", () => {
    expect(canonicalSequence(StackingType.FCC, 5)).toEqual(["A", "B", "C", "A", "B"]);
  });

  it("classifies back to the type it was generated for", () => {
    expect(classifyStacking(canonicalSequence(StackingType.HCP, 6))).toBe(StackingType.HCP);
    expect(classifyStacking(canonicalSequence(StackingType.FCC, 6))).toBe(StackingType.FCC);
  });
});

describe("sequence parsing", () => {
  it("accepts lower case and ignores spaces", () => {
    expect(parseSequence(" a b c ")).toEqual(["A", "B", "C"]);
  });

  it("rejects a letter outside A, B and C", () => {
    expect(parseSequence("ABD")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseSequence("")).toBeNull();
  });

  it("only uses the three known positions", () => {
    for (const position of parseSequence("ABCABC") ?? []) {
      expect(LAYER_ORDER).toContain(position);
    }
  });
});

describe("packing at the ideal axial ratio", () => {
  it("has c/a = √(8/3)", () => {
    expect(IDEAL_C_OVER_A).toBeCloseTo(Math.sqrt(8 / 3), 10);
  });

  it("reaches π/(3√2) — the same 0.7405 as FCC", () => {
    // This equality is the Close-Packing screen's entire argument: two
    // structures that look nothing alike pack identically well.
    expect(hcpPackingFraction(IDEAL_C_OVER_A)).toBeCloseTo(MAXIMUM_PACKING_FRACTION, 10);
    expect(MAXIMUM_PACKING_FRACTION).toBeCloseTo(0.7405, 4);
  });

  it("has twelve nearest neighbours", () => {
    expect(hcpCoordinationNumber(IDEAL_C_OVER_A)).toBe(12);
  });

  it("separates layers by a·√(2/3)", () => {
    expect(idealInterlayerSpacing(1)).toBeCloseTo(Math.sqrt(2 / 3), 10);
  });

  it("lets in-plane spheres touch at r = a/2", () => {
    expect(hcpSphereRadius(1, IDEAL_C_OVER_A)).toBeCloseTo(0.5, 10);
  });
});

describe("packing away from the ideal ratio", () => {
  it("packs worse when stretched, as zinc is", () => {
    expect(hcpPackingFraction(1.856)).toBeLessThan(MAXIMUM_PACKING_FRACTION);
  });

  it("packs worse when squashed, as titanium is", () => {
    expect(hcpPackingFraction(1.587)).toBeLessThan(MAXIMUM_PACKING_FRACTION);
  });

  it("drops to six neighbours once the two contact sets separate", () => {
    expect(hcpCoordinationNumber(1.856)).toBe(6);
    expect(hcpCoordinationNumber(1.587)).toBe(6);
  });

  it("limits the radius by the interlayer contact when squashed", () => {
    // Below the ideal ratio the layers close in before the in-plane spheres
    // touch, so the radius is no longer a/2.
    expect(hcpSphereRadius(1, 1.4)).toBeLessThan(0.5);
  });

  it("keeps the in-plane contact when stretched", () => {
    expect(hcpSphereRadius(1, 1.9)).toBeCloseTo(0.5, 10);
  });

  it("tabulates real metals that all miss the ideal ratio", () => {
    expect(REAL_HCP_METALS.length).toBeGreaterThan(0);
    for (const metal of REAL_HCP_METALS) {
      expect(metal.cOverA).toBeGreaterThan(1.5);
      expect(metal.cOverA).toBeLessThan(2);
    }
  });
});
