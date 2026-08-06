/**
 * Lattices2DScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createLattices2DIcon() in src/common/CrystalLatticeScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { createLattices2DIcon } from "../common/CrystalLatticeScreenIcons.js";
import { Lattices2DModel } from "./model/Lattices2DModel.js";
import { Lattices2DKeyboardHelpContent } from "./view/Lattices2DKeyboardHelpContent.js";
import { Lattices2DScreenView } from "./view/Lattices2DScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type Lattices2DScreenOptions = ScreenOptions & { tandem: Tandem };

export class Lattices2DScreen extends Screen<Lattices2DModel, Lattices2DScreenView> {
  public constructor(options: Lattices2DScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new Lattices2DModel(),
      // View factory — receives the model instance
      (model) =>
        new Lattices2DScreenView(model, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<Lattices2DScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new Lattices2DKeyboardHelpContent(),
          homeScreenIcon: createLattices2DIcon(),
          navigationBarIcon: createLattices2DIcon(),
        },
        options,
      ),
    );
  }
}
