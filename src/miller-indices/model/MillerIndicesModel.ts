/**
 * MillerIndicesModel.ts
 *
 * State for the Miller Indices screen. The screen works in both directions —
 * geometry to notation and notation to geometry — so the model holds the
 * *indices* as the single source of truth and derives the intercepts from them,
 * rather than the other way round. Dragging an intercept handle re-derives the
 * indices; typing indices re-derives the intercepts. Either way the derivation
 * panel shows the same four stages.
 *
 * The cell edge is fixed: this screen is about notation, not about a particular
 * lattice constant.
 */

import { BooleanProperty, DerivedProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { MAX_INTERCEPT_DENOMINATOR, MAX_MILLER_INDEX, MILLER_CELL_EDGE_NM } from "../../CrystalLatticeConstants.js";
import { CubicStructure, generateCellAtoms } from "../../common/model/CubicCell.js";
import {
  derivePlaneIndices,
  directionIndicesFromVector,
  equivalentFamily,
  type IndexTriple,
  type Intercepts,
  interceptsFromIndices,
  interplanarSpacing,
  type PlaneDerivation,
  planarDensity,
  planeNormal,
  planePolygonInCell,
  Rational,
} from "../../common/model/MillerIndices.js";

/** Which half of the screen is active. */
export const MillerMode = {
  PLANE: "plane",
  DIRECTION: "direction",
} as const;

export type MillerMode = (typeof MillerMode)[keyof typeof MillerMode];

/** The worked examples the preset buttons load — the common exam-question set. */
export const PLANE_PRESETS: ReadonlyArray<IndexTriple> = [
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, 1],
  [2, 0, 0],
  [1, -1, 0],
];

export const DIRECTION_PRESETS: ReadonlyArray<IndexTriple> = [
  [1, 0, 0],
  [1, 1, 0],
  [1, 1, 1],
  [1, -1, 0],
];

export class MillerIndicesModel implements TModel {
  /** Plane mode or direction mode. */
  public readonly modeProperty: Property<MillerMode>;

  /** The plane's Miller indices (hkl) — the source of truth in plane mode. */
  public readonly planeIndicesProperty: Property<IndexTriple>;

  /** The direction's indices [uvw] — the source of truth in direction mode. */
  public readonly directionIndicesProperty: Property<IndexTriple>;

  /** Whether to overlay [hkl], the normal to the current plane. */
  public readonly showNormalProperty: BooleanProperty;

  /** Whether to overlay every plane equivalent to this one under cubic symmetry. */
  public readonly showFamilyProperty: BooleanProperty;

  /** The plane's axis intercepts, derived from its indices. */
  public readonly interceptsProperty: TReadOnlyProperty<Intercepts>;

  /** The four-stage derivation the panel displays. */
  public readonly derivationProperty: TReadOnlyProperty<PlaneDerivation>;

  /** Interplanar spacing d = a/√(h²+k²+l²), in nm. */
  public readonly spacingProperty: TReadOnlyProperty<number>;

  /** The plane's outline inside the cubic cell, in model units. */
  public readonly planePolygonProperty: TReadOnlyProperty<Vector3[]>;

  /** The direction vector in model units, scaled to the cell. */
  public readonly directionVectorProperty: TReadOnlyProperty<Vector3>;

  /** The symmetry-equivalent family {hkl} or ⟨uvw⟩ of whichever mode is active. */
  public readonly familyProperty: TReadOnlyProperty<IndexTriple[]>;

  /** Planar density on the current plane, in atoms per nm². FCC basis, for continuity
   *  with the Cubic Systems screen's default structure. */
  public readonly planarDensityProperty: TReadOnlyProperty<number>;

  /** The cubic cell edge, fixed for this screen. */
  public readonly edgeLength = MILLER_CELL_EDGE_NM;

  public constructor() {
    this.modeProperty = new Property<MillerMode>(MillerMode.PLANE);
    this.planeIndicesProperty = new Property<IndexTriple>([1, 1, 1]);
    this.directionIndicesProperty = new Property<IndexTriple>([1, 1, 1]);
    this.showNormalProperty = new BooleanProperty(false);
    this.showFamilyProperty = new BooleanProperty(false);

    this.interceptsProperty = new DerivedProperty([this.planeIndicesProperty], interceptsFromIndices);
    this.derivationProperty = new DerivedProperty([this.interceptsProperty], derivePlaneIndices);

    this.spacingProperty = new DerivedProperty([this.planeIndicesProperty], (indices) =>
      interplanarSpacing(indices, this.edgeLength),
    );

    this.planePolygonProperty = new DerivedProperty([this.planeIndicesProperty], (indices) =>
      planePolygonInCell(indices, this.edgeLength),
    );

    this.directionVectorProperty = new DerivedProperty([this.directionIndicesProperty], (indices) => {
      const raw = new Vector3(indices[0], indices[1], indices[2]);
      // Scale so the arrow reaches the cell boundary regardless of the indices'
      // magnitude — [111] and [222] are the same direction and should look it.
      const longest = Math.max(Math.abs(indices[0]), Math.abs(indices[1]), Math.abs(indices[2]), 1);
      return raw.timesScalar(this.edgeLength / longest);
    });

    this.familyProperty = new DerivedProperty(
      [this.modeProperty, this.planeIndicesProperty, this.directionIndicesProperty],
      (mode, plane, direction) => equivalentFamily(mode === MillerMode.PLANE ? plane : direction),
    );

    // The FCC basis in fractional cell coordinates, matching the structure the
    // Cubic Systems screen opens on so the two screens' numbers line up.
    const fccBasis = generateCellAtoms(CubicStructure.FACE_CENTERED)
      .filter((atom) => atom.fractionalPosition.x < 1 && atom.fractionalPosition.y < 1 && atom.fractionalPosition.z < 1)
      .map((atom) => atom.fractionalPosition);

    this.planarDensityProperty = new DerivedProperty([this.planeIndicesProperty], (indices) =>
      planarDensity(indices, fccBasis, this.edgeLength),
    );
  }

  /** The normal to the current plane, [hkl] — equal to the plane's own indices in cubic. */
  public planeNormalVector(): Vector3 {
    return planeNormal(this.planeIndicesProperty.value);
  }

  /**
   * Sets the plane from a dragged intercept. The handle reports a length along
   * the axis in units of the lattice constant; `null` means the student pulled
   * it into the "parallel to this axis" snap zone at the track's far end.
   *
   * @returns whether the intercept was applied — false means the drag was
   *   refused because it would have left no plane at all.
   */
  public setIntercept(axis: 0 | 1 | 2, value: number | null): boolean {
    const current = [...this.interceptsProperty.value] as [Rational | null, Rational | null, Rational | null];
    const becomesParallel = value === null || Math.abs(value) < 1e-6;

    // A plane parallel to all three axes is not a plane. Refusing the third
    // "parallel" here rather than in the view keeps the indices (0,0,0) — which
    // nothing downstream can draw or reduce — out of the model entirely.
    if (becomesParallel && current.every((intercept, index) => index === axis || intercept === null)) {
      return false;
    }

    current[axis] = becomesParallel ? null : Rational.fromNumber(value, MAX_INTERCEPT_DENOMINATOR);
    this.planeIndicesProperty.value = derivePlaneIndices(current as Intercepts).indices;
    return true;
  }

  /** Sets the direction from a dragged vector, reducing it to smallest integers. */
  public setDirectionFromVector(vector: Vector3): void {
    const indices = directionIndicesFromVector(vector.timesScalar(1 / this.edgeLength), MAX_INTERCEPT_DENOMINATOR);
    if (indices.some((index) => index !== 0)) {
      this.directionIndicesProperty.value = indices;
    }
  }

  /** Applies typed indices, rejecting anything outside the drawable range. */
  public applyIndices(indices: IndexTriple): boolean {
    if (indices.every((index) => index === 0)) {
      return false;
    }
    if (indices.some((index) => Math.abs(index) > MAX_MILLER_INDEX)) {
      return false;
    }
    if (this.modeProperty.value === MillerMode.PLANE) {
      this.planeIndicesProperty.value = indices;
    } else {
      this.directionIndicesProperty.value = indices;
    }
    return true;
  }

  public reset(): void {
    this.modeProperty.reset();
    this.planeIndicesProperty.reset();
    this.directionIndicesProperty.reset();
    this.showNormalProperty.reset();
    this.showFamilyProperty.reset();
  }

  /** The cell is static; nothing advances with time. */
  public step(_dt: number): void {
    // Intentionally empty — this screen has no time-dependent state.
  }
}
