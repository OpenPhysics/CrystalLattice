/**
 * CubicSystemsScreenSummaryContent.ts
 *
 * The accessible screen summary for the Cubic Systems screen, with a live
 * current-details paragraph so a screen-reader user gets the structure, the two
 * lengths, and all three derived quantities on demand.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { CubicSystemsModel } from "../model/CubicSystemsModel.js";
import { structureStringProperty } from "./cubicStructureStrings.js";

export class CubicSystemsScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: CubicSystemsModel) {
    const a11y = StringManager.getInstance().getCubicSystemsA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
      structure: structureStringProperty(model.structureProperty),
      edge: new DerivedProperty([model.edgeLengthProperty], (value) => value.toFixed(3)),
      radius: new DerivedProperty([model.atomRadiusProperty], (value) => value.toFixed(3)),
      atoms: new DerivedProperty([model.atomsPerCellProperty], (value) => `${value}`),
      coordination: new DerivedProperty([model.coordinationNumberProperty], (value) => `${value}`),
      apf: new DerivedProperty([model.packingFactorProperty], (value) => value.toFixed(3)),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
