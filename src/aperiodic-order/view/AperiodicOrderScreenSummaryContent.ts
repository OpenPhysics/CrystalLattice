/**
 * AperiodicOrderScreenSummaryContent.ts
 *
 * The accessible screen summary for the Aperiodic Order screen. Its
 * current-details paragraph carries the measured symmetry order, so the
 * screen's central claim — sharp peaks with a crystallographically forbidden
 * symmetry — is available as a number to a reader who cannot see the pattern.
 *
 * Hand placement gets its own paragraph rather than sharing the tiling one. Its
 * state is different in kind: not "how many tiles after how many substitutions"
 * but "what is on the board and what can still go on it", and the count of
 * forbidden slots is the number a reader most needs, since those are exactly the
 * places the shapes fit and the rules refuse.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import { type AperiodicOrderModel, TilingMode } from "../model/AperiodicOrderModel.js";

export class AperiodicOrderScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: AperiodicOrderModel) {
    const a11y = StringManager.getInstance().getAperiodicOrderA11yStrings();

    const tilingDetails = new PatternStringProperty(a11y.currentDetailsStringProperty, {
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

    const placementDetails = new PatternStringProperty(a11y.currentDetailsPlacementStringProperty, {
      tiles: new DerivedProperty([model.placedRhombiProperty], (placed) => `${placed.length}`),
      thick: new DerivedProperty([model.tileCountsProperty], (counts) => `${counts.thick}`),
      thin: new DerivedProperty([model.tileCountsProperty], (counts) => `${counts.thin}`),
      legal: new DerivedProperty([model.legalSlotCountProperty], (count) => `${count}`),
      forbidden: new DerivedProperty(
        [model.candidatesProperty, model.legalSlotCountProperty],
        (candidates, legal) => `${candidates.length - legal}`,
      ),
    });

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: new DerivedProperty(
        [model.modeProperty, tilingDetails, placementDetails],
        (mode, tiling, placement) => (mode === TilingMode.PLACEMENT ? placement : tiling),
      ),
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });
  }
}
