/**
 * AperiodicOrderScreenSummaryContent.ts
 *
 * The accessible screen summary for the Aperiodic Order screen. Its
 * current-details paragraph carries the measured symmetry order, so the
 * screen's central claim — sharp peaks with a crystallographically forbidden
 * symmetry — is available as a number to a reader who cannot see the pattern.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import { type AperiodicOrderModel, TilingMode } from "../model/AperiodicOrderModel.js";

export class AperiodicOrderScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: AperiodicOrderModel) {
    const a11y = StringManager.getInstance().getAperiodicOrderA11yStrings();

    const currentDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
      tiles: new DerivedProperty(
        [model.modeProperty, model.tileCountsProperty, model.hatCountsProperty, model.scatterersProperty],
        (mode, tiles, hats, scatterers) => {
          if (mode === TilingMode.PENROSE) {
            return `${tiles.thick + tiles.thin}`;
          }
          return mode === TilingMode.EINSTEIN ? `${hats.total}` : `${scatterers.length}`;
        },
      ),
      steps: new DerivedProperty(
        [model.modeProperty, model.inflationStepsProperty, model.hatStepsProperty],
        (mode, inflation, hatSteps) => `${mode === TilingMode.EINSTEIN ? hatSteps : inflation}`,
      ),
      peaks: new DerivedProperty([model.peakCountProperty], (count) => `${count}`),
      symmetry: new DerivedProperty([model.symmetryOrderProperty], (order) => `${order}`),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
