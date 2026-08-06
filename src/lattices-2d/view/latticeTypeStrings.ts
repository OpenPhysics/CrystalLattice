/**
 * latticeTypeStrings.ts
 *
 * Maps the model's Bravais-type enum to its localized name. Kept out of the
 * screen view so both the visible readout and the accessible screen summary
 * derive the same string from the same place.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Lattice2DType } from "../../common/model/Lattice2D.js";
import { StringManager } from "../../i18n/StringManager.js";

/** A live localized name for the current lattice type. */
export function latticeTypeStringProperty(typeProperty: TReadOnlyProperty<Lattice2DType>): TReadOnlyProperty<string> {
  const types = StringManager.getInstance().getLattices2DStrings().types;

  return new DerivedProperty(
    [
      typeProperty,
      types.squareStringProperty,
      types.rectangularStringProperty,
      types.centeredRectangularStringProperty,
      types.hexagonalStringProperty,
      types.obliqueStringProperty,
    ],
    (type, square, rectangular, centeredRectangular, hexagonal, oblique) => {
      switch (type) {
        case Lattice2DType.SQUARE:
          return square;
        case Lattice2DType.RECTANGULAR:
          return rectangular;
        case Lattice2DType.CENTERED_RECTANGULAR:
          return centeredRectangular;
        case Lattice2DType.HEXAGONAL:
          return hexagonal;
        default:
          return oblique;
      }
    },
  );
}
