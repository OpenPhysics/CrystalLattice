/**
 * DerivationPanel.ts
 *
 * Shows the four stages of turning intercepts into Miller indices, laid out as
 * a table with one column per axis:
 *
 *     1. Intercepts            1     1     ∞
 *     2. Reciprocals           1     1     0
 *     3. Cleared to integers   1     1     0
 *     4. Reduced             (110)
 *
 * The reciprocal row is the one students most reliably invert on an exam — they
 * clear fractions before reciprocating — so it is given its own line rather
 * than being folded into the answer.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { GridBox, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import { CONTROL_PANEL_WIDTH, READOUT_FONT_SIZE } from "../../CrystalLatticeConstants.js";
import { CrystalLatticePanel, type CrystalLatticePanelOptions } from "../../common/CrystalLatticePanel.js";
import { formatPlane, type PlaneDerivation } from "../../common/model/MillerIndices.js";
import { createHeading } from "../../common/view/ControlFactory.js";
import { StringManager } from "../../i18n/StringManager.js";

export class DerivationPanel extends CrystalLatticePanel {
  public constructor(
    derivationProperty: TReadOnlyProperty<PlaneDerivation>,
    providedOptions?: CrystalLatticePanelOptions,
  ) {
    const strings = StringManager.getInstance().getMillerIndicesStrings();

    const grid = new GridBox({
      xSpacing: 10,
      ySpacing: 6,
      xAlign: "left",
      children: [
        ...stageRow(0, strings.stepInterceptsStringProperty, derivationProperty, (derivation, axis) => {
          const intercept = derivation.intercepts[axis];
          return intercept === null ? "∞" : intercept.toString();
        }),
        ...stageRow(1, strings.stepReciprocalsStringProperty, derivationProperty, (derivation, axis) =>
          // biome-ignore lint/style/noNonNullAssertion: axis is always 0, 1 or 2
          derivation.reciprocals[axis]!.toString(),
        ),
        ...stageRow(
          2,
          strings.stepClearedStringProperty,
          derivationProperty,
          (derivation, axis) => `${derivation.cleared[axis]}`,
        ),
      ],
    });

    const reduced = new Text(
      new DerivedProperty([derivationProperty], (derivation) => formatPlane(derivation.indices)),
      {
        font: new PhetFont({ size: READOUT_FONT_SIZE + 4, weight: "bold" }),
        fill: CrystalLatticeColors.successColorProperty,
      },
    );

    const content = new GridBox({
      xSpacing: 10,
      ySpacing: 8,
      xAlign: "left",
      autoColumns: 1,
      children: [
        createHeading(strings.derivationStringProperty),
        grid,
        new Text(strings.stepReducedStringProperty, {
          font: new PhetFont(READOUT_FONT_SIZE),
          fill: CrystalLatticeColors.textColorProperty,
        }),
        reduced,
      ],
    });

    super(content, { maxWidth: CONTROL_PANEL_WIDTH + 24, ...providedOptions });
  }
}

/**
 * One row of the table: a label in column 0 and the three axis values in
 * columns 1–3, all bound live to the derivation.
 */
function stageRow(
  row: number,
  labelProperty: TReadOnlyProperty<string>,
  derivationProperty: TReadOnlyProperty<PlaneDerivation>,
  valueFor: (derivation: PlaneDerivation, axis: 0 | 1 | 2) => string,
): Text[] {
  const label = new Text(labelProperty, {
    font: new PhetFont(READOUT_FONT_SIZE),
    fill: CrystalLatticeColors.textColorProperty,
    maxWidth: CONTROL_PANEL_WIDTH * 0.62,
    layoutOptions: { column: 0, row },
  });

  const values = ([0, 1, 2] as const).map(
    (axis) =>
      new Text(new DerivedProperty([derivationProperty], (derivation) => valueFor(derivation, axis)), {
        font: new PhetFont({ size: READOUT_FONT_SIZE, weight: "bold" }),
        fill: CrystalLatticeColors.accentColorProperty,
        layoutOptions: { column: axis + 1, row },
      }),
  );

  return [label, ...values];
}
