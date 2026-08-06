/**
 * AperiodicOrderScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createAperiodicOrderIcon() in src/common/CrystalLatticeScreenIcons.ts
 * (see doc/multi-screen.md).
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { createAperiodicOrderIcon } from "../common/CrystalLatticeScreenIcons.js";
import { AperiodicOrderModel } from "./model/AperiodicOrderModel.js";
import { AperiodicOrderKeyboardHelpContent } from "./view/AperiodicOrderKeyboardHelpContent.js";
import { AperiodicOrderScreenView } from "./view/AperiodicOrderScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type AperiodicOrderScreenOptions = ScreenOptions & { tandem: Tandem };

export class AperiodicOrderScreen extends Screen<AperiodicOrderModel, AperiodicOrderScreenView> {
  public constructor(options: AperiodicOrderScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new AperiodicOrderModel(),
      // View factory — receives the model instance
      (model) =>
        new AperiodicOrderScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<AperiodicOrderScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new AperiodicOrderKeyboardHelpContent(),
          homeScreenIcon: createAperiodicOrderIcon(),
          navigationBarIcon: createAperiodicOrderIcon(),
        },
        options,
      ),
    );
  }
}
