/**
 * MillerIndicesScreenSummaryContent.ts
 *
 * The accessible screen summary for the Miller Indices screen. The
 * current-details paragraph switches between the plane and direction wordings
 * with the mode, since the two describe different things and a single sentence
 * covering both would say nothing useful about either.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { ScreenSummaryContent } from "scenerystack/sim";
import { formatDirection, formatPlane } from "../../common/model/MillerIndices.js";
import { StringManager } from "../../i18n/StringManager.js";
import { type MillerIndicesModel, MillerMode } from "../model/MillerIndicesModel.js";

export class MillerIndicesScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: MillerIndicesModel) {
    const strings = StringManager.getInstance();
    const a11y = strings.getMillerIndicesA11yStrings();
    const commonStrings = strings.getCommonStrings();

    const familyCount = new DerivedProperty([model.familyProperty], (family) => `${family.length}`);

    const planeDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
      plane: new DerivedProperty([model.planeIndicesProperty], formatPlane),
      spacing: new DerivedProperty([model.spacingProperty, commonStrings.infinityStringProperty], (value, infinity) =>
        Number.isFinite(value) ? toFixed(value, 4) : infinity,
      ),
      family: familyCount,
    });

    const directionDetails = new PatternStringProperty(a11y.currentDetailsDirectionStringProperty, {
      direction: new DerivedProperty([model.directionIndicesProperty], formatDirection),
      family: familyCount,
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new DerivedProperty(
        [model.modeProperty, planeDetails, directionDetails],
        (mode, plane, direction) => (mode === MillerMode.PLANE ? plane : direction),
      ),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
