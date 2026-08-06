/**
 * ClosePackingModel.ts
 *
 * State for the Close-Packing screen. The student chooses a stacking sequence —
 * either one of the two canonical ones or a typed custom sequence — plus a
 * layer count and an axial ratio, and the screen builds the stack.
 *
 * The payoff the model exists to deliver: HCP and FCC differ *only* in where
 * the third layer goes, yet both reach the maximum three-dimensional packing
 * fraction of 0.7405. So the packing fraction is derived from geometry rather
 * than looked up, and the two modes share the same code path.
 */

import {
  BooleanProperty,
  DerivedProperty,
  NumberProperty,
  Property,
  StringProperty,
  type TReadOnlyProperty,
} from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  CLOSE_PACKING_LAYER_RANGE,
  DEFAULT_LAYER_COUNT,
  MAX_C_OVER_A,
  MAX_LAYER_COUNT,
  MIN_C_OVER_A,
  MIN_LAYER_COUNT,
} from "../../CrystalLatticeConstants.js";
import {
  canonicalSequence,
  classifyStacking,
  generateStack,
  hcpCoordinationNumber,
  hcpInterlayerSpacing,
  hcpPackingFraction,
  hcpSphereRadius,
  IDEAL_C_OVER_A,
  jagodzinskiSymbols,
  type LayerPosition,
  parseSequence,
  REAL_HCP_METALS,
  type StackedLayer,
  StackingType,
} from "../../common/model/ClosePacking.js";

/** Slider range for the number of layers. */
export const LAYER_COUNT_RANGE = new Range(MIN_LAYER_COUNT, MAX_LAYER_COUNT);

/** Slider range for the axial ratio c/a. */
export const C_OVER_A_RANGE = new Range(MIN_C_OVER_A, MAX_C_OVER_A);

/** Which sequence source the screen is using. */
export const SequenceMode = {
  /** ABAB…, generated to the current layer count. */
  HCP: "hcp",
  /** ABCABC…, generated to the current layer count. */
  FCC: "fcc",
  /** Whatever the student typed. */
  CUSTOM: "custom",
} as const;

export type SequenceMode = (typeof SequenceMode)[keyof typeof SequenceMode];

/** In-plane lattice constant of a layer, in nm. Fixed: this screen is about
 *  the stacking, not the sphere size. */
export const IN_PLANE_CONSTANT_NM = 0.3;

export class ClosePackingModel implements TModel {
  /** Whether the sequence comes from a preset or from the text field. */
  public readonly sequenceModeProperty: Property<SequenceMode>;

  /** The student's typed sequence, e.g. "ABCACB". Only used in CUSTOM mode. */
  public readonly customSequenceTextProperty: StringProperty;

  /** How many layers the preset sequences generate. */
  public readonly layerCountProperty: NumberProperty;

  /** Axial ratio c/a, which sets the interlayer spacing. */
  public readonly cOverAProperty: NumberProperty;

  /** Whether each layer carries an A / B / C label. */
  public readonly showLabelsProperty: BooleanProperty;

  /** The sequence actually in effect, from whichever source is selected. */
  public readonly sequenceProperty: TReadOnlyProperty<readonly LayerPosition[]>;

  /** HCP, FCC, a stacking fault, or not close-packed at all. */
  public readonly stackingTypeProperty: TReadOnlyProperty<StackingType>;

  /** Per-layer h / c symbols; null at the two ends, which have no environment. */
  public readonly jagodzinskiProperty: TReadOnlyProperty<Array<"h" | "c" | null>>;

  /** The built stack: layer positions, heights and sphere centres. */
  public readonly stackProperty: TReadOnlyProperty<readonly StackedLayer[]>;

  /** Sphere radius admitted by the current a and c/a, in nm. */
  public readonly sphereRadiusProperty: TReadOnlyProperty<number>;

  /** Packing fraction at the current axial ratio; 0.7405 at the ideal ratio. */
  public readonly packingFractionProperty: TReadOnlyProperty<number>;

  /** Coordination number: 12 at the ideal ratio, 6 when stretched or squashed. */
  public readonly coordinationNumberProperty: TReadOnlyProperty<number>;

  /** Vertical distance between consecutive layers, in nm. */
  public readonly interlayerSpacingProperty: TReadOnlyProperty<number>;

  /** Whether the typed sequence parsed at all. */
  public readonly customSequenceValidProperty: TReadOnlyProperty<boolean>;

  public constructor() {
    this.sequenceModeProperty = new Property<SequenceMode>(SequenceMode.HCP);
    this.customSequenceTextProperty = new StringProperty("ABCACB");
    this.layerCountProperty = new NumberProperty(DEFAULT_LAYER_COUNT, { range: LAYER_COUNT_RANGE });
    this.cOverAProperty = new NumberProperty(IDEAL_C_OVER_A, { range: C_OVER_A_RANGE });
    this.showLabelsProperty = new BooleanProperty(true);

    this.customSequenceValidProperty = new DerivedProperty(
      [this.customSequenceTextProperty],
      (text) => parseSequence(text) !== null,
    );

    this.sequenceProperty = new DerivedProperty(
      [this.sequenceModeProperty, this.customSequenceTextProperty, this.layerCountProperty],
      (mode, customText, layerCount): readonly LayerPosition[] => {
        if (mode === SequenceMode.CUSTOM) {
          // Fall back to the HCP sequence while the field holds something
          // unparseable, so the play area never blanks out mid-keystroke.
          return parseSequence(customText) ?? canonicalSequence(StackingType.HCP, layerCount);
        }
        return canonicalSequence(mode === SequenceMode.HCP ? StackingType.HCP : StackingType.FCC, layerCount);
      },
    );

    this.stackingTypeProperty = new DerivedProperty([this.sequenceProperty], classifyStacking);
    this.jagodzinskiProperty = new DerivedProperty([this.sequenceProperty], jagodzinskiSymbols);

    this.sphereRadiusProperty = new DerivedProperty([this.cOverAProperty], (cOverA) =>
      hcpSphereRadius(IN_PLANE_CONSTANT_NM, cOverA),
    );
    this.interlayerSpacingProperty = new DerivedProperty([this.cOverAProperty], (cOverA) =>
      hcpInterlayerSpacing(IN_PLANE_CONSTANT_NM, cOverA),
    );
    this.packingFractionProperty = new DerivedProperty([this.cOverAProperty], hcpPackingFraction);
    this.coordinationNumberProperty = new DerivedProperty([this.cOverAProperty], (cOverA) =>
      hcpCoordinationNumber(cOverA),
    );

    this.stackProperty = new DerivedProperty(
      [this.sequenceProperty, this.interlayerSpacingProperty],
      (sequence, spacing) => generateStack(sequence, IN_PLANE_CONSTANT_NM, spacing, CLOSE_PACKING_LAYER_RANGE),
    );
  }

  /** Restores the axial ratio to the ideal hard-sphere value √(8/3). */
  public snapToIdealRatio(): void {
    this.cOverAProperty.value = C_OVER_A_RANGE.constrainValue(IDEAL_C_OVER_A);
  }

  /** Measured c/a for real HCP metals, for the comparison table. */
  public get realMetals(): typeof REAL_HCP_METALS {
    return REAL_HCP_METALS;
  }

  public reset(): void {
    this.sequenceModeProperty.reset();
    this.customSequenceTextProperty.reset();
    this.layerCountProperty.reset();
    this.cOverAProperty.reset();
    this.showLabelsProperty.reset();
  }

  /** The stack is static; nothing advances with time. */
  public step(_dt: number): void {
    // Intentionally empty — this screen has no time-dependent state.
  }
}
