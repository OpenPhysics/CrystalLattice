/**
 * ClosePackingScreenView.ts
 *
 * The Close-Packing screen. Its whole argument is a comparison, so the two
 * canonical sequences sit next to each other as radio buttons and the packing
 * fraction stays visible while the student switches between them: the picture
 * changes completely, the number does not move.
 *
 * The custom-sequence field is the challenge mode — type ABCACB and the screen
 * classifies it as a stacking fault and renders it.
 */

import { DerivedProperty, Property } from "scenerystack/axon";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  CONTROL_COLUMN_SPACING,
  CONTROL_PANEL_WIDTH,
  PANEL_ROW_SPACING,
  READOUT_FONT_SIZE,
  SCREEN_VIEW_MARGIN,
} from "../../CrystalLatticeConstants.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/CrystalLatticeButtonOptions.js";
import { CrystalLatticePanel } from "../../common/CrystalLatticePanel.js";
import { IDEAL_C_OVER_A } from "../../common/model/ClosePacking.js";
import {
  controlColumn,
  createCheckbox,
  createHeading,
  createLabel,
  createRadioGroup,
  createSlider,
  createTextButton,
} from "../../common/view/ControlFactory.js";
import { DerivedQuantitiesPanel } from "../../common/view/DerivedQuantitiesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import { C_OVER_A_RANGE, type ClosePackingModel, LAYER_COUNT_RANGE, SequenceMode } from "../model/ClosePackingModel.js";
import { ClosePackingScreenSummaryContent } from "./ClosePackingScreenSummaryContent.js";
import { LayerStackNode } from "./LayerStackNode.js";
import { sequenceTextProperty, stackingTypeStringProperty } from "./stackingStrings.js";

export type ClosePackingScreenViewOptions = ScreenViewOptions;

export class ClosePackingScreenView extends ScreenView {
  private readonly stackNode: LayerStackNode;

  public constructor(model: ClosePackingModel, providedOptions?: ClosePackingScreenViewOptions) {
    const options = optionize<ClosePackingScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new ClosePackingScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance();
    const screenStrings = strings.getClosePackingStrings();
    const commonStrings = strings.getCommonStrings();
    const a11y = strings.getClosePackingA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: CrystalLatticeColors.backgroundColorProperty,
      }),
    );

    // ── Play area ─────────────────────────────────────────────────────────────
    const playAreaSize = this.layoutBounds.height - 2 * SCREEN_VIEW_MARGIN;
    this.stackNode = new LayerStackNode(model, playAreaSize, {
      x: SCREEN_VIEW_MARGIN + playAreaSize / 2,
      y: SCREEN_VIEW_MARGIN + playAreaSize / 2,
      cursor: "pointer",
      accessibleName: a11y.controls.stackRotationStringProperty,
      tagName: "div",
      focusable: true,
    });
    this.addChild(this.stackNode);

    // ── Controls ──────────────────────────────────────────────────────────────
    const sequenceRadio = createRadioGroup(model.sequenceModeProperty, [
      {
        value: SequenceMode.HCP,
        label: screenStrings.types.hcpStringProperty,
        accessibleName: screenStrings.types.hcpStringProperty,
      },
      {
        value: SequenceMode.FCC,
        label: screenStrings.types.fccStringProperty,
        accessibleName: screenStrings.types.fccStringProperty,
      },
      {
        value: SequenceMode.CUSTOM,
        label: screenStrings.types.customStringProperty,
        accessibleName: screenStrings.types.customStringProperty,
      },
    ]);

    // The custom sequence is chosen from a short list of instructive examples
    // rather than typed free-form: a text field on a touch screen is a poor fit
    // for a six-character answer, and these six cover the interesting cases.
    const customExamples = ["ABCACB", "ABABCB", "ABCBAB", "ABACBC"];
    const customButtons = customExamples.map((example) =>
      createTextButton(
        new Property(example),
        () => {
          model.customSequenceTextProperty.value = example;
          model.sequenceModeProperty.value = SequenceMode.CUSTOM;
        },
        a11y.controls.sequenceInputStringProperty,
      ),
    );

    const layerSlider = createSlider(
      screenStrings.layerCountStringProperty,
      model.layerCountProperty,
      LAYER_COUNT_RANGE,
      a11y.controls.layerCountSliderStringProperty,
      { decimalPlaces: 0, delta: 1 },
    );
    const ratioSlider = createSlider(
      screenStrings.cOverAStringProperty,
      model.cOverAProperty,
      C_OVER_A_RANGE,
      a11y.controls.cOverASliderStringProperty,
      { decimalPlaces: 3, delta: 0.005 },
    );
    const idealButton = createTextButton(
      screenStrings.idealRatioStringProperty,
      () => model.snapToIdealRatio(),
      screenStrings.idealRatioStringProperty,
    );
    const labelsCheckbox = createCheckbox(
      screenStrings.showLabelsStringProperty,
      model.showLabelsProperty,
      a11y.controls.showLabelsStringProperty,
    );

    const controlsPanel = new CrystalLatticePanel(
      controlColumn([
        createHeading(screenStrings.sequenceStringProperty),
        sequenceRadio,
        new HBox({ spacing: 4, children: customButtons.slice(0, 2) }),
        new HBox({ spacing: 4, children: customButtons.slice(2) }),
        layerSlider,
        ratioSlider,
        idealButton,
        labelsCheckbox,
      ]),
    );

    // ── Real HCP metals ───────────────────────────────────────────────────────
    // A static reference table: the ideal ratio is a hard-sphere idealization,
    // and every real metal misses it, which is the point of showing them.
    const metalRows = model.realMetals.map(
      (metal) =>
        new HBox({
          spacing: 8,
          preferredWidth: CONTROL_PANEL_WIDTH,
          justify: "spaceBetween",
          children: [
            new Text(metal.symbol, {
              font: new PhetFont(READOUT_FONT_SIZE),
              fill: CrystalLatticeColors.textColorProperty,
            }),
            new Text(metal.cOverA.toFixed(3), {
              font: new PhetFont({ size: READOUT_FONT_SIZE, weight: "bold" }),
              fill:
                Math.abs(metal.cOverA - IDEAL_C_OVER_A) < 0.02
                  ? CrystalLatticeColors.successColorProperty
                  : CrystalLatticeColors.accentColorProperty,
            }),
          ],
        }),
    );
    const metalsPanel = new CrystalLatticePanel(
      controlColumn(
        [
          createHeading(screenStrings.realCrystalsStringProperty),
          createLabel(
            new DerivedProperty(
              [screenStrings.idealRatioStringProperty],
              (label) => `${label}: ${IDEAL_C_OVER_A.toFixed(3)}`,
            ),
          ),
          ...metalRows,
        ],
        4,
      ),
    );

    // ── Live quantities ───────────────────────────────────────────────────────
    const quantitiesPanel = new DerivedQuantitiesPanel(
      [
        {
          label: screenStrings.sequenceStringProperty,
          value: sequenceTextProperty(model.sequenceProperty),
        },
        {
          label: screenStrings.stackingTypeStringProperty,
          value: stackingTypeStringProperty(model.stackingTypeProperty),
          valueFill: CrystalLatticeColors.successColorProperty,
        },
        {
          label: commonStrings.coordinationNumberStringProperty,
          value: new DerivedProperty([model.coordinationNumberProperty], (count) => `${count}`),
        },
        {
          label: commonStrings.packingFractionStringProperty,
          value: new DerivedProperty([model.packingFractionProperty], (fraction) => fraction.toFixed(4)),
        },
        {
          label: screenStrings.interlayerSpacingStringProperty,
          value: new DerivedProperty([model.interlayerSpacingProperty], (spacing) => `${spacing.toFixed(4)} nm`),
        },
      ],
      {
        titleProperty: commonStrings.quantitiesStringProperty,
        left: SCREEN_VIEW_MARGIN,
        bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      },
    );
    this.addChild(quantitiesPanel);

    this.addChild(
      new VBox({
        align: "left",
        spacing: CONTROL_COLUMN_SPACING,
        children: [controlsPanel, metalsPanel],
        right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
        top: SCREEN_VIEW_MARGIN,
        maxWidth: CONTROL_PANEL_WIDTH + 2 * PANEL_ROW_SPACING,
      }),
    );

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    this.addChild(
      new Node({
        pdomOrder: [
          this.stackNode,
          sequenceRadio,
          ...customButtons,
          layerSlider,
          ratioSlider,
          idealButton,
          labelsCheckbox,
          resetAllButton,
        ],
      }),
    );
  }

  /** Returns the camera to its default three-quarter view. */
  public reset(): void {
    this.stackNode.resetCamera();
  }
}
