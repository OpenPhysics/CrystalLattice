/**
 * AperiodicOrderModel.ts
 *
 * State for the Aperiodic Order screen — the one that takes back the assumption
 * every earlier screen relied on.
 *
 * Three modes share one pipeline: whatever is on screen (a Penrose tiling, a
 * patch of hat tiles, or an ordinary periodic lattice for contrast) becomes a
 * point set, and that point set goes through the same discrete Fourier
 * transform. Running all three through identical code is what makes the
 * comparison mean something: the Penrose pattern's peaks are just as sharp as
 * the lattice's, and the only difference is their symmetry.
 *
 * The diffraction transform is the expensive part — a direct sum over every
 * scatterer for every k-grid point — so it is recomputed only when the tiling
 * actually changes, never on a redraw.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range, Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  DIFFRACTION_PATCH_FRACTION,
  DIFFRACTION_PEAK_THRESHOLD,
  DIFFRACTION_PERIODS,
  DIFFRACTION_RESOLUTION,
  MAX_HAT_STEPS,
  MAX_INFLATION_STEPS,
  MIN_INFLATION_STEPS,
} from "../../CrystalLatticeConstants.js";
import {
  circularSubset,
  computeDiffraction,
  type DiffractionResult,
  findPeaks,
  MAX_RECOMMENDED_POINTS,
  measureSymmetryOrder,
  suggestedKRange,
} from "../../common/model/DiffractionPattern.js";
import {
  countHats,
  generateHatPatch,
  type HatCounts,
  hatPatchVertices,
  type PlacedHat,
} from "../../common/model/EinsteinTiling.js";
import {
  countTiles,
  edgeLengthAfter,
  generatePenroseTiling,
  mergeIntoRhombi,
  type PenroseRhombus,
  type TileCounts,
  tilingVertices,
} from "../../common/model/PenroseTiling.js";

/** Which structure is on screen. */
export const TilingMode = {
  /** Two tiles, matching rules, five-fold local symmetry. */
  PENROSE: "penrose",
  /** One tile, no periodicity ever. */
  EINSTEIN: "einstein",
  /** An ordinary square lattice, for contrast. */
  PERIODIC: "periodic",
} as const;

export type TilingMode = (typeof TilingMode)[keyof typeof TilingMode];

/** Slider range for the Penrose inflation depth. */
export const INFLATION_RANGE = new Range(MIN_INFLATION_STEPS, MAX_INFLATION_STEPS);

/** Slider range for the hat substitution depth. */
export const HAT_STEPS_RANGE = new Range(0, MAX_HAT_STEPS);

/** Radius of the periodic-lattice patch, in the same units as a Penrose seed. */
const PERIODIC_PATCH_RADIUS = 0.5;

/** Spacing of the comparison lattice, chosen to give a comparable point count. */
const PERIODIC_SPACING = 0.05;

export class AperiodicOrderModel implements TModel {
  /** Penrose tiles, the einstein tile, or a periodic lattice. */
  public readonly modeProperty: Property<TilingMode>;

  /** How many times the Penrose substitution has been applied. */
  public readonly inflationStepsProperty: NumberProperty;

  /** How many times the hat metatile substitution has been applied. */
  public readonly hatStepsProperty: NumberProperty;

  /** Whether to highlight the five directions the Penrose tile edges take. */
  public readonly highlightOrientationsProperty: BooleanProperty;

  /** Whether to colour each hat by the metatile cluster it belongs to. */
  public readonly showMetatilesProperty: BooleanProperty;

  /** Whether to mark the reflected hats — the copies the spectre makes unnecessary. */
  public readonly showReflectedProperty: BooleanProperty;

  /** Whether to show a periodic lattice's pattern next to the current one. */
  public readonly compareLatticeProperty: BooleanProperty;

  /** The Penrose rhombi, when in Penrose mode. */
  public readonly rhombiProperty: TReadOnlyProperty<readonly PenroseRhombus[]>;

  /** The hat patch, when in einstein mode. */
  public readonly hatsProperty: TReadOnlyProperty<readonly PlacedHat[]>;

  /** Rhombus counts and the thick:thin ratio that converges to φ. */
  public readonly tileCountsProperty: TReadOnlyProperty<TileCounts>;

  /** Hat counts, split by chirality. */
  public readonly hatCountsProperty: TReadOnlyProperty<HatCounts>;

  /** The scatterers fed to the transform, trimmed to a disc. */
  public readonly scatterersProperty: TReadOnlyProperty<readonly Vector2[]>;

  /** The diffraction pattern of whatever is on screen. */
  public readonly diffractionProperty: TReadOnlyProperty<DiffractionResult>;

  /** The diffraction pattern of the periodic comparison lattice. */
  public readonly comparisonDiffractionProperty: TReadOnlyProperty<DiffractionResult>;

  /** The measured rotational symmetry order of the current pattern. */
  public readonly symmetryOrderProperty: TReadOnlyProperty<number>;

  /** How many Bragg peaks the pattern shows. */
  public readonly peakCountProperty: TReadOnlyProperty<number>;

  /** Whether the point count has outgrown the live transform's budget. */
  public readonly tooManyPointsProperty: TReadOnlyProperty<boolean>;

  public constructor() {
    this.modeProperty = new Property<TilingMode>(TilingMode.PENROSE);
    this.inflationStepsProperty = new NumberProperty(5, { range: INFLATION_RANGE });
    this.hatStepsProperty = new NumberProperty(2, { range: HAT_STEPS_RANGE });
    this.highlightOrientationsProperty = new BooleanProperty(false);
    this.showMetatilesProperty = new BooleanProperty(true);
    this.showReflectedProperty = new BooleanProperty(false);
    this.compareLatticeProperty = new BooleanProperty(true);

    this.rhombiProperty = new DerivedProperty([this.inflationStepsProperty], (steps) =>
      mergeIntoRhombi(generatePenroseTiling(steps)),
    );
    this.hatsProperty = new DerivedProperty([this.hatStepsProperty], (steps) => generateHatPatch(steps));

    this.tileCountsProperty = new DerivedProperty([this.rhombiProperty], countTiles);
    this.hatCountsProperty = new DerivedProperty([this.hatsProperty], countHats);

    this.scatterersProperty = new DerivedProperty(
      [this.modeProperty, this.rhombiProperty, this.hatsProperty],
      (mode, rhombi, hats): readonly Vector2[] => {
        // A finite patch's *outline* shows up in its transform, so every mode
        // trims to a disc: the pattern should report the tiling, not the shape
        // of the piece that happened to be generated. The radius is a fraction
        // of the patch's own extent, so the point count grows with each
        // substitution instead of staying pinned to an absolute size.
        if (mode === TilingMode.PENROSE) {
          const vertices = tilingVertices(rhombi);
          return circularSubset(vertices, patchRadius(vertices) * DIFFRACTION_PATCH_FRACTION);
        }
        if (mode === TilingMode.EINSTEIN) {
          const vertices = hatPatchVertices(hats);
          return circularSubset(vertices, patchRadius(vertices) * DIFFRACTION_PATCH_FRACTION);
        }
        return periodicLatticePoints();
      },
    );

    this.diffractionProperty = new DerivedProperty(
      [this.scatterersProperty, this.modeProperty, this.inflationStepsProperty, this.hatStepsProperty],
      (points, mode, steps) => computeDiffraction(points, kRangeFor(mode, steps), DIFFRACTION_RESOLUTION),
    );

    this.comparisonDiffractionProperty = new DerivedProperty([this.compareLatticeProperty], (compare) =>
      compare
        ? computeDiffraction(periodicLatticePoints(), periodicKRange(), DIFFRACTION_RESOLUTION)
        : computeDiffraction([], 1, 1),
    );

    const peaksProperty = new DerivedProperty([this.diffractionProperty], (result) =>
      findPeaks(result, DIFFRACTION_PEAK_THRESHOLD),
    );
    this.peakCountProperty = new DerivedProperty([peaksProperty], (peaks) => peaks.length);
    this.symmetryOrderProperty = new DerivedProperty([peaksProperty, this.diffractionProperty], (peaks, result) =>
      measureSymmetryOrder(peaks, result.kRange),
    );

    this.tooManyPointsProperty = new DerivedProperty(
      [this.scatterersProperty],
      (points) => points.length > MAX_RECOMMENDED_POINTS,
    );
  }

  /** Applies one more substitution step to whichever tiling is on screen. */
  public inflate(): void {
    if (this.modeProperty.value === TilingMode.EINSTEIN) {
      this.hatStepsProperty.value = HAT_STEPS_RANGE.constrainValue(this.hatStepsProperty.value + 1);
    } else {
      this.inflationStepsProperty.value = INFLATION_RANGE.constrainValue(this.inflationStepsProperty.value + 1);
    }
  }

  /** Steps back to the previous, coarser tiling. */
  public deflate(): void {
    if (this.modeProperty.value === TilingMode.EINSTEIN) {
      this.hatStepsProperty.value = HAT_STEPS_RANGE.constrainValue(this.hatStepsProperty.value - 1);
    } else {
      this.inflationStepsProperty.value = INFLATION_RANGE.constrainValue(this.inflationStepsProperty.value - 1);
    }
  }

  /** Whether another substitution step is available in the current mode. */
  public canInflate(): boolean {
    return this.modeProperty.value === TilingMode.EINSTEIN
      ? this.hatStepsProperty.value < HAT_STEPS_RANGE.max
      : this.inflationStepsProperty.value < INFLATION_RANGE.max;
  }

  public reset(): void {
    this.modeProperty.reset();
    this.inflationStepsProperty.reset();
    this.hatStepsProperty.reset();
    this.highlightOrientationsProperty.reset();
    this.showMetatilesProperty.reset();
    this.showReflectedProperty.reset();
    this.compareLatticeProperty.reset();
  }

  /** The tilings are static; nothing advances with time. */
  public step(_dt: number): void {
    // Intentionally empty — this screen has no time-dependent state.
  }
}

/** The square lattice used for the periodic comparison. */
function periodicLatticePoints(): Vector2[] {
  const points: Vector2[] = [];
  const count = Math.ceil(PERIODIC_PATCH_RADIUS / PERIODIC_SPACING);

  for (let i = -count; i <= count; i++) {
    for (let j = -count; j <= count; j++) {
      points.push(new Vector2(i * PERIODIC_SPACING, j * PERIODIC_SPACING));
    }
  }
  return circularSubset(points, PERIODIC_PATCH_RADIUS);
}

/** k range that puts the first couple of orders of the lattice's peaks in frame. */
function periodicKRange(): number {
  return suggestedKRange(PERIODIC_SPACING, DIFFRACTION_PERIODS);
}

/**
 * The k range for the current mode. Each tiling has its own characteristic
 * length — the Penrose edge shrinks by φ per inflation — so the window has to
 * follow it, or the peaks march off the edge as the tiling grows.
 */
function kRangeFor(mode: TilingMode, inflationSteps: number): number {
  if (mode === TilingMode.PENROSE) {
    return suggestedKRange(edgeLengthAfter(inflationSteps), DIFFRACTION_PERIODS);
  }
  if (mode === TilingMode.EINSTEIN) {
    // The hat's kite edge is 1 in the model's own units, and the patch is not
    // rescaled as it grows, so the window is fixed.
    return suggestedKRange(1, DIFFRACTION_PERIODS);
  }
  return periodicKRange();
}

/** The radius of a point set about its centroid. */
function patchRadius(points: readonly Vector2[]): number {
  if (points.length === 0) {
    return 1;
  }
  const centroid = points.reduce((sum, point) => sum.plus(point), new Vector2(0, 0)).timesScalar(1 / points.length);
  return Math.max(...points.map((point) => point.distance(centroid)));
}
