/**
 * stackingStrings.ts
 *
 * Localized names for the stacking classifications, and the plain rendering of
 * a sequence. Shared between the visible readouts and the accessible summary.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { LayerPosition } from "../../common/model/ClosePacking.js";
import { StackingType } from "../../common/model/ClosePacking.js";
import { StringManager } from "../../i18n/StringManager.js";

/** A live localized name for how the current sequence classifies. */
export function stackingTypeStringProperty(typeProperty: TReadOnlyProperty<StackingType>): TReadOnlyProperty<string> {
  const types = StringManager.getInstance().getClosePackingStrings().types;

  return new DerivedProperty(
    [
      typeProperty,
      types.hcpStringProperty,
      types.fccStringProperty,
      types.mixedStringProperty,
      types.invalidStringProperty,
    ],
    (type, hcp, fcc, mixed, invalid) => {
      switch (type) {
        case StackingType.HCP:
          return hcp;
        case StackingType.FCC:
          return fcc;
        case StackingType.MIXED:
          return mixed;
        default:
          return invalid;
      }
    },
  );
}

/** The sequence itself, e.g. "ABCACB". Letters, so the same in every locale. */
export function sequenceTextProperty(
  sequenceProperty: TReadOnlyProperty<readonly LayerPosition[]>,
): TReadOnlyProperty<string> {
  return new DerivedProperty([sequenceProperty], (sequence) => sequence.join(""));
}
