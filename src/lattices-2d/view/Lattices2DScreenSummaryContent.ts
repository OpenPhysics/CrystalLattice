/**
 * Lattices2DScreenSummaryContent.ts
 *
 * The accessible screen summary for the 2D Lattices screen.
 *
 * `currentDetailsContent` is a live DerivedProperty over the model, so a
 * screen-reader user re-reading the summary gets the lattice as it stands right
 * now — including the classification, which is the screen's whole answer.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { Lattices2DModel } from "../model/Lattices2DModel.js";
import { latticeTypeStringProperty } from "./latticeTypeStrings.js";

export class Lattices2DScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: Lattices2DModel) {
    const a11y = StringManager.getInstance().getLattices2DA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
      type: latticeTypeStringProperty(model.latticeTypeProperty),
      a1: new DerivedProperty([model.a1Property], (value) => value.toFixed(3)),
      a2: new DerivedProperty([model.a2Property], (value) => value.toFixed(3)),
      gamma: new DerivedProperty([model.gammaDegreesProperty], (value) => value.toFixed(0)),
      coordination: new DerivedProperty([model.coordinationProperty], (shell) => `${shell.count}`),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
