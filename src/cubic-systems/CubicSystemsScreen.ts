/**
 * CubicSystemsScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createCubicSystemsIcon() in src/common/CrystalLatticeScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { createCubicSystemsIcon } from "../common/CrystalLatticeScreenIcons.js";
import { CubicSystemsModel } from "./model/CubicSystemsModel.js";
import { CubicSystemsKeyboardHelpContent } from "./view/CubicSystemsKeyboardHelpContent.js";
import { CubicSystemsScreenView } from "./view/CubicSystemsScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type CubicSystemsScreenOptions = ScreenOptions & { tandem: Tandem };

export class CubicSystemsScreen extends Screen<CubicSystemsModel, CubicSystemsScreenView> {
  public constructor(options: CubicSystemsScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new CubicSystemsModel(),
      // View factory — receives the model instance
      (model) =>
        new CubicSystemsScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<CubicSystemsScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new CubicSystemsKeyboardHelpContent(),
          homeScreenIcon: createCubicSystemsIcon(),
          navigationBarIcon: createCubicSystemsIcon(),
        },
        options,
      ),
    );
  }
}
