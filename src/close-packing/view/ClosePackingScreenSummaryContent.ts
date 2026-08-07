/**
 * ClosePackingScreenSummaryContent.ts
 *
 * The accessible screen summary for the Close-Packing screen. Its live
 * current-details paragraph reads out the sequence, its classification and the
 * packing fraction together, so the "different picture, same number" point is
 * available without seeing the picture at all.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { ClosePackingModel } from "../model/ClosePackingModel.js";
import { sequenceTextProperty, stackingTypeStringProperty } from "./stackingStrings.js";

export class ClosePackingScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: ClosePackingModel) {
    const a11y = StringManager.getInstance().getClosePackingA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
      sequence: sequenceTextProperty(model.sequenceProperty),
      type: stackingTypeStringProperty(model.stackingTypeProperty),
      layers: new DerivedProperty([model.sequenceProperty], (sequence) => `${sequence.length}`),
      ratio: new DerivedProperty([model.cOverAProperty], (value) => toFixed(value, 3)),
      coordination: new DerivedProperty([model.coordinationNumberProperty], (value) => `${value}`),
      packing: new DerivedProperty([model.packingFractionProperty], (value) => toFixed(value, 4)),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
