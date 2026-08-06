/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { AperiodicOrderScreen } from "./aperiodic-order/AperiodicOrderScreen.js";
import CrystalLatticeColors from "./CrystalLatticeColors.js";
import { ClosePackingScreen } from "./close-packing/ClosePackingScreen.js";
import { CubicSystemsScreen } from "./cubic-systems/CubicSystemsScreen.js";
import { StringManager } from "./i18n/StringManager.js";
import { Lattices2DScreen } from "./lattices-2d/Lattices2DScreen.js";
import { MillerIndicesScreen } from "./miller-indices/MillerIndicesScreen.js";
import { CrystalLatticePreferencesModel } from "./preferences/CrystalLatticePreferencesModel.js";
import { CrystalLatticePreferencesNode } from "./preferences/CrystalLatticePreferencesNode.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from crystalLatticeQueryParameters.
  const simPreferences = new CrystalLatticePreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new Lattices2DScreen({
      name: stringManager.getScreenNames().lattices2DStringProperty,
      tandem: Tandem.ROOT.createTandem("lattices2DScreen"),
      backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
    }),
    new CubicSystemsScreen({
      name: stringManager.getScreenNames().cubicSystemsStringProperty,
      tandem: Tandem.ROOT.createTandem("cubicSystemsScreen"),
      backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
    }),
    new ClosePackingScreen({
      name: stringManager.getScreenNames().closePackingStringProperty,
      tandem: Tandem.ROOT.createTandem("closePackingScreen"),
      backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
    }),
    new MillerIndicesScreen({
      name: stringManager.getScreenNames().millerIndicesStringProperty,
      tandem: Tandem.ROOT.createTandem("millerIndicesScreen"),
      backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
    }),
    new AperiodicOrderScreen({
      name: stringManager.getScreenNames().aperiodicOrderStringProperty,
      tandem: Tandem.ROOT.createTandem("aperiodicOrderScreen"),
      backgroundColorProperty: CrystalLatticeColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new CrystalLatticePreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
