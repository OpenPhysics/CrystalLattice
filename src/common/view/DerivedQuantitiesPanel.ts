/**
 * DerivedQuantitiesPanel.ts
 *
 * The live readout panel every screen carries: a column of label/value rows
 * whose values are Properties, so they update as the student drags.
 *
 * Values are right-aligned against a fixed panel width so the numbers form a
 * column that is easy to scan while something else is being dragged — the whole
 * point of these panels is that a student watches them change.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { optionize } from "scenerystack/phet-core";
import { HBox, type Node, type TColor, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  CONTROL_PANEL_WIDTH,
  HEADING_FONT_SIZE,
  PANEL_ROW_SPACING,
  READOUT_FONT_SIZE,
} from "../../CrystalLatticeConstants.js";
import { CrystalLatticePanel, type CrystalLatticePanelOptions } from "../CrystalLatticePanel.js";

/** One label/value row. */
export type QuantityRow = {
  /** Localized label, e.g. "Atoms per cell". */
  readonly label: TReadOnlyProperty<string>;
  /** Localized or formatted value; a Property so the row is live. */
  readonly value: TReadOnlyProperty<string>;
  /** Optional colour override for the value, e.g. red when unphysical. */
  readonly valueFill?: TColor | TReadOnlyProperty<import("scenerystack/scenery").Color>;
  /** When false the row is hidden (e.g. advanced readouts preference off). */
  readonly visibleProperty?: TReadOnlyProperty<boolean>;
};

type SelfOptions = {
  /** Optional heading shown above the rows. */
  titleProperty?: TReadOnlyProperty<string> | null;
  /** Total panel content width in pixels. */
  contentWidth?: number;
};

export type DerivedQuantitiesPanelOptions = SelfOptions & CrystalLatticePanelOptions;

export class DerivedQuantitiesPanel extends CrystalLatticePanel {
  public constructor(rows: readonly QuantityRow[], providedOptions?: DerivedQuantitiesPanelOptions) {
    const options = optionize<DerivedQuantitiesPanelOptions, SelfOptions, CrystalLatticePanelOptions>()(
      {
        titleProperty: null,
        contentWidth: CONTROL_PANEL_WIDTH,
      },
      providedOptions,
    );

    const children: Node[] = [];

    if (options.titleProperty !== null) {
      children.push(
        new Text(options.titleProperty, {
          font: new PhetFont({ size: HEADING_FONT_SIZE, weight: "bold" }),
          fill: CrystalLatticeColors.textColorProperty,
          maxWidth: options.contentWidth,
        }),
      );
    }

    for (const row of rows) {
      children.push(createRow(row, options.contentWidth));
    }

    super(new VBox({ align: "left", spacing: PANEL_ROW_SPACING, children }), options);
  }
}

/**
 * A single row: label on the left, value pushed to the right edge by a spacer.
 * The label is allowed to shrink (maxWidth) before the value does, since a
 * truncated number would be worse than a truncated word.
 */
function createRow(row: QuantityRow, contentWidth: number): Node {
  const valueText = new Text(row.value, {
    font: new PhetFont({ size: READOUT_FONT_SIZE, weight: "bold" }),
    fill: row.valueFill ?? CrystalLatticeColors.accentColorProperty,
  });

  const labelText = new Text(row.label, {
    font: new PhetFont(READOUT_FONT_SIZE),
    fill: CrystalLatticeColors.textColorProperty,
    maxWidth: contentWidth * 0.6,
  });

  return new HBox({
    spacing: 6,
    align: "center",
    children: [labelText, valueText],
    preferredWidth: contentWidth,
    justify: "spaceBetween",
    ...(row.visibleProperty !== undefined && { visibleProperty: row.visibleProperty }),
  });
}
