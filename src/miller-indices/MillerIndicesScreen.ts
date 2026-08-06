/**
 * MillerIndicesScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createMillerIndicesIcon() in src/common/CrystalLatticeScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { createMillerIndicesIcon } from "../common/CrystalLatticeScreenIcons.js";
import { MillerIndicesModel } from "./model/MillerIndicesModel.js";
import { MillerIndicesKeyboardHelpContent } from "./view/MillerIndicesKeyboardHelpContent.js";
import { MillerIndicesScreenView } from "./view/MillerIndicesScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type MillerIndicesScreenOptions = ScreenOptions & { tandem: Tandem };

export class MillerIndicesScreen extends Screen<MillerIndicesModel, MillerIndicesScreenView> {
  public constructor(options: MillerIndicesScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new MillerIndicesModel(),
      // View factory — receives the model instance
      (model) =>
        new MillerIndicesScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<MillerIndicesScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new MillerIndicesKeyboardHelpContent(),
          homeScreenIcon: createMillerIndicesIcon(),
          navigationBarIcon: createMillerIndicesIcon(),
        },
        options,
      ),
    );
  }
}
