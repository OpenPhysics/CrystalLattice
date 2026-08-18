/**
 * ControlFactory.ts
 *
 * Themed constructors for the controls the five screens share. Every screen
 * needs sliders with a units readout, check boxes, combo boxes and push buttons
 * that look the same and carry the same accessibility wiring, so the options
 * bundles live here rather than being repeated on each screen.
 *
 * Every factory takes an `accessibleName` as a required argument, because a
 * control without one is invisible to a screen-reader user and the compiler is
 * the cheapest place to catch that.
 */

import type { PhetioProperty, TReadOnlyProperty } from "scenerystack/axon";
import type { Range } from "scenerystack/dot";
import { HBox, type Node, Text, VBox } from "scenerystack/scenery";
import { NumberControl, type NumberControlOptions, PhetFont } from "scenerystack/scenery-phet";
import {
  AquaRadioButtonGroup,
  type AquaRadioButtonGroupOptions,
  Checkbox,
  type CheckboxOptions,
  ComboBox,
  type ComboBoxItem,
  type ComboBoxOptions,
  RectangularPushButton,
  type RectangularPushButtonOptions,
} from "scenerystack/sun";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  CONTROL_FONT_SIZE,
  CONTROL_PANEL_WIDTH,
  HEADING_FONT_SIZE,
  PANEL_ROW_SPACING,
} from "../../CrystalLatticeConstants.js";
import {
  CRYSTAL_LATTICE_COMBO_BOX_OPTIONS,
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../CrystalLatticeButtonOptions.js";

/** Body text on a panel fill. */
export function panelFont(): PhetFont {
  return new PhetFont(CONTROL_FONT_SIZE);
}

/** A section heading inside a panel. */
export function createHeading(labelProperty: TReadOnlyProperty<string>): Text {
  return new Text(labelProperty, {
    font: new PhetFont({ size: HEADING_FONT_SIZE, weight: "bold" }),
    fill: CrystalLatticeColors.textColorProperty,
    maxWidth: CONTROL_PANEL_WIDTH,
  });
}

/** Ordinary label text on a panel fill. */
export function createLabel(labelProperty: TReadOnlyProperty<string>, maxWidth = CONTROL_PANEL_WIDTH): Text {
  return new Text(labelProperty, {
    font: panelFont(),
    fill: CrystalLatticeColors.textColorProperty,
    maxWidth,
  });
}

/**
 * A slider with a title and a live numeric readout.
 *
 * @param titleProperty - localized slider title
 * @param property - the value being controlled
 * @param range - the slider's range
 * @param accessibleName - PDOM name; required, never a hard-coded literal
 * @param options - `decimalPlaces`, localized `unitsPattern` (`"{{value}} nm"`), and any NumberControlOptions
 */
export function createSlider(
  titleProperty: TReadOnlyProperty<string>,
  property: PhetioProperty<number>,
  range: Range,
  accessibleName: TReadOnlyProperty<string>,
  options?: {
    decimalPlaces?: number;
    /** Localized NumberDisplay pattern including `{{value}}`, e.g. `"{{value}} nm"`. */
    unitsPattern?: TReadOnlyProperty<string>;
    delta?: number;
  } & NumberControlOptions,
): NumberControl {
  const decimalPlaces = options?.decimalPlaces ?? 2;
  const delta = options?.delta ?? 10 ** -decimalPlaces;

  return new NumberControl(titleProperty, property, range, {
    delta,
    accessibleName,
    layoutFunction: NumberControl.createLayoutFunction2(),
    titleNodeOptions: {
      font: panelFont(),
      fill: CrystalLatticeColors.textColorProperty,
      maxWidth: CONTROL_PANEL_WIDTH * 0.55,
    },
    numberDisplayOptions: {
      decimalPlaces,
      textOptions: { font: panelFont(), fill: LIGHT_SURFACE_TEXT_FILL },
      backgroundFill: CrystalLatticeColors.controlSurfaceColorProperty,
      backgroundStroke: CrystalLatticeColors.panelBorderColorProperty,
      ...(options?.unitsPattern !== undefined && { valuePattern: options.unitsPattern }),
    },
    sliderOptions: {
      thumbFill: CrystalLatticeColors.accentColorProperty,
      majorTickLength: 8,
    },
    arrowButtonOptions: FLAT_RECTANGULAR_BUTTON_OPTIONS,
    ...options,
  });
}

/** A check box with a themed label. */
export function createCheckbox(
  labelProperty: TReadOnlyProperty<string>,
  property: PhetioProperty<boolean>,
  accessibleName: TReadOnlyProperty<string>,
  options?: CheckboxOptions,
): Checkbox {
  return new Checkbox(property, createLabel(labelProperty, CONTROL_PANEL_WIDTH - 30), {
    accessibleName,
    checkboxColor: CrystalLatticeColors.textColorProperty,
    checkboxColorBackground: CrystalLatticeColors.panelBackgroundColorProperty,
    spacing: 8,
    ...options,
  });
}

/**
 * A combo box themed to the light control surface. Item labels use the light
 * surface's dark text, not the panel text colour — the list pops over a white
 * background regardless of the active profile.
 */
export function createComboBox<T>(
  property: PhetioProperty<T>,
  items: ReadonlyArray<{ value: T; label: TReadOnlyProperty<string> }>,
  listParent: Node,
  accessibleName: TReadOnlyProperty<string>,
  options?: ComboBoxOptions,
): ComboBox<T> {
  const comboItems: Array<ComboBoxItem<T>> = items.map((item) => ({
    value: item.value,
    createNode: () =>
      new Text(item.label, {
        font: panelFont(),
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: CONTROL_PANEL_WIDTH - 60,
      }),
  }));

  return new ComboBox(property, comboItems, listParent, {
    accessibleName,
    ...CRYSTAL_LATTICE_COMBO_BOX_OPTIONS,
    ...options,
  });
}

/** A flat push button with a text label. */
export function createTextButton(
  labelProperty: TReadOnlyProperty<string>,
  listener: () => void,
  accessibleName: TReadOnlyProperty<string>,
  options?: RectangularPushButtonOptions,
): RectangularPushButton {
  return new RectangularPushButton({
    ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    content: new Text(labelProperty, {
      font: panelFont(),
      fill: LIGHT_SURFACE_TEXT_FILL,
      maxWidth: CONTROL_PANEL_WIDTH - 40,
    }),
    baseColor: CrystalLatticeColors.controlSurfaceColorProperty,
    listener,
    accessibleName,
    ...options,
  });
}

/** A vertical radio-button group with themed labels. */
export function createRadioGroup<T>(
  property: PhetioProperty<T>,
  items: ReadonlyArray<{ value: T; label: TReadOnlyProperty<string>; accessibleName: TReadOnlyProperty<string> }>,
  options?: AquaRadioButtonGroupOptions,
): AquaRadioButtonGroup<T> {
  return new AquaRadioButtonGroup(
    property,
    items.map((item) => ({
      value: item.value,
      createNode: () => createLabel(item.label, CONTROL_PANEL_WIDTH - 40),
      options: { accessibleName: item.accessibleName },
    })),
    {
      spacing: PANEL_ROW_SPACING,
      radioButtonOptions: {
        selectedColor: CrystalLatticeColors.accentColorProperty,
        deselectedColor: CrystalLatticeColors.controlSurfaceColorProperty,
        stroke: CrystalLatticeColors.panelBorderColorProperty,
      },
      ...options,
    },
  );
}

/** Stacks controls into a left-aligned column with the panel's standard spacing. */
export function controlColumn(children: readonly Node[], spacing = PANEL_ROW_SPACING): VBox {
  return new VBox({ align: "left", spacing, children: [...children] });
}

/** Lays controls out in a row with the panel's standard spacing. */
export function controlRow(children: readonly Node[], spacing = PANEL_ROW_SPACING): HBox {
  return new HBox({ align: "center", spacing, children: [...children] });
}
