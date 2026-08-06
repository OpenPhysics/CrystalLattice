/**
 * CubicSystemsModel.ts
 *
 * State for the Cubic Systems screen: which cubic structure is on screen, how
 * big its cell is, and how big the hard-sphere atoms are.
 *
 * The atomic radius is a *free* slider, deliberately not locked to the touching
 * value. A student can drive it past touching until the spheres overlap — which
 * is unphysical for hard spheres and says so — or shrink it until the lattice
 * rattles. The "snap to touching" button is a one-click way back to the
 * geometrically meaningful value, not a constraint.
 *
 * All lengths are in nanometres.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  DEFAULT_CELL_EDGE_NM,
  MAX_ATOM_RADIUS_NM,
  MAX_CELL_EDGE_NM,
  MIN_ATOM_RADIUS_NM,
  MIN_CELL_EDGE_NM,
} from "../../CrystalLatticeConstants.js";
import {
  atomsPerCell,
  type CellAtom,
  CubicStructure,
  coordinationNumber,
  generateCellAtoms,
  packingFactor,
  spheresOverlap,
  theoreticalDensity,
  touchingRadius,
} from "../../common/model/CubicCell.js";
import { identifyElement, REFERENCE_ELEMENTS, type ReferenceElement } from "../../common/model/ReferenceElements.js";

/** Slider range for the cell edge a, in nm. */
export const CELL_EDGE_RANGE = new Range(MIN_CELL_EDGE_NM, MAX_CELL_EDGE_NM);

/** Slider range for the atomic radius r, in nm. Runs well past touching. */
export const ATOM_RADIUS_RANGE = new Range(MIN_ATOM_RADIUS_NM, MAX_ATOM_RADIUS_NM);

export class CubicSystemsModel implements TModel {
  /** Which cubic structure is on screen. */
  public readonly structureProperty: Property<CubicStructure>;

  /** Cubic cell edge a, in nm. */
  public readonly edgeLengthProperty: NumberProperty;

  /** Atomic radius r, in nm. Free — not clamped to the touching value. */
  public readonly atomRadiusProperty: NumberProperty;

  /** Whether the front of the cell is cut away to reveal the interior. */
  public readonly clipFrontProperty: BooleanProperty;

  /** Whether each atom shows the fraction of it this cell owns. */
  public readonly showSharingProperty: BooleanProperty;

  /** Which tabulated element the density comparison is against, or null for none. */
  public readonly selectedElementProperty: Property<ReferenceElement | null>;

  /** The conventional cell's atoms, in fractional coordinates. */
  public readonly cellAtomsProperty: TReadOnlyProperty<readonly CellAtom[]>;

  /** Atoms per conventional cell: 1, 2 or 4. */
  public readonly atomsPerCellProperty: TReadOnlyProperty<number>;

  /** Nearest neighbours per atom: 6, 8 or 12. */
  public readonly coordinationNumberProperty: TReadOnlyProperty<number>;

  /** The radius at which spheres just touch, for the current structure and edge. */
  public readonly touchingRadiusProperty: TReadOnlyProperty<number>;

  /** APF = n·(4/3)πr³/a³, computed from the *current* radius, not the touching one. */
  public readonly packingFactorProperty: TReadOnlyProperty<number>;

  /** Whether the current radius makes the spheres interpenetrate. */
  public readonly overlappingProperty: TReadOnlyProperty<boolean>;

  /** Theoretical density from the selected element's molar mass, in g/cm³. */
  public readonly computedDensityProperty: TReadOnlyProperty<number | null>;

  /** The tabulated element whose lattice constant matches the current edge, if any. */
  public readonly identifiedElementProperty: TReadOnlyProperty<ReferenceElement | undefined>;

  public constructor() {
    this.structureProperty = new Property<CubicStructure>(CubicStructure.FACE_CENTERED);
    this.edgeLengthProperty = new NumberProperty(DEFAULT_CELL_EDGE_NM, { range: CELL_EDGE_RANGE, units: "nm" });
    this.atomRadiusProperty = new NumberProperty(touchingRadius(CubicStructure.FACE_CENTERED, DEFAULT_CELL_EDGE_NM), {
      range: ATOM_RADIUS_RANGE,
      units: "nm",
    });
    this.clipFrontProperty = new BooleanProperty(false);
    this.showSharingProperty = new BooleanProperty(false);
    this.selectedElementProperty = new Property<ReferenceElement | null>(null);

    this.cellAtomsProperty = new DerivedProperty([this.structureProperty], generateCellAtoms);
    this.atomsPerCellProperty = new DerivedProperty([this.structureProperty], atomsPerCell);
    this.coordinationNumberProperty = new DerivedProperty([this.structureProperty], coordinationNumber);
    this.touchingRadiusProperty = new DerivedProperty(
      [this.structureProperty, this.edgeLengthProperty],
      touchingRadius,
    );
    this.packingFactorProperty = new DerivedProperty(
      [this.structureProperty, this.edgeLengthProperty, this.atomRadiusProperty],
      packingFactor,
    );
    this.overlappingProperty = new DerivedProperty(
      [this.structureProperty, this.edgeLengthProperty, this.atomRadiusProperty],
      spheresOverlap,
    );

    this.computedDensityProperty = new DerivedProperty(
      [this.selectedElementProperty, this.edgeLengthProperty, this.structureProperty],
      (element, edge, structure) => (element === null ? null : theoreticalDensity(structure, edge, element.molarMass)),
    );

    this.identifiedElementProperty = new DerivedProperty(
      [this.structureProperty, this.edgeLengthProperty],
      (structure, edge) => identifyElement(structure, edge),
    );
  }

  /** Sets r to the value at which hard spheres just touch, for the current structure. */
  public snapRadiusToTouching(): void {
    this.atomRadiusProperty.value = ATOM_RADIUS_RANGE.constrainValue(this.touchingRadiusProperty.value);
  }

  /**
   * Loads a tabulated element: adopts its structure and lattice constant, and
   * sets the radius to touching, so the density readout can be compared against
   * the measured value straight away.
   */
  public loadElement(element: ReferenceElement): void {
    this.structureProperty.value = element.structure;
    this.edgeLengthProperty.value = CELL_EDGE_RANGE.constrainValue(element.latticeConstantNm);
    this.selectedElementProperty.value = element;
    this.snapRadiusToTouching();
  }

  /** Every tabulated element, for the comparison combo box. */
  public get referenceElements(): readonly ReferenceElement[] {
    return REFERENCE_ELEMENTS;
  }

  public reset(): void {
    this.structureProperty.reset();
    this.edgeLengthProperty.reset();
    this.atomRadiusProperty.reset();
    this.clipFrontProperty.reset();
    this.showSharingProperty.reset();
    this.selectedElementProperty.reset();
  }

  /** The cell is static; nothing advances with time. */
  public step(_dt: number): void {
    // Intentionally empty — this screen has no time-dependent state.
  }
}
