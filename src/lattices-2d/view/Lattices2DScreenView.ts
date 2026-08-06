/**
 * Lattices2DScreenView.ts
 *
 * The 2D Lattices screen. The play area holds the lattice and its draggable
 * primitive vectors; the right-hand column holds the sliders that set them, the
 * overlay toggles, the "snap to" check control, and the live quantity panel.
 *
 * The lattice-type readout is the centrepiece: it is derived from the sliders,
 * never selected, so the five Bravais lattices are things a student discovers
 * by dragging rather than picks from a menu.
 */

import { DerivedProperty, Property } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Node, Rectangle, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  CONTROL_COLUMN_SPACING,
  CONTROL_PANEL_WIDTH,
  PANEL_ROW_SPACING,
  SCREEN_VIEW_MARGIN,
} from "../../CrystalLatticeConstants.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/CrystalLatticeButtonOptions.js";
import { CrystalLatticePanel } from "../../common/CrystalLatticePanel.js";
import { Lattice2DType } from "../../common/model/Lattice2D.js";
import {
  controlColumn,
  createCheckbox,
  createComboBox,
  createHeading,
  createSlider,
} from "../../common/view/ControlFactory.js";
import { DerivedQuantitiesPanel } from "../../common/view/DerivedQuantitiesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import { GAMMA_RANGE, LATTICE_VECTOR_RANGE, type Lattices2DModel } from "../model/Lattices2DModel.js";
import { Lattice2DNode } from "./Lattice2DNode.js";
import { Lattices2DScreenSummaryContent } from "./Lattices2DScreenSummaryContent.js";
import { latticeTypeStringProperty } from "./latticeTypeStrings.js";

export type Lattices2DScreenViewOptions = ScreenViewOptions;

export class Lattices2DScreenView extends ScreenView {
  public constructor(model: Lattices2DModel, providedOptions?: Lattices2DScreenViewOptions) {
    const options = optionize<Lattices2DScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new Lattices2DScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance();
    const screenStrings = strings.getLattices2DStrings();
    const commonStrings = strings.getCommonStrings();
    const a11y = strings.getLattices2DA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: CrystalLatticeColors.backgroundColorProperty,
      }),
    );

    // ── Play area ─────────────────────────────────────────────────────────────
    // The generated lattice always overruns the visible square, so the node is
    // wrapped in a clipping frame; without it, stray lattice points would draw
    // over the control column.
    const playAreaSize = this.layoutBounds.height - 2 * SCREEN_VIEW_MARGIN;
    const latticeNode = new Lattice2DNode(model, playAreaSize);
    const playAreaFrame = new Node({
      children: [latticeNode],
      clipArea: Shape.rectangle(0, 0, playAreaSize, playAreaSize),
      left: SCREEN_VIEW_MARGIN,
      top: SCREEN_VIEW_MARGIN,
    });
    this.addChild(playAreaFrame);

    // ── Controls ──────────────────────────────────────────────────────────────
    const comboBoxParent = new Node();

    const a1Slider = createSlider(
      screenStrings.vectorA1StringProperty,
      model.a1Property,
      LATTICE_VECTOR_RANGE,
      a11y.controls.vectorA1SliderStringProperty,
      { decimalPlaces: 3, units: "nm", delta: 0.005 },
    );
    const a2Slider = createSlider(
      screenStrings.vectorA2StringProperty,
      model.a2Property,
      LATTICE_VECTOR_RANGE,
      a11y.controls.vectorA2SliderStringProperty,
      { decimalPlaces: 3, units: "nm", delta: 0.005 },
    );
    const gammaSlider = createSlider(
      screenStrings.gammaStringProperty,
      model.gammaDegreesProperty,
      GAMMA_RANGE,
      a11y.controls.gammaSliderStringProperty,
      { decimalPlaces: 0, units: "°", delta: 1 },
    );

    const centeredCheckbox = createCheckbox(
      screenStrings.centeredBasisStringProperty,
      model.centeredBasisProperty,
      a11y.controls.centeredBasisStringProperty,
    );

    // The "snap to" control is a check on an answer, not the way in, so it sits
    // below the sliders rather than at the top of the column.
    const snapProperty = new Property<Lattice2DType>(Lattice2DType.SQUARE);
    snapProperty.lazyLink((type) => model.snapTo(type));
    const snapComboBox = createComboBox(
      snapProperty,
      [
        { value: Lattice2DType.SQUARE, label: screenStrings.types.squareStringProperty },
        { value: Lattice2DType.RECTANGULAR, label: screenStrings.types.rectangularStringProperty },
        {
          value: Lattice2DType.CENTERED_RECTANGULAR,
          label: screenStrings.types.centeredRectangularStringProperty,
        },
        { value: Lattice2DType.HEXAGONAL, label: screenStrings.types.hexagonalStringProperty },
        { value: Lattice2DType.OBLIQUE, label: screenStrings.types.obliqueStringProperty },
      ],
      comboBoxParent,
      a11y.controls.snapToStringProperty,
    );

    const controlsPanel = new CrystalLatticePanel(
      controlColumn([
        a1Slider,
        a2Slider,
        gammaSlider,
        centeredCheckbox,
        createHeading(screenStrings.snapToStringProperty),
        snapComboBox,
      ]),
    );

    const overlayCheckboxes = [
      createCheckbox(
        screenStrings.primitiveCellStringProperty,
        model.showPrimitiveCellProperty,
        a11y.controls.primitiveCellStringProperty,
      ),
      createCheckbox(
        screenStrings.wignerSeitzCellStringProperty,
        model.showWignerSeitzProperty,
        a11y.controls.wignerSeitzCellStringProperty,
      ),
      createCheckbox(
        screenStrings.bisectorsStringProperty,
        model.showBisectorsProperty,
        a11y.controls.bisectorsStringProperty,
      ),
      createCheckbox(
        screenStrings.coordinationShellStringProperty,
        model.showCoordinationProperty,
        a11y.controls.coordinationShellStringProperty,
      ),
    ];

    const overlaysPanel = new CrystalLatticePanel(
      controlColumn([createHeading(commonStrings.overlaysStringProperty), ...overlayCheckboxes]),
    );

    // ── Live quantities ───────────────────────────────────────────────────────
    const quantitiesPanel = new DerivedQuantitiesPanel(
      [
        {
          label: screenStrings.latticeTypeStringProperty,
          value: latticeTypeStringProperty(model.latticeTypeProperty),
          valueFill: CrystalLatticeColors.successColorProperty,
        },
        {
          label: screenStrings.cellAreaStringProperty,
          value: new DerivedProperty([model.cellAreaProperty], (area) => `${area.toFixed(4)} nm²`),
        },
        {
          label: commonStrings.atomsPerCellStringProperty,
          value: new DerivedProperty([model.atomsPerCellProperty], (count) => `${count}`),
        },
        {
          label: commonStrings.coordinationNumberStringProperty,
          value: new DerivedProperty([model.coordinationProperty], (shell) => `${shell.count}`),
        },
        {
          label: screenStrings.nearestNeighbourStringProperty,
          value: new DerivedProperty([model.coordinationProperty], (shell) => `${shell.distance.toFixed(3)} nm`),
        },
        {
          label: screenStrings.arealDensityStringProperty,
          value: new DerivedProperty([model.arealDensityProperty], (density) => `${density.toFixed(1)} /nm²`),
        },
        {
          label: commonStrings.packingFractionStringProperty,
          value: new DerivedProperty([model.packingFractionProperty], (fraction) => fraction.toFixed(3)),
        },
      ],
      {
        titleProperty: commonStrings.quantitiesStringProperty,
        // The quantity panel sits over the play area's lower-left corner rather
        // than under the controls: seven live rows plus three control panels do
        // not fit in one column, and these numbers are what the student watches
        // while dragging, so they belong next to the lattice.
        left: SCREEN_VIEW_MARGIN,
        bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      },
    );
    this.addChild(quantitiesPanel);

    const controlColumnNode = new VBox({
      align: "left",
      spacing: CONTROL_COLUMN_SPACING,
      children: [controlsPanel, overlaysPanel],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: SCREEN_VIEW_MARGIN,
      maxWidth: CONTROL_PANEL_WIDTH + 2 * PANEL_ROW_SPACING,
    });
    this.addChild(controlColumnNode);

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

    // The combo-box list must be able to pop over everything, so its parent is
    // added last and sits above the panels in z-order.
    this.addChild(comboBoxParent);

    // ── Accessibility: traversal order ────────────────────────────────────────
    this.addChild(
      new Node({
        pdomOrder: [
          latticeNode,
          a1Slider,
          a2Slider,
          gammaSlider,
          centeredCheckbox,
          snapComboBox,
          ...overlayCheckboxes,
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
