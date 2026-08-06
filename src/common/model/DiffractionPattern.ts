/**
 * DiffractionPattern.ts
 *
 * The physics payoff of the Aperiodic Order screen: the 2D diffraction pattern
 * of an arbitrary point set,
 *
 *     I(k) = | Σⱼ exp( i k·rⱼ ) |²
 *
 * evaluated directly on a k-space grid.
 *
 * ── Why a direct sum and not an FFT ───────────────────────────────────────────
 * An FFT assumes the input is sampled on a regular grid. A Penrose vertex set
 * is by construction *not* on a regular grid, so the direct sum is the correct
 * tool here rather than a slow fallback. For the few hundred to few thousand
 * points a handful of inflation steps produces, and a 128×128 k-grid, the cost
 * is a few tens of millions of trig evaluations — fine on the main thread, but
 * see {@link MAX_RECOMMENDED_POINTS} for the cap the UI enforces.
 *
 * ── What it shows ─────────────────────────────────────────────────────────────
 * A periodic lattice gives sharp peaks on a periodic reciprocal lattice. A
 * Penrose tiling gives peaks that are *also* sharp — the signature of long-range
 * order — but arranged with 10-fold symmetry, which the crystallographic
 * restriction theorem forbids for any periodic 2D lattice. That combination is
 * exactly what Shechtman measured in 1982 and what the 2011 Nobel Prize in
 * Chemistry was awarded for.
 *
 * No Scenery imports — unit-testable without a DOM.
 */

import { Vector2 } from "scenerystack/dot";

/**
 * Point count past which the direct sum starts costing visible frames. The
 * Aperiodic Order screen disables further inflation at this threshold rather
 * than letting the frame rate quietly fall off a cliff.
 */
export const MAX_RECOMMENDED_POINTS = 2000;

/** A computed diffraction pattern on a square k-space grid. */
export type DiffractionResult = {
  /**
   * Intensities in row-major order, `resolution × resolution` entries.
   * Normalized so the largest value is 1 (the k = 0 forward peak, unless it is
   * excluded by the k range).
   */
  readonly intensities: Float32Array;
  /** Grid size along each axis. */
  readonly resolution: number;
  /** Half-width of the sampled k range; the grid spans [−kRange, +kRange]². */
  readonly kRange: number;
  /** The un-normalized peak intensity, i.e. the value that maps to 1. */
  readonly peakIntensity: number;
};

/**
 * Radius, as a fraction of `kRange`, of the disc around k = 0 excluded from
 * peak-finding and from the normalization.
 *
 * Every scatterer is in phase at k = 0, so the forward peak is N² — orders of
 * magnitude above the Bragg peaks of a finite patch. Normalizing against it
 * would push every informative peak to a few thousandths and make the pattern
 * look empty, so it is excluded and the brightest *diffracted* peak sets the
 * scale instead. (This is also what a real diffraction experiment does, with a
 * beam stop.)
 */
export const FORWARD_PEAK_EXCLUSION = 0.04;

/**
 * Computes the diffraction intensity of a point set on a square k-grid.
 *
 * @param points - scatterer positions in real space
 * @param kRange - the grid spans [−kRange, kRange] in both kₓ and k_y
 * @param resolution - samples per axis (128 is the screen's default)
 * @returns normalized intensities plus the grid metadata needed to render them
 */
export function computeDiffraction(points: readonly Vector2[], kRange: number, resolution: number): DiffractionResult {
  const intensities = new Float32Array(resolution * resolution);

  if (points.length === 0 || resolution <= 0) {
    return { intensities, resolution, kRange, peakIntensity: 0 };
  }

  // Flatten the coordinates once; the inner loop runs resolution² × points
  // times, so avoiding property lookups on Vector2 there is worth the copy.
  const xs = new Float64Array(points.length);
  const ys = new Float64Array(points.length);
  for (let i = 0; i < points.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: index is bounded by points.length
    xs[i] = points[i]!.x;
    // biome-ignore lint/style/noNonNullAssertion: index is bounded by points.length
    ys[i] = points[i]!.y;
  }

  const step = resolution > 1 ? (2 * kRange) / (resolution - 1) : 0;
  const exclusionRadiusSquared = (FORWARD_PEAK_EXCLUSION * kRange) ** 2;
  let peak = 0;

  for (let row = 0; row < resolution; row++) {
    const ky = -kRange + row * step;
    for (let column = 0; column < resolution; column++) {
      const kx = -kRange + column * step;

      let real = 0;
      let imaginary = 0;
      for (let i = 0; i < xs.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: typed-array reads are always defined
        const phase = kx * xs[i]! + ky * ys[i]!;
        real += Math.cos(phase);
        imaginary += Math.sin(phase);
      }

      const intensity = real * real + imaginary * imaginary;
      intensities[row * resolution + column] = intensity;
      // The forward peak sets no scale — see FORWARD_PEAK_EXCLUSION.
      if (intensity > peak && kx * kx + ky * ky > exclusionRadiusSquared) {
        peak = intensity;
      }
    }
  }

  if (peak > 0) {
    for (let i = 0; i < intensities.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: typed-array reads are always defined
      intensities[i] = Math.min(1, intensities[i]! / peak);
    }
  }

  return { intensities, resolution, kRange, peakIntensity: peak };
}

/** Reads one grid cell's normalized intensity. Returns 0 outside the grid. */
export function intensityAt(result: DiffractionResult, column: number, row: number): number {
  if (column < 0 || row < 0 || column >= result.resolution || row >= result.resolution) {
    return 0;
  }
  return result.intensities[row * result.resolution + column] ?? 0;
}

/** The k-space coordinate of a grid cell's centre. */
export function kVectorAt(result: DiffractionResult, column: number, row: number): Vector2 {
  const step = result.resolution > 1 ? (2 * result.kRange) / (result.resolution - 1) : 0;
  return new Vector2(-result.kRange + column * step, -result.kRange + row * step);
}

/** A located Bragg peak: where it is in k-space and how strong it is. */
export type DiffractionPeak = {
  readonly k: Vector2;
  /** Normalized intensity on [0, 1]. */
  readonly intensity: number;
};

/**
 * Finds the significant Bragg peaks: grid cells that are strict local maxima in
 * their 3×3 neighbourhood and brighter than `threshold`. Returned brightest
 * first, which is the order the symmetry measurement wants.
 */
export function findPeaks(result: DiffractionResult, threshold = 0.02, maximumCount = 200): DiffractionPeak[] {
  const peaks: DiffractionPeak[] = [];
  const exclusionRadius = FORWARD_PEAK_EXCLUSION * result.kRange;

  for (let row = 1; row < result.resolution - 1; row++) {
    for (let column = 1; column < result.resolution - 1; column++) {
      const intensity = intensityAt(result, column, row);
      const k = kVectorAt(result, column, row);
      // Skip dim cells and anything behind the beam stop before the 3×3 scan.
      if (intensity >= threshold && k.magnitude > exclusionRadius && isLocalMaximum(result, column, row, intensity)) {
        peaks.push({ k, intensity });
      }
    }
  }

  return peaks.sort((a, b) => b.intensity - a.intensity).slice(0, maximumCount);
}

/** Whether the cell is at least as bright as all eight of its neighbours. */
function isLocalMaximum(result: DiffractionResult, column: number, row: number, intensity: number): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if ((dr !== 0 || dc !== 0) && intensityAt(result, column + dc, row + dr) > intensity) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Measures the rotational symmetry order of a peak set: the largest n ≤ `maxOrder`
 * for which rotating every peak by 2π/n about the origin maps the set onto
 * itself. A square lattice returns 4, a hexagonal one 6, and a Penrose tiling
 * returns 10 — an order the crystallographic restriction theorem rules out for
 * any periodic lattice, which is the whole point of the screen.
 *
 * @param peaks - peaks to test, typically the brightest few dozen
 * @param toleranceFraction - positional tolerance as a fraction of the peak radius
 * @param maxOrder - highest symmetry order to test
 */
export function measureSymmetryOrder(
  peaks: readonly DiffractionPeak[],
  kRange: number,
  toleranceFraction = 0.06,
  maxOrder = 12,
): number {
  // The forward peak sits at the rotation centre and is invariant under every
  // rotation, so it carries no information about the order.
  const offCenter = peaks.filter((peak) => peak.k.magnitude > 1e-9);
  if (offCenter.length < 2) {
    return 1;
  }

  // Only peaks well inside the sampled window can be tested: a peak near the
  // edge rotates to a k the grid never sampled, so its partner is missing for
  // reasons that have nothing to do with the tiling's symmetry.
  const testRadius = 0.7 * kRange;
  const testable = offCenter.filter((peak) => peak.k.magnitude <= testRadius);
  if (testable.length < 2) {
    return 1;
  }

  const tolerance = toleranceFraction * kRange;

  let best = 1;
  for (let order = 2; order <= maxOrder; order++) {
    const angle = (2 * Math.PI) / order;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const mapsOntoItself = testable.every((peak) => {
      const rotated = new Vector2(peak.k.x * cos - peak.k.y * sin, peak.k.x * sin + peak.k.y * cos);
      return offCenter.some((other) => other.k.distance(rotated) <= tolerance);
    });

    if (mapsOntoItself) {
      best = order;
    }
  }
  return best;
}

/**
 * Keeps only the points within `radius` of the centroid. A finite patch's
 * *shape* shows up in its diffraction pattern, so trimming a tiling to a disc
 * before transforming keeps the pattern isotropic and stops the patch outline
 * from masquerading as a property of the tiling.
 */
export function circularSubset(points: readonly Vector2[], radius: number): Vector2[] {
  if (points.length === 0) {
    return [];
  }
  const centroid = points.reduce((sum, point) => sum.plus(point), new Vector2(0, 0)).timesScalar(1 / points.length);
  return points.filter((point) => point.distance(centroid) <= radius);
}

/**
 * Convenience: the k range that resolves a point set's finest real-space
 * spacing. Sampling out to a few reciprocal-lattice periods keeps the first few
 * orders of Bragg peaks in frame, which is what makes the symmetry visible.
 *
 * @param nearestNeighborDistance - the shortest distance between points
 * @param periods - how many reciprocal periods to span
 */
export function suggestedKRange(nearestNeighborDistance: number, periods = 3): number {
  return nearestNeighborDistance > 0 ? (periods * 2 * Math.PI) / nearestNeighborDistance : 1;
}
