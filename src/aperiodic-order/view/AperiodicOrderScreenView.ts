/**
 * AperiodicOrderScreenView.ts
 *
 * The Aperiodic Order screen. Real space on the left, its diffraction pattern
 * on the right, and — when the comparison is on — a periodic lattice's pattern
 * directly beneath it.
 *
 * The side-by-side layout is deliberate. The point is not that the aperiodic
 * pattern looks strange; it is that it looks *exactly as sharp* as the periodic
 * one and yet has a symmetry no periodic lattice can have. Toggling between two
 * views would let a student remember the first as blurrier than it was, so both
 * are on screen at once.
 */

import { DerivedProperty, StringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { HBox, Node, Rectangle, RichText, Text, VBox } from "scenerystack/scenery";
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
import { GOLDEN_RATIO } from "../../common/model/PenroseTiling.js";
import { controlColumn, createCheckbox, createRadioGroup, createTextButton } from "../../common/view/ControlFactory.js";
import { DerivedQuantitiesPanel } from "../../common/view/DerivedQuantitiesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import { type AperiodicOrderModel, TilingMode } from "../model/AperiodicOrderModel.js";
import { AperiodicOrderScreenSummaryContent } from "./AperiodicOrderScreenSummaryContent.js";
import { DiffractionNode } from "./DiffractionNode.js";
import { TilingNode } from "./TilingNode.js";

/** Height reserved at the bottom-right for the Reset All button. */
const RESET_BUTTON_CLEARANCE = 60;

export type AperiodicOrderScreenViewOptions = ScreenViewOptions;

export class AperiodicOrderScreenView extends ScreenView {
  public constructor(model: AperiodicOrderModel, providedOptions?: AperiodicOrderScreenViewOptions) {
    const options = optionize<AperiodicOrderScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new AperiodicOrderScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance();
    const screenStrings = strings.getAperiodicOrderStrings();
    const commonStrings = strings.getCommonStrings();
    const a11y = strings.getAperiodicOrderA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: CrystalLatticeColors.backgroundColorProperty,
      }),
    );

    // ── Framing text ──────────────────────────────────────────────────────────
    // Short, and above everything else: this screen only makes sense once the
    // student knows which assumption is being withdrawn.
    const intro = new RichText(screenStrings.introStringProperty, {
      font: new PhetFont(READOUT_FONT_SIZE),
      fill: CrystalLatticeColors.textColorProperty,
      lineWrap: this.layoutBounds.width - CONTROL_PANEL_WIDTH - 4 * SCREEN_VIEW_MARGIN,
      left: SCREEN_VIEW_MARGIN,
      top: SCREEN_VIEW_MARGIN,
    });
    this.addChild(intro);

    // ── Play area: real space beside reciprocal space ─────────────────────────
    const panelTop = intro.bottom + PANEL_ROW_SPACING;
    const available = this.layoutBounds.height - panelTop - SCREEN_VIEW_MARGIN;
    const tilingSize = Math.min(available, 330);
    const diffractionSize = Math.min(available / 2 - PANEL_ROW_SPACING, 170);

    const tilingNode = new TilingNode(model, tilingSize);
    const tilingFrame = new Node({
      children: [tilingNode],
      // The tiling is centred on its own local origin, so translate the frame
      // and clip to the square rather than fitting to bounds.
      clipArea: Rectangle.bounds(
        new Rectangle(-tilingSize / 2, -tilingSize / 2, tilingSize, tilingSize).bounds,
      ).getShape(),
    });

    const labelledTiling = new VBox({
      spacing: 4,
      children: [
        sectionLabel(screenStrings.realSpaceStringProperty),
        new Node({ children: [tilingFrame], localBounds: tilingFrame.clipArea?.bounds ?? tilingFrame.bounds }),
      ],
    });

    const diffractionNode = new DiffractionNode(model.diffractionProperty, diffractionSize, {
      accessibleName: a11y.controls.diffractionViewStringProperty,
      tagName: "div",
    });
    const comparisonNode = new DiffractionNode(model.comparisonDiffractionProperty, diffractionSize);
    model.compareLatticeProperty.link((compare) => {
      comparisonNode.visible = compare;
    });

    const diffractionColumn = new VBox({
      spacing: 4,
      align: "left",
      children: [
        sectionLabel(screenStrings.diffractionStringProperty),
        diffractionNode,
        sectionLabel(screenStrings.compareLatticeStringProperty),
        comparisonNode,
      ],
    });

    this.addChild(
      new HBox({
        spacing: PANEL_ROW_SPACING * 2,
        align: "top",
        children: [labelledTiling, diffractionColumn],
        left: SCREEN_VIEW_MARGIN,
        top: panelTop,
      }),
    );

    // ── Controls ──────────────────────────────────────────────────────────────
    const modeRadio = createRadioGroup(model.modeProperty, [
      {
        value: TilingMode.PENROSE,
        label: screenStrings.penroseModeStringProperty,
        accessibleName: a11y.controls.modeSelectorStringProperty,
      },
      {
        value: TilingMode.EINSTEIN,
        label: screenStrings.einsteinModeStringProperty,
        accessibleName: a11y.controls.modeSelectorStringProperty,
      },
      {
        value: TilingMode.PERIODIC,
        label: screenStrings.periodicModeStringProperty,
        accessibleName: a11y.controls.modeSelectorStringProperty,
      },
    ]);

    const inflateButton = createTextButton(
      screenStrings.inflateStringProperty,
      () => model.inflate(),
      a11y.controls.inflateStringProperty,
    );
    const deflateButton = createTextButton(
      screenStrings.deflateStringProperty,
      () => model.deflate(),
      a11y.controls.deflateStringProperty,
    );

    // Inflation is capped so the direct-sum transform stays in its cheap regime;
    // disabling the button says so more clearly than a silent frame-rate cliff.
    const updateInflateEnabled = () => {
      inflateButton.enabled = model.canInflate();
    };
    model.modeProperty.link(updateInflateEnabled);
    model.inflationStepsProperty.link(updateInflateEnabled);
    model.hatStepsProperty.link(updateInflateEnabled);

    const orientationsCheckbox = createCheckbox(
      screenStrings.highlightOrientationsStringProperty,
      model.highlightOrientationsProperty,
      a11y.controls.highlightOrientationsStringProperty,
    );
    const metatilesCheckbox = createCheckbox(
      screenStrings.showMetatilesStringProperty,
      model.showMetatilesProperty,
      a11y.controls.showMetatilesStringProperty,
    );
    const reflectedCheckbox = createCheckbox(
      screenStrings.showReflectedStringProperty,
      model.showReflectedProperty,
      a11y.controls.showReflectedStringProperty,
    );
    const compareCheckbox = createCheckbox(
      screenStrings.compareLatticeStringProperty,
      model.compareLatticeProperty,
      a11y.controls.compareLatticeStringProperty,
    );

    // Each mode's overlays only make sense in that mode.
    model.modeProperty.link((mode) => {
      orientationsCheckbox.visible = mode === TilingMode.PENROSE;
      metatilesCheckbox.visible = mode === TilingMode.EINSTEIN;
      reflectedCheckbox.visible = mode === TilingMode.EINSTEIN;
    });

    const controlsPanel = new CrystalLatticePanel(
      controlColumn([
        modeRadio,
        new HBox({ spacing: 4, children: [deflateButton, inflateButton] }),
        orientationsCheckbox,
        metatilesCheckbox,
        reflectedCheckbox,
        compareCheckbox,
      ]),
    );

    // ── Live quantities ───────────────────────────────────────────────────────
    const quantitiesPanel = new DerivedQuantitiesPanel(
      [
        // Rows that belong to another mode read "—" rather than showing a
        // stale count from a tiling that is not on screen.
        {
          label: screenStrings.thickTilesStringProperty,
          value: penroseOnly(model, (counts) => `${counts.thick}`),
        },
        {
          label: screenStrings.thinTilesStringProperty,
          value: penroseOnly(model, (counts) => `${counts.thin}`),
        },
        {
          label: screenStrings.tileRatioStringProperty,
          value: penroseOnly(model, (counts) =>
            Number.isFinite(counts.ratio) ? counts.ratio.toFixed(4) : NOT_APPLICABLE,
          ),
          valueFill: CrystalLatticeColors.successColorProperty,
        },
        {
          label: screenStrings.goldenRatioStringProperty,
          // A mathematical constant, so a fixed StringProperty rather than a
          // locale-driven or model-driven one.
          value: new StringProperty(GOLDEN_RATIO.toFixed(4)),
        },
        {
          label: screenStrings.hatCountStringProperty,
          value: einsteinOnly(model, (counts) => `${counts.total}`),
        },
        {
          label: screenStrings.reflectedCountStringProperty,
          value: einsteinOnly(model, (counts) => `${counts.reflected}`),
        },
        {
          label: screenStrings.pointCountStringProperty,
          value: new DerivedProperty([model.scatterersProperty], (points) => `${points.length}`),
        },
        {
          label: screenStrings.peakCountStringProperty,
          value: new DerivedProperty([model.peakCountProperty], (count) => `${count}`),
        },
        {
          label: screenStrings.symmetryOrderStringProperty,
          value: new DerivedProperty([model.symmetryOrderProperty], (order) => `${order}`),
          valueFill: CrystalLatticeColors.warningColorProperty,
        },
      ],
      { titleProperty: commonStrings.quantitiesStringProperty },
    );

    // ── The historical hook ───────────────────────────────────────────────────
    // Shechtman's measurement is what turns this screen from a geometry puzzle
    // into physics, so the note lives beside the pattern it describes.
    const notes = new CrystalLatticePanel(
      new VBox({
        align: "left",
        spacing: 6,
        children: [
          wrappedNote(screenStrings.forbiddenNoteStringProperty),
          wrappedNote(screenStrings.shechtmanNoteStringProperty),
          wrappedNote(screenStrings.hatSpectreNoteStringProperty),
        ],
      }),
    );

    this.addChild(
      new VBox({
        align: "left",
        spacing: CONTROL_COLUMN_SPACING,
        children: [controlsPanel, quantitiesPanel, notes],
        right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
        top: SCREEN_VIEW_MARGIN,
        maxWidth: CONTROL_PANEL_WIDTH + 2 * PANEL_ROW_SPACING,
        // Stop short of the Reset All button's corner so the notes never sit
        // underneath it.
        maxHeight: this.layoutBounds.height - 3 * SCREEN_VIEW_MARGIN - RESET_BUTTON_CLEARANCE,
      }),
    );

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => model.reset(),
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    this.addChild(
      new Node({
        pdomOrder: [
          modeRadio,
          deflateButton,
          inflateButton,
          orientationsCheckbox,
          metatilesCheckbox,
          reflectedCheckbox,
          compareCheckbox,
          diffractionNode,
          resetAllButton,
        ],
      }),
    );
  }

  /** No view-side state beyond what the model drives. */
  public reset(): void {
    // Intentionally empty — every visible piece of this screen is model-driven.
  }
}

/** Shown in place of a count that belongs to a mode other than the current one. */
const NOT_APPLICABLE = "—";

/** A tile-count readout that blanks out unless the Penrose tiling is on screen. */
function penroseOnly(
  model: AperiodicOrderModel,
  format: (counts: ReturnType<typeof model.tileCountsProperty.get>) => string,
): TReadOnlyProperty<string> {
  return new DerivedProperty([model.modeProperty, model.tileCountsProperty], (mode, counts) =>
    mode === TilingMode.PENROSE ? format(counts) : NOT_APPLICABLE,
  );
}

/** A hat-count readout that blanks out unless the hat patch is on screen. */
function einsteinOnly(
  model: AperiodicOrderModel,
  format: (counts: ReturnType<typeof model.hatCountsProperty.get>) => string,
): TReadOnlyProperty<string> {
  return new DerivedProperty([model.modeProperty, model.hatCountsProperty], (mode, counts) =>
    mode === TilingMode.EINSTEIN ? format(counts) : NOT_APPLICABLE,
  );
}

/** A small caption over one half of the play area. */
function sectionLabel(labelProperty: TReadOnlyProperty<string>): Text {
  return new Text(labelProperty, {
    font: new PhetFont({ size: READOUT_FONT_SIZE, weight: "bold" }),
    fill: CrystalLatticeColors.textColorProperty,
  });
}

/** One of the explanatory notes, wrapped to the control column's width. */
function wrappedNote(textProperty: TReadOnlyProperty<string>): RichText {
  return new RichText(textProperty, {
    font: new PhetFont(READOUT_FONT_SIZE - 2),
    fill: CrystalLatticeColors.textColorProperty,
    lineWrap: CONTROL_PANEL_WIDTH,
    opacity: 0.9,
  });
}
