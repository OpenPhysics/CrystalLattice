/**
 * ClosePacking.ts
 *
 * Pure geometry for the Close-Packing screen: stacking close-packed hexagonal
 * layers, classifying the resulting sequence, and computing the quantities that
 * make FCC and HCP look different but pack identically.
 *
 * ── The three layer positions ─────────────────────────────────────────────────
 * A single close-packed layer is the 2D hexagonal lattice of the first screen,
 * with in-plane spacing a = 2r. The next layer drops into one of two sets of
 * hollows, conventionally labelled B and C:
 *
 *     A = (0, 0)                       B = (a/2, a√3/6)        C = 2·B
 *
 * B is the centroid of an "up" triangle of the A layer and C the centroid of a
 * "down" one; 3·B is a lattice vector, so the three offsets cycle A → B → C → A.
 * Stacking ABAB… gives HCP, ABCABC… gives FCC — the *only* difference is where
 * the third layer goes.
 *
 * ── c/a and the packing factor ────────────────────────────────────────────────
 * With touching spheres in-plane (r = a/2) the interlayer spacing is a·√(2/3)
 * and the HCP repeat is c = a·√(8/3) ≈ 1.633·a. Real HCP metals deviate: Mg
 * 1.624, Ti 1.587, Zn 1.856. Stretching c beyond the ideal keeps the in-plane
 * contacts and drops the coordination number from 12 to 6; squashing it below
 * the ideal makes the interlayer contacts bind first and limits the radius.
 *
 * No Scenery imports — unit-testable without a DOM.
 */

import { Vector2, Vector3 } from "scenerystack/dot";

/** The three in-plane offsets a close-packed layer can occupy. */
export const LayerPosition = {
  A: "A",
  B: "B",
  C: "C",
} as const;

export type LayerPosition = (typeof LayerPosition)[keyof typeof LayerPosition];

/** Ordered so `LAYER_ORDER[(index + 1) % 3]` is the "next" hollow. */
export const LAYER_ORDER: readonly LayerPosition[] = [LayerPosition.A, LayerPosition.B, LayerPosition.C];

/** How a stacking sequence is classified. */
export const StackingType = {
  /** ABAB… — every layer is a "hexagonal" (h) site. */
  HCP: "hcp",
  /** ABCABC… (or its mirror ACBACB…) — every layer is a "cubic" (c) site. */
  FCC: "fcc",
  /** A legal but mixed sequence: neither pure h nor pure c. */
  MIXED: "mixed",
  /** Two adjacent layers in the same position — not close-packed at all. */
  INVALID: "invalid",
} as const;

export type StackingType = (typeof StackingType)[keyof typeof StackingType];

/** The ideal hard-sphere axial ratio, c/a = √(8/3) ≈ 1.633. */
export const IDEAL_C_OVER_A = Math.sqrt(8 / 3);

/** The maximum packing fraction in three dimensions, π/(3√2) ≈ 0.7405. */
export const MAXIMUM_PACKING_FRACTION = Math.PI / (3 * Math.SQRT2);

/** Measured c/a for real HCP metals, for the "compare to real crystals" table. */
export const REAL_HCP_METALS: ReadonlyArray<{ readonly symbol: string; readonly cOverA: number }> = [
  { symbol: "Be", cOverA: 1.568 },
  { symbol: "Ti", cOverA: 1.587 },
  { symbol: "Mg", cOverA: 1.624 },
  { symbol: "Co", cOverA: 1.623 },
  { symbol: "Zn", cOverA: 1.856 },
  { symbol: "Cd", cOverA: 1.886 },
];

/**
 * The in-plane offset of a layer position, in units where the in-plane lattice
 * constant is `a`.
 */
export function layerOffset(position: LayerPosition, a: number): Vector2 {
  const index = LAYER_ORDER.indexOf(position);
  const base = new Vector2(a / 2, (a * Math.sqrt(3)) / 6);
  return base.timesScalar(index);
}

/**
 * Generates one close-packed layer: a 2D hexagonal lattice of sphere centres,
 * offset to the given layer position and raised to the given height.
 *
 * @param position - A, B or C
 * @param a - in-plane lattice constant (= 2r for touching spheres)
 * @param height - z coordinate of the layer
 * @param range - generate |n₁|, |n₂| ≤ range cells around the origin
 */
export function generateLayer(position: LayerPosition, a: number, height: number, range: number): Vector3[] {
  const v1 = new Vector2(a, 0);
  const v2 = new Vector2(a / 2, (a * Math.sqrt(3)) / 2);
  const offset = layerOffset(position, a);
  const centers: Vector3[] = [];

  for (let n2 = -range; n2 <= range; n2++) {
    for (let n1 = -range; n1 <= range; n1++) {
      centers.push(new Vector3(n1 * v1.x + n2 * v2.x + offset.x, n1 * v1.y + n2 * v2.y + offset.y, height));
    }
  }
  return centers;
}

/** One layer of a built stack: its position label, its height and its spheres. */
export type StackedLayer = {
  /** Index from the bottom of the stack, starting at 0. */
  readonly index: number;
  /** Which hollow the layer occupies. */
  readonly position: LayerPosition;
  /** Height of the layer's centres above the bottom layer. */
  readonly height: number;
  /** Sphere centres in model units. */
  readonly centers: readonly Vector3[];
};

/**
 * Builds a stack from an explicit sequence of layer positions.
 *
 * @param sequence - e.g. ["A","B","A","B"] for HCP or ["A","B","C"] for FCC
 * @param a - in-plane lattice constant
 * @param interlayerSpacing - vertical distance between consecutive layers
 * @param range - lateral extent of each layer
 */
export function generateStack(
  sequence: readonly LayerPosition[],
  a: number,
  interlayerSpacing: number,
  range: number,
): StackedLayer[] {
  return sequence.map((position, index) => {
    const height = index * interlayerSpacing;
    return { index, position, height, centers: generateLayer(position, a, height, range) };
  });
}

/** The canonical repeating sequence for a stacking type, extended to `layerCount` layers. */
export function canonicalSequence(type: "hcp" | "fcc", layerCount: number): LayerPosition[] {
  const period = type === StackingType.HCP ? 2 : 3;
  return Array.from({ length: layerCount }, (_unused, index) => {
    // biome-ignore lint/style/noNonNullAssertion: modular index always lands in LAYER_ORDER
    return LAYER_ORDER[index % period]!;
  });
}

/**
 * Parses a typed stacking sequence such as "ABCACB" into layer positions.
 * Whitespace is ignored and letters are case-insensitive; any other character
 * makes the whole string invalid.
 */
export function parseSequence(text: string): LayerPosition[] | null {
  const cleaned = text.replace(/\s+/g, "").toUpperCase();
  if (cleaned.length === 0) {
    return null;
  }
  const positions: LayerPosition[] = [];
  for (const character of cleaned) {
    if (character !== "A" && character !== "B" && character !== "C") {
      return null;
    }
    positions.push(character);
  }
  return positions;
}

/**
 * Classifies a stacking sequence using the Jagodzinski construction: look at
 * each interior layer's two neighbours. If the step into the layer equals the
 * step out of it the layer is "cubic" (c); otherwise it is "hexagonal" (h).
 * All-c is FCC, all-h is HCP, and anything else is a stacking fault.
 *
 * A sequence with two adjacent layers in the same position is not close-packed
 * — those spheres would sit directly on top of each other — so it is INVALID.
 */
export function classifyStacking(sequence: readonly LayerPosition[]): StackingType {
  if (sequence.length < 2) {
    return StackingType.INVALID;
  }

  const steps: number[] = [];
  for (let i = 0; i < sequence.length - 1; i++) {
    // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loop
    const from = LAYER_ORDER.indexOf(sequence[i]!);
    // biome-ignore lint/style/noNonNullAssertion: indices are bounded by the loop
    const to = LAYER_ORDER.indexOf(sequence[i + 1]!);
    const step = (to - from + 3) % 3;
    if (step === 0) {
      return StackingType.INVALID;
    }
    steps.push(step);
  }

  // Two layers are ambiguous — AB is the start of both HCP and FCC.
  if (steps.length < 2) {
    return StackingType.MIXED;
  }

  const allSame = steps.every((step) => step === steps[0]);
  if (allSame) {
    return StackingType.FCC;
  }

  const alternating = steps.every((step, index) => step === (index % 2 === 0 ? steps[0] : 3 - (steps[0] ?? 0)));
  return alternating ? StackingType.HCP : StackingType.MIXED;
}

/**
 * Per-layer Jagodzinski symbols: "c" where the layer sits in a locally cubic
 * environment, "h" where it is locally hexagonal, and null for the two end
 * layers, which have no environment on one side.
 */
export function jagodzinskiSymbols(sequence: readonly LayerPosition[]): Array<"h" | "c" | null> {
  return sequence.map((_position, index) => {
    if (index === 0 || index === sequence.length - 1) {
      return null;
    }
    // biome-ignore lint/style/noNonNullAssertion: interior indices always have neighbours
    const previous = LAYER_ORDER.indexOf(sequence[index - 1]!);
    // biome-ignore lint/style/noNonNullAssertion: interior indices always have neighbours
    const next = LAYER_ORDER.indexOf(sequence[index + 1]!);
    return previous === next ? "h" : "c";
  });
}

/**
 * The sphere radius admitted by a hexagonal cell of in-plane constant `a` and
 * axial ratio c/a. Spheres touch in-plane at r = a/2 unless c/a is squashed
 * below ideal, in which case the interlayer contact binds first at
 * r = ½·√(a²/3 + c²/4).
 */
export function hcpSphereRadius(a: number, cOverA: number): number {
  const c = a * cOverA;
  const interlayerContact = Math.sqrt(a ** 2 / 3 + c ** 2 / 4);
  return Math.min(a, interlayerContact) / 2;
}

/**
 * Packing fraction of a hexagonal close-packed cell at axial ratio c/a. The
 * primitive cell has volume (√3/2)·a²·c and holds two atoms, so at the ideal
 * ratio this returns π/(3√2) — exactly the FCC value.
 */
export function hcpPackingFraction(cOverA: number): number {
  const a = 1;
  const c = cOverA;
  const radius = hcpSphereRadius(a, cOverA);
  const cellVolume = (Math.sqrt(3) / 2) * a * a * c;
  return (2 * (4 / 3) * Math.PI * radius ** 3) / cellVolume;
}

/**
 * Coordination number of an HCP cell at axial ratio c/a: 12 at the ideal ratio,
 * where in-plane and interlayer contacts coincide; 6 in-plane neighbours when
 * stretched; 6 interlayer neighbours (3 above, 3 below) when squashed.
 */
export function hcpCoordinationNumber(cOverA: number, tolerance = 1e-3): number {
  if (Math.abs(cOverA - IDEAL_C_OVER_A) <= tolerance) {
    return 12;
  }
  return 6;
}

/** Interlayer spacing for an HCP stack: half the c repeat. */
export function hcpInterlayerSpacing(a: number, cOverA: number): number {
  return (a * cOverA) / 2;
}

/** Interlayer spacing for ideal close packing (both FCC and ideal HCP): a·√(2/3). */
export function idealInterlayerSpacing(a: number): number {
  return a * Math.sqrt(2 / 3);
}
