/**
 * MillerIndicesScreenView.ts
 *
 * The Miller Indices screen. A rotatable cubic cell on the left, the
 * step-by-step derivation and the worked-example presets on the right.
 *
 * Both directions of the translation are on screen at once: the preset buttons
 * go index → geometry, and the intercept controls go geometry → index, with the
 * derivation panel showing the same four stages either way.
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
import {
  formatDirection,
  formatDirectionFamily,
  formatPlane,
  formatPlaneFamily,
} from "../../common/model/MillerIndices.js";
import {
  controlColumn,
  createCheckbox,
  createHeading,
  createRadioGroup,
  createTextButton,
} from "../../common/view/ControlFactory.js";
import { DerivedQuantitiesPanel } from "../../common/view/DerivedQuantitiesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import { DIRECTION_PRESETS, type MillerIndicesModel, MillerMode, PLANE_PRESETS } from "../model/MillerIndicesModel.js";
import { DerivationPanel } from "./DerivationPanel.js";
import { MillerCellNode } from "./MillerCellNode.js";
import { MillerIndicesScreenSummaryContent } from "./MillerIndicesScreenSummaryContent.js";

export type MillerIndicesScreenViewOptions = ScreenViewOptions;

export class MillerIndicesScreenView extends ScreenView {
  private readonly cellNode: MillerCellNode;

  public constructor(model: MillerIndicesModel, providedOptions?: MillerIndicesScreenViewOptions) {
    const options = optionize<MillerIndicesScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new MillerIndicesScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance();
    const screenStrings = strings.getMillerIndicesStrings();
    const commonStrings = strings.getCommonStrings();
    const a11y = strings.getMillerIndicesA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: CrystalLatticeColors.backgroundColorProperty,
      }),
    );

    // ── Play area ─────────────────────────────────────────────────────────────
    const playAreaSize = this.layoutBounds.height - 2 * SCREEN_VIEW_MARGIN;
    this.cellNode = new MillerCellNode(model, playAreaSize, {
      x: SCREEN_VIEW_MARGIN + playAreaSize / 2,
      y: SCREEN_VIEW_MARGIN + playAreaSize / 2,
      cursor: "pointer",
      accessibleName: a11y.controls.cellRotationStringProperty,
      tagName: "div",
      focusable: true,
    });
    this.addChild(this.cellNode);

    // ── Mode and presets ──────────────────────────────────────────────────────
    const modeRadio = createRadioGroup(model.modeProperty, [
      {
        value: MillerMode.PLANE,
        label: screenStrings.planeModeStringProperty,
        accessibleName: a11y.controls.modeSelectorStringProperty,
      },
      {
        value: MillerMode.DIRECTION,
        label: screenStrings.directionModeStringProperty,
        accessibleName: a11y.controls.modeSelectorStringProperty,
      },
    ]);

    // Presets are the fastest way into the screen and cover the standard exam
    // set. (200) is included precisely because it looks like (100).
    const planeButtons = PLANE_PRESETS.map((indices) =>
      createTextButton(
        new Property(formatPlane(indices)),
        () => {
          model.modeProperty.value = MillerMode.PLANE;
          model.applyIndices(indices);
        },
        a11y.controls.presetButtonStringProperty,
      ),
    );
    const directionButtons = DIRECTION_PRESETS.map((indices) =>
      createTextButton(
        new Property(formatDirection(indices)),
        () => {
          model.modeProperty.value = MillerMode.DIRECTION;
          model.applyIndices(indices);
        },
        a11y.controls.presetButtonStringProperty,
      ),
    );

    const normalCheckbox = createCheckbox(
      screenStrings.showNormalStringProperty,
      model.showNormalProperty,
      a11y.controls.showNormalStringProperty,
    );
    const familyCheckbox = createCheckbox(
      screenStrings.showFamilyStringProperty,
      model.showFamilyProperty,
      a11y.controls.showFamilyStringProperty,
    );

    const controlsPanel = new CrystalLatticePanel(
      controlColumn([
        modeRadio,
        createHeading(screenStrings.presetsStringProperty),
        new HBox({ spacing: 4, children: planeButtons.slice(0, 3) }),
        new HBox({ spacing: 4, children: planeButtons.slice(3) }),
        new HBox({ spacing: 4, children: directionButtons.slice(0, 2) }),
        new HBox({ spacing: 4, children: directionButtons.slice(2) }),
        normalCheckbox,
        familyCheckbox,
      ]),
    );

    // ── Derivation ────────────────────────────────────────────────────────────
    const derivationPanel = new DerivationPanel(model.derivationProperty);
    // Only plane mode has a reciprocation step to show.
    model.modeProperty.link((mode) => {
      derivationPanel.visible = mode === MillerMode.PLANE;
    });

    // ── Live quantities ───────────────────────────────────────────────────────
    const indexRow = {
      // The row's own label switches with the mode: "Plane (hkl)" or
      // "Direction [uvw]", so the readout always names what it is showing.
      label: new DerivedProperty(
        [model.modeProperty, screenStrings.planeModeStringProperty, screenStrings.directionModeStringProperty],
        (mode, planeLabel, directionLabel) => (mode === MillerMode.PLANE ? planeLabel : directionLabel),
      ),
      value: new DerivedProperty(
        [model.modeProperty, model.planeIndicesProperty, model.directionIndicesProperty],
        (mode, plane, direction) => (mode === MillerMode.PLANE ? formatPlane(plane) : formatDirection(direction)),
      ),
      valueFill: CrystalLatticeColors.successColorProperty,
    };

    const quantitiesPanel = new DerivedQuantitiesPanel(
      [
        indexRow,
        {
          label: screenStrings.familyStringProperty,
          value: new DerivedProperty(
            [model.modeProperty, model.planeIndicesProperty, model.directionIndicesProperty],
            (mode, plane, direction) =>
              mode === MillerMode.PLANE ? formatPlaneFamily(plane) : formatDirectionFamily(direction),
          ),
        },
        {
          label: screenStrings.familySizeStringProperty,
          value: new DerivedProperty([model.familyProperty], (family) => `${family.length}`),
        },
        {
          label: screenStrings.interplanarSpacingStringProperty,
          value: new DerivedProperty([model.spacingProperty], (spacing) =>
            Number.isFinite(spacing) ? `${spacing.toFixed(4)} nm` : "∞",
          ),
        },
        {
          label: screenStrings.planarDensityStringProperty,
          value: new DerivedProperty([model.planarDensityProperty], (density) => `${density.toFixed(1)} /nm²`),
        },
      ],
      {
        titleProperty: commonStrings.quantitiesStringProperty,
        left: SCREEN_VIEW_MARGIN,
        bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      },
    );
    this.addChild(quantitiesPanel);

    // The (200) note sits under the play area, where a student who has just
    // pressed the (200) preset and seen "the same plane" will actually read it.
    const misconceptionNote = new Text(screenStrings.twoHundredNoteStringProperty, {
      font: new PhetFont(READOUT_FONT_SIZE - 1),
      fill: CrystalLatticeColors.textColorProperty,
      maxWidth: playAreaSize - 2 * SCREEN_VIEW_MARGIN,
      left: quantitiesPanel.right + PANEL_ROW_SPACING,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      opacity: 0.85,
    });
    this.addChild(misconceptionNote);

    this.addChild(
      new VBox({
        align: "left",
        spacing: CONTROL_COLUMN_SPACING,
        children: [controlsPanel, derivationPanel],
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
          this.cellNode,
          // The handles come straight after the cell they sit on: a keyboard
          // user reaches "rotate the cell", then "move each intercept", before
          // any panel control.
          ...this.cellNode.getHandles(),
          modeRadio,
          ...planeButtons,
          ...directionButtons,
          normalCheckbox,
          familyCheckbox,
          resetAllButton,
        ],
      }),
    );
  }

  /** Returns the camera to its default three-quarter view. */
  public reset(): void {
    this.cellNode.resetCamera();
  }
}
