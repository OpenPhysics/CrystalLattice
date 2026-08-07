/**
 * CubicSystemsScreenView.ts
 *
 * The Cubic Systems screen. The play area holds a rotatable cubic unit cell;
 * the right-hand column selects the structure and sets a and r; the quantity
 * panel shows the counting and packing results the screen exists to produce.
 *
 * The touching-condition row is written as the algebra (a = 2r, a = 4r/√3,
 * a = 2√2 r) rather than as a number, so the relation a student would derive on
 * paper is on screen next to the picture it comes from.
 */

import { DerivedProperty, PatternStringProperty, Property, StringProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
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
import { CubicStructure } from "../../common/model/CubicCell.js";
import type { ReferenceElement } from "../../common/model/ReferenceElements.js";
import {
  controlColumn,
  createCheckbox,
  createComboBox,
  createHeading,
  createSlider,
  createTextButton,
} from "../../common/view/ControlFactory.js";
import { DerivedQuantitiesPanel } from "../../common/view/DerivedQuantitiesPanel.js";
import { StringManager } from "../../i18n/StringManager.js";
import { ATOM_RADIUS_RANGE, CELL_EDGE_RANGE, type CubicSystemsModel } from "../model/CubicSystemsModel.js";
import { CubicCellNode } from "./CubicCellNode.js";
import { CubicSystemsScreenSummaryContent } from "./CubicSystemsScreenSummaryContent.js";
import { touchingRelationStringProperty } from "./cubicStructureStrings.js";

export type CubicSystemsScreenViewOptions = ScreenViewOptions;

export class CubicSystemsScreenView extends ScreenView {
  private readonly cellNode: CubicCellNode;

  public constructor(model: CubicSystemsModel, providedOptions?: CubicSystemsScreenViewOptions) {
    const options = optionize<CubicSystemsScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      { screenSummaryContent: new CubicSystemsScreenSummaryContent(model) },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance();
    const screenStrings = strings.getCubicSystemsStrings();
    const commonStrings = strings.getCommonStrings();
    const a11y = strings.getCubicSystemsA11yStrings();

    this.addChild(
      new Rectangle(0, 0, this.layoutBounds.width, this.layoutBounds.height, {
        fill: CrystalLatticeColors.backgroundColorProperty,
      }),
    );

    // ── Play area ─────────────────────────────────────────────────────────────
    const playAreaSize = this.layoutBounds.height - 2 * SCREEN_VIEW_MARGIN;
    this.cellNode = new CubicCellNode(model, playAreaSize, {
      // The projection already centres the cell on this node's local origin, so
      // translate rather than centre: a bounds-based centre would drift every
      // time a rebuild changed the cell's extent.
      x: SCREEN_VIEW_MARGIN + playAreaSize / 2,
      y: SCREEN_VIEW_MARGIN + playAreaSize / 2,
      cursor: "pointer",
      accessibleName: a11y.controls.cellRotationStringProperty,
      tagName: "div",
      focusable: true,
    });
    this.addChild(this.cellNode);

    // ── Controls ──────────────────────────────────────────────────────────────
    const comboBoxParent = new Node();

    const structureComboBox = createComboBox(
      model.structureProperty,
      [
        { value: CubicStructure.SIMPLE_CUBIC, label: screenStrings.structures.simpleCubicStringProperty },
        { value: CubicStructure.BODY_CENTERED, label: screenStrings.structures.bodyCenteredStringProperty },
        { value: CubicStructure.FACE_CENTERED, label: screenStrings.structures.faceCenteredStringProperty },
      ],
      comboBoxParent,
      a11y.controls.structureSelectorStringProperty,
    );

    const edgeSlider = createSlider(
      screenStrings.cellEdgeStringProperty,
      model.edgeLengthProperty,
      CELL_EDGE_RANGE,
      a11y.controls.cellEdgeSliderStringProperty,
      { decimalPlaces: 3, unitsPattern: commonStrings.unitsNmStringProperty, delta: 0.005 },
    );
    const radiusSlider = createSlider(
      screenStrings.atomicRadiusStringProperty,
      model.atomRadiusProperty,
      ATOM_RADIUS_RANGE,
      a11y.controls.atomicRadiusSliderStringProperty,
      { decimalPlaces: 3, unitsPattern: commonStrings.unitsNmStringProperty, delta: 0.002 },
    );
    const snapButton = createTextButton(
      screenStrings.snapToTouchingStringProperty,
      () => model.snapRadiusToTouching(),
      a11y.controls.snapToTouchingStringProperty,
    );

    const clipCheckbox = createCheckbox(
      screenStrings.clipPlaneStringProperty,
      model.clipFrontProperty,
      a11y.controls.clipPlaneStringProperty,
    );
    const sharingCheckbox = createCheckbox(
      screenStrings.showSharingStringProperty,
      model.showSharingProperty,
      a11y.controls.showSharingStringProperty,
    );

    // Selecting an element adopts its structure and lattice constant, so the
    // computed density can be read straight against the measured one.
    const elementProperty = new Property<ReferenceElement | null>(null);
    elementProperty.lazyLink((element) => {
      if (element !== null) {
        model.loadElement(element);
      }
    });
    model.selectedElementProperty.link((element) => {
      elementProperty.value = element;
    });

    const elementComboBox = createComboBox(
      elementProperty,
      [
        // A "none" entry so the screen can open with no element chosen — the
        // density comparison is an optional mode, not the screen's default.
        { value: null as ReferenceElement | null, label: commonStrings.noneStringProperty },
        ...model.referenceElements.map((element) => ({
          value: element as ReferenceElement | null,
          // Chemical symbols and element names are not translated, so a plain
          // StringProperty is right here rather than a locale-driven one.
          label: new StringProperty(`${element.symbol} — ${element.name}`),
        })),
      ],
      comboBoxParent,
      a11y.controls.elementSelectorStringProperty,
    );

    const controlsPanel = new CrystalLatticePanel(
      controlColumn([
        createHeading(commonStrings.structureStringProperty),
        structureComboBox,
        edgeSlider,
        radiusSlider,
        snapButton,
        clipCheckbox,
        sharingCheckbox,
      ]),
    );

    const elementPanel = new CrystalLatticePanel(
      controlColumn([createHeading(screenStrings.identifyElementStringProperty), elementComboBox]),
    );

    const computedDensityFormattedProperty = new PatternStringProperty(commonStrings.valueGPerCm3StringProperty, {
      value: new DerivedProperty([model.computedDensityProperty], (density) =>
        density === null ? "" : toFixed(density, 2),
      ),
    });
    const measuredDensityFormattedProperty = new PatternStringProperty(commonStrings.valueGPerCm3StringProperty, {
      value: new DerivedProperty([model.selectedElementProperty], (element) =>
        element === null ? "" : toFixed(element.measuredDensity, 2),
      ),
    });

    // ── Live quantities ───────────────────────────────────────────────────────
    const quantitiesPanel = new DerivedQuantitiesPanel(
      [
        {
          label: commonStrings.atomsPerCellStringProperty,
          value: new DerivedProperty([model.atomsPerCellProperty], (count) => `${count}`),
        },
        {
          label: commonStrings.coordinationNumberStringProperty,
          value: new DerivedProperty([model.coordinationNumberProperty], (count) => `${count}`),
        },
        {
          label: screenStrings.touchingRelationStringProperty,
          value: touchingRelationStringProperty(model.structureProperty),
        },
        {
          label: screenStrings.touchingRadiusStringProperty,
          value: new PatternStringProperty(commonStrings.valueNmStringProperty, {
            value: new DerivedProperty([model.touchingRadiusProperty], (radius) => toFixed(radius, 4)),
          }),
        },
        {
          label: screenStrings.packingFactorStringProperty,
          value: new DerivedProperty([model.packingFactorProperty], (apf) => toFixed(apf, 3)),
          // Turning the APF red the moment the spheres overlap is the cheapest
          // way to say "this number no longer means what you think".
          valueFill: new DerivedProperty(
            [
              model.overlappingProperty,
              CrystalLatticeColors.warningColorProperty,
              CrystalLatticeColors.accentColorProperty,
            ],
            (overlapping, warning, accent) => (overlapping ? warning : accent),
          ),
        },
        {
          label: screenStrings.computedDensityStringProperty,
          value: new DerivedProperty(
            [model.computedDensityProperty, computedDensityFormattedProperty, commonStrings.noneStringProperty],
            (density, formatted, none) => (density === null ? none : formatted),
          ),
        },
        {
          label: screenStrings.measuredDensityStringProperty,
          value: new DerivedProperty(
            [model.selectedElementProperty, measuredDensityFormattedProperty, commonStrings.noneStringProperty],
            (element, formatted, none) => (element === null ? none : formatted),
          ),
        },
        {
          label: screenStrings.elementStringProperty,
          value: new DerivedProperty(
            [model.identifiedElementProperty, screenStrings.noMatchStringProperty],
            (element, noMatch) => element?.symbol ?? noMatch,
          ),
          valueFill: CrystalLatticeColors.successColorProperty,
        },
      ],
      {
        titleProperty: commonStrings.quantitiesStringProperty,
        left: SCREEN_VIEW_MARGIN,
        bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
      },
    );
    this.addChild(quantitiesPanel);

    const controlColumnNode = new VBox({
      align: "left",
      spacing: CONTROL_COLUMN_SPACING,
      children: [controlsPanel, elementPanel],
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
    this.addChild(comboBoxParent);

    this.addChild(
      new Node({
        pdomOrder: [
          this.cellNode,
          structureComboBox,
          edgeSlider,
          radiusSlider,
          snapButton,
          clipCheckbox,
          sharingCheckbox,
          elementComboBox,
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
