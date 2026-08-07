/**
 * AperiodicOrderModel.ts
 *
 * State for the Aperiodic Order screen — the one that takes back the assumption
 * every earlier screen relied on.
 *
 * Four modes share one pipeline: whatever is on screen (an inflated Penrose
 * tiling, a patch of hat tiles, an ordinary periodic lattice for contrast, or a
 * patch the student has laid by hand) becomes a point set, and that point set
 * goes through the same discrete Fourier transform. Running all four through
 * identical code is what makes the comparison mean something: the Penrose
 * pattern's peaks are just as sharp as the lattice's, and the only difference is
 * their symmetry.
 *
 * The hand-placement mode is the same tiling reached the other way round. The
 * inflation button grows a correct tiling by construction and says nothing about
 * why it is correct; placing tiles one at a time against the vertex atlas is
 * where a student meets the rule that forbids periodicity, and where they can get
 * stuck — which is exactly why nobody generates large Penrose tilings this way.
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
  candidatePlacements,
  countTiles,
  edgeLengthAfter,
  generatePenroseTiling,
  mergeIntoRhombi,
  type PenroseRhombus,
  type PlacementCandidate,
  placementSeed,
  RhombusType,
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
  /** The student lays Penrose rhombi by hand, against the matching rules. */
  PLACEMENT: "placement",
} as const;

export type TilingMode = (typeof TilingMode)[keyof typeof TilingMode];

/** Whether a mode shows Penrose rhombi, and so has thick/thin counts to report. */
export function isRhombusMode(mode: TilingMode): boolean {
  return mode === TilingMode.PENROSE || mode === TilingMode.PLACEMENT;
}

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

  // ── Hand placement ─────────────────────────────────────────────────────────

  /** The rhombi the student has laid down, oldest first so undo can pop. */
  public readonly placedRhombiProperty: Property<readonly PenroseRhombus[]>;

  /** Which shape the palette is offering, and what a keyboard drop will place. */
  public readonly selectedTileProperty: Property<RhombusType>;

  /** Every place a next tile could go, each labelled legal or not. */
  public readonly candidatesProperty: TReadOnlyProperty<readonly PlacementCandidate[]>;

  /** How many of those places the matching rules allow — zero means stuck. */
  public readonly legalSlotCountProperty: TReadOnlyProperty<number>;

  /** True while the last attempted drop is still being refused, for the feedback line. */
  public readonly placementRefusedProperty: BooleanProperty;

  public constructor() {
    this.modeProperty = new Property<TilingMode>(TilingMode.PENROSE);
    this.inflationStepsProperty = new NumberProperty(5, { range: INFLATION_RANGE });
    this.hatStepsProperty = new NumberProperty(2, { range: HAT_STEPS_RANGE });
    this.highlightOrientationsProperty = new BooleanProperty(false);
    this.showMetatilesProperty = new BooleanProperty(true);
    this.showReflectedProperty = new BooleanProperty(false);
    this.compareLatticeProperty = new BooleanProperty(true);

    this.placedRhombiProperty = new Property<readonly PenroseRhombus[]>([placementSeed()]);
    this.selectedTileProperty = new Property<RhombusType>(RhombusType.THICK);
    this.placementRefusedProperty = new BooleanProperty(false);

    this.rhombiProperty = new DerivedProperty([this.inflationStepsProperty], (steps) =>
      mergeIntoRhombi(generatePenroseTiling(steps)),
    );
    this.hatsProperty = new DerivedProperty([this.hatStepsProperty], (steps) => generateHatPatch(steps));

    // Enumerating candidates walks the patch boundary and runs a separating-axis
    // test per tile, so it is derived from the placed tiles alone and recomputed
    // only when one is added or removed — never on a redraw.
    this.candidatesProperty = new DerivedProperty([this.placedRhombiProperty], (placed) => candidatePlacements(placed));
    this.legalSlotCountProperty = new DerivedProperty(
      [this.candidatesProperty],
      (candidates) => candidates.filter((candidate) => candidate.legal).length,
    );

    // The counts row follows whichever set of rhombi is on screen, so the
    // thick:thin ratio a student builds by hand is reported the same way the
    // inflated one is — and creeps toward φ far more slowly, which is the point.
    this.tileCountsProperty = new DerivedProperty(
      [this.modeProperty, this.rhombiProperty, this.placedRhombiProperty],
      (mode, inflated, placed) => countTiles(mode === TilingMode.PLACEMENT ? placed : inflated),
    );
    this.hatCountsProperty = new DerivedProperty([this.hatsProperty], countHats);

    this.scatterersProperty = new DerivedProperty(
      [this.modeProperty, this.rhombiProperty, this.hatsProperty, this.placedRhombiProperty],
      (mode, rhombi, hats, placed): readonly Vector2[] => {
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
        if (mode === TilingMode.PLACEMENT) {
          // No disc trim here. Trimming exists so a generated patch's outline does
          // not imprint on its transform, but a hand-laid patch is small enough
          // that discarding its outer ring would leave nothing — a single seed
          // tile trims to zero points. Its outline dominates the transform either
          // way, which is the honest answer to "how many tiles does long-range
          // order take?": the pattern stays a blur until there are far more tiles
          // than anyone will place by hand.
          return tilingVertices(placed);
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

  // ── Hand placement ─────────────────────────────────────────────────────────

  /**
   * Lays a tile down, if the matching rules allow it there.
   *
   * An illegal candidate is *refused* rather than placed and flagged. Letting one
   * through would leave the patch in a state no Penrose tiling contains, and
   * every later candidate would be judged against nonsense. Refusing keeps the
   * patch a genuine partial Penrose tiling at every step, and the illegal slots
   * stay visible on the board so a student can see what was on offer.
   *
   * @returns whether the tile was placed
   */
  public placeTile(candidate: PlacementCandidate): boolean {
    if (!candidate.legal) {
      this.placementRefusedProperty.value = true;
      return false;
    }
    this.placementRefusedProperty.value = false;
    this.placedRhombiProperty.value = [...this.placedRhombiProperty.value, candidate.rhombus];
    return true;
  }

  /** Takes back the most recently placed tile, never the seed. */
  public undoPlacement(): void {
    this.placementRefusedProperty.value = false;
    const placed = this.placedRhombiProperty.value;
    if (placed.length > 1) {
      this.placedRhombiProperty.value = placed.slice(0, -1);
    }
  }

  /** Whether there is anything to take back. */
  public canUndoPlacement(): boolean {
    return this.placedRhombiProperty.value.length > 1;
  }

  /** Clears the board back to the single seed tile. */
  public clearPlacements(): void {
    this.placementRefusedProperty.value = false;
    this.placedRhombiProperty.reset();
  }

  public reset(): void {
    this.modeProperty.reset();
    this.inflationStepsProperty.reset();
    this.hatStepsProperty.reset();
    this.highlightOrientationsProperty.reset();
    this.showMetatilesProperty.reset();
    this.showReflectedProperty.reset();
    this.compareLatticeProperty.reset();
    this.placedRhombiProperty.reset();
    this.selectedTileProperty.reset();
    this.placementRefusedProperty.reset();
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
  if (mode === TilingMode.EINSTEIN || mode === TilingMode.PLACEMENT) {
    // Both are built at unit edge and never rescaled as they grow, so the window
    // is fixed rather than following an inflation depth.
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
