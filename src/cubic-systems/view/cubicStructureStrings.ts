/**
 * cubicStructureStrings.ts
 *
 * Localized names for the three cubic structures, and the touching condition
 * each one implies. Shared between the visible readouts and the accessible
 * screen summary so both say the same thing.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { CubicStructure } from "../../common/model/CubicCell.js";
import { StringManager } from "../../i18n/StringManager.js";

/** A live localized name for the selected cubic structure. */
export function structureStringProperty(
  structureProperty: TReadOnlyProperty<CubicStructure>,
): TReadOnlyProperty<string> {
  const structures = StringManager.getInstance().getCubicSystemsStrings().structures;

  return new DerivedProperty(
    [
      structureProperty,
      structures.simpleCubicStringProperty,
      structures.bodyCenteredStringProperty,
      structures.faceCenteredStringProperty,
    ],
    (structure, simple, body, face) => {
      switch (structure) {
        case CubicStructure.SIMPLE_CUBIC:
          return simple;
        case CubicStructure.BODY_CENTERED:
          return body;
        default:
          return face;
      }
    },
  );
}

/**
 * The touching condition as algebra rather than as a number: the relation a
 * student derives on paper, shown next to the picture it comes from.
 *
 * These are mathematical expressions, not prose, so they are the same in every
 * locale and are built here rather than sitting in the string files.
 */
export function touchingRelationStringProperty(
  structureProperty: TReadOnlyProperty<CubicStructure>,
): TReadOnlyProperty<string> {
  return new DerivedProperty([structureProperty], (structure) => {
    switch (structure) {
      case CubicStructure.SIMPLE_CUBIC:
        return "a = 2r";
      case CubicStructure.BODY_CENTERED:
        return "a = 4r/√3";
      default:
        return "a = 2√2 r";
    }
  });
}
