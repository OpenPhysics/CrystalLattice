/**
 * Lattices2DModel.ts
 *
 * State for the 2D Lattices screen. The student holds three numbers — |a₁|,
 * |a₂| and the angle γ between them — and everything else on the screen is
 * derived from those, including which of the five 2D Bravais lattices they have
 * landed on.
 *
 * The classification is deliberately derived rather than selected: the screen
 * is designed so a student *finds* the square lattice by dragging into it, and
 * the "snap to" control exists as a check afterwards, not as the starting move.
 *
 * All lengths are in nanometres.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  DEFAULT_GAMMA_DEGREES,
  DEFAULT_LATTICE_VECTOR_NM,
  MAX_GAMMA_DEGREES,
  MAX_LATTICE_VECTOR_NM,
  MIN_GAMMA_DEGREES,
  MIN_LATTICE_VECTOR_NM,
} from "../../CrystalLatticeConstants.js";
import {
  arealDensity,
  arealPackingFraction,
  type CoordinationShell,
  cellArea,
  classifyLattice,
  firstCoordinationShell,
  type Lattice2DParameters,
  type Lattice2DType,
  snapParametersFor,
} from "../../common/model/Lattice2D.js";

/** Slider range for |a₁| and |a₂|, in nm. */
export const LATTICE_VECTOR_RANGE = new Range(MIN_LATTICE_VECTOR_NM, MAX_LATTICE_VECTOR_NM);

/** Slider range for γ, in degrees. */
export const GAMMA_RANGE = new Range(MIN_GAMMA_DEGREES, MAX_GAMMA_DEGREES);

export class Lattices2DModel implements TModel {
  /** |a₁| in nm. */
  public readonly a1Property: NumberProperty;

  /** |a₂| in nm. */
  public readonly a2Property: NumberProperty;

  /** Interior angle γ between a₁ and a₂, in degrees (the unit students read). */
  public readonly gammaDegreesProperty: NumberProperty;

  /** Whether the motif places a second basis atom at each cell centre. */
  public readonly centeredBasisProperty: BooleanProperty;

  /** Whether to shade the primitive unit cell. */
  public readonly showPrimitiveCellProperty: BooleanProperty;

  /** Whether to draw the Wigner–Seitz cell. */
  public readonly showWignerSeitzProperty: BooleanProperty;

  /** Whether to draw the perpendicular-bisector construction lines. */
  public readonly showBisectorsProperty: BooleanProperty;

  /** Whether to draw the nearest-neighbour circle and its count. */
  public readonly showCoordinationProperty: BooleanProperty;

  /** The three sliders bundled into the shape the pure geometry functions take. */
  public readonly parametersProperty: TReadOnlyProperty<Lattice2DParameters>;

  /** Which of the five 2D Bravais lattices the current parameters describe. */
  public readonly latticeTypeProperty: TReadOnlyProperty<Lattice2DType>;

  /** Primitive cell area A = a₁·a₂·sin γ, in nm². */
  public readonly cellAreaProperty: TReadOnlyProperty<number>;

  /** Atoms per primitive cell: 1, or 2 with a centred basis. */
  public readonly atomsPerCellProperty: TReadOnlyProperty<number>;

  /** Areal density ρ = (atoms/cell)/A, in atoms per nm². */
  public readonly arealDensityProperty: TReadOnlyProperty<number>;

  /** Fraction of the plane covered by touching discs on this lattice. */
  public readonly packingFractionProperty: TReadOnlyProperty<number>;

  /** Nearest-neighbour distance and the 2D coordination number. */
  public readonly coordinationProperty: TReadOnlyProperty<CoordinationShell>;

  public constructor() {
    this.a1Property = new NumberProperty(DEFAULT_LATTICE_VECTOR_NM, {
      range: LATTICE_VECTOR_RANGE,
      units: "nm",
    });
    this.a2Property = new NumberProperty(DEFAULT_LATTICE_VECTOR_NM * 1.4, {
      range: LATTICE_VECTOR_RANGE,
      units: "nm",
    });
    this.gammaDegreesProperty = new NumberProperty(DEFAULT_GAMMA_DEGREES, {
      range: GAMMA_RANGE,
      units: "°",
    });

    this.centeredBasisProperty = new BooleanProperty(false);
    this.showPrimitiveCellProperty = new BooleanProperty(true);
    this.showWignerSeitzProperty = new BooleanProperty(false);
    this.showBisectorsProperty = new BooleanProperty(false);
    this.showCoordinationProperty = new BooleanProperty(false);

    this.parametersProperty = new DerivedProperty(
      [this.a1Property, this.a2Property, this.gammaDegreesProperty, this.centeredBasisProperty],
      (a1, a2, gammaDegrees, centered): Lattice2DParameters => ({
        a1,
        a2,
        gamma: (gammaDegrees * Math.PI) / 180,
        centered,
      }),
    );

    this.latticeTypeProperty = new DerivedProperty([this.parametersProperty], classifyLattice);
    this.cellAreaProperty = new DerivedProperty([this.parametersProperty], cellArea);
    this.atomsPerCellProperty = new DerivedProperty([this.centeredBasisProperty], (centered) => (centered ? 2 : 1));
    this.arealDensityProperty = new DerivedProperty([this.parametersProperty, this.atomsPerCellProperty], arealDensity);
    this.packingFractionProperty = new DerivedProperty([this.parametersProperty], arealPackingFraction);
    this.coordinationProperty = new DerivedProperty([this.parametersProperty], firstCoordinationShell);
  }

  /**
   * Sets the sliders to the canonical parameters for a Bravais type — the
   * secondary "snap to" control, offered as a way to check an answer after
   * hunting for the lattice by hand.
   */
  public snapTo(type: Lattice2DType): void {
    const snapped = snapParametersFor(type, this.a1Property.value);
    this.a1Property.value = LATTICE_VECTOR_RANGE.constrainValue(snapped.a1);
    this.a2Property.value = LATTICE_VECTOR_RANGE.constrainValue(snapped.a2);
    this.gammaDegreesProperty.value = GAMMA_RANGE.constrainValue((snapped.gamma * 180) / Math.PI);
    this.centeredBasisProperty.value = snapped.centered ?? false;
  }

  public reset(): void {
    this.a1Property.reset();
    this.a2Property.reset();
    this.gammaDegreesProperty.reset();
    this.centeredBasisProperty.reset();
    this.showPrimitiveCellProperty.reset();
    this.showWignerSeitzProperty.reset();
    this.showBisectorsProperty.reset();
    this.showCoordinationProperty.reset();
  }

  /** The 2D lattice is static; nothing advances with time. */
  public step(_dt: number): void {
    // Intentionally empty — this screen has no time-dependent state.
  }
}
