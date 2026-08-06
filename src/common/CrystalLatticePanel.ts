/**
 * CrystalLatticePanel.ts
 *
 * A pre-themed Panel that automatically uses CrystalLatticeColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { CrystalLatticePanel } from "../../common/CrystalLatticePanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new CrystalLatticePanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new CrystalLatticePanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new CrystalLatticePanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { PANEL_CORNER_RADIUS } from "../CrystalLatticeConstants.js";

export type CrystalLatticePanelOptions = PanelOptions;

export class CrystalLatticePanel extends Panel {
  public constructor(content: Node, providedOptions?: CrystalLatticePanelOptions) {
    const options = optionize<CrystalLatticePanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: CrystalLatticeColors.panelBackgroundColorProperty,
        stroke: CrystalLatticeColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
