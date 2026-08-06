/**
 * ClosePackingScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createClosePackingIcon() in src/common/CrystalLatticeScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { createClosePackingIcon } from "../common/CrystalLatticeScreenIcons.js";
import { ClosePackingModel } from "./model/ClosePackingModel.js";
import { ClosePackingKeyboardHelpContent } from "./view/ClosePackingKeyboardHelpContent.js";
import { ClosePackingScreenView } from "./view/ClosePackingScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type ClosePackingScreenOptions = ScreenOptions & { tandem: Tandem };

export class ClosePackingScreen extends Screen<ClosePackingModel, ClosePackingScreenView> {
  public constructor(options: ClosePackingScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new ClosePackingModel(),
      // View factory — receives the model instance
      (model) =>
        new ClosePackingScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<ClosePackingScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new ClosePackingKeyboardHelpContent(),
          homeScreenIcon: createClosePackingIcon(),
          navigationBarIcon: createClosePackingIcon(),
        },
        options,
      ),
    );
  }
}
