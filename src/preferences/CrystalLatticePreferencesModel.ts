/**
 * CrystalLatticePreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in crystalLatticeQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import CrystalLatticeNamespace from "../CrystalLatticeNamespace.js";
import crystalLatticeQueryParameters from "./crystalLatticeQueryParameters.js";

export class CrystalLatticePreferencesModel {
  /** Whether the quantity panels show the extra derived readouts. Initial value
   *  comes from the `showAdvancedReadouts` query parameter. */
  public readonly showAdvancedReadoutsProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showAdvancedReadoutsProperty = new BooleanProperty(
      crystalLatticeQueryParameters.showAdvancedReadouts,
      tandem ? { tandem: tandem.createTandem("showAdvancedReadoutsProperty") } : undefined,
    );
  }

  public reset(): void {
    this.showAdvancedReadoutsProperty.reset();
  }
}

CrystalLatticeNamespace.register("CrystalLatticePreferencesModel", CrystalLatticePreferencesModel);
