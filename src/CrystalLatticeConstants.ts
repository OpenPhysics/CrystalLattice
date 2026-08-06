/**
 * CrystalLatticeConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use the units noted on each constant. Crystal
 *    lattice constants are conventionally quoted in nanometres rather than
 *    metres, so the sim works in nm and says so.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in CrystalLatticeColors.ts, not here.
 *  - Computed expressions (e.g. `2 * Math.PI`) may stay inline.
 */

import CrystalLatticeNamespace from "./CrystalLatticeNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Vertical spacing between rows inside a control panel. */
export const PANEL_ROW_SPACING = 8;

/** Horizontal gap between the play area and the right-hand control column. */
export const CONTROL_COLUMN_SPACING = 12;

/** Width of the right-hand control column, so panels align down the screen. */
export const CONTROL_PANEL_WIDTH = 250;

/** Font size for control-panel labels and check-box text. */
export const CONTROL_FONT_SIZE = 14;

/** Font size for section headings inside panels. */
export const HEADING_FONT_SIZE = 16;

/** Font size for the derived-quantity readouts, which are the point of the panels. */
export const READOUT_FONT_SIZE = 14;

/** Stroke width of unit-cell wireframes and lattice-vector arrows. */
export const OUTLINE_LINE_WIDTH = 2;

// ── 2D Lattices screen (model units are nanometres) ──────────────────────────

/** Smallest primitive-vector length the sliders allow, in nm. */
export const MIN_LATTICE_VECTOR_NM = 0.15;

/** Largest primitive-vector length the sliders allow, in nm. */
export const MAX_LATTICE_VECTOR_NM = 0.5;

/** Initial |a₁| and |a₂| for the 2D lattice, in nm. */
export const DEFAULT_LATTICE_VECTOR_NM = 0.3;

/** Smallest interior angle γ the sliders allow, in degrees. */
export const MIN_GAMMA_DEGREES = 30;

/** Largest interior angle γ the sliders allow, in degrees. */
export const MAX_GAMMA_DEGREES = 150;

/** Initial interior angle γ, in degrees — deliberately oblique so nothing is pre-solved. */
export const DEFAULT_GAMMA_DEGREES = 75;

/** How many lattice cells to draw either side of the origin on the 2D screen. */
export const LATTICE_2D_RANGE = 6;

// ── Cubic Systems screen (model units are nanometres) ────────────────────────

/** Smallest cubic cell edge the slider allows, in nm. */
export const MIN_CELL_EDGE_NM = 0.2;

/** Largest cubic cell edge the slider allows, in nm. */
export const MAX_CELL_EDGE_NM = 0.6;

/** Initial cubic cell edge, in nm — close to copper's 0.3615 nm. */
export const DEFAULT_CELL_EDGE_NM = 0.36;

/** Smallest atomic radius the free radius slider allows, in nm. */
export const MIN_ATOM_RADIUS_NM = 0.02;

/** Largest atomic radius the free radius slider allows, in nm. Deliberately well past
 *  the touching radius so students can drive the spheres into overlap. */
export const MAX_ATOM_RADIUS_NM = 0.3;

// ── Close-Packing screen ─────────────────────────────────────────────────────

/** Fewest close-packed layers the screen will stack. */
export const MIN_LAYER_COUNT = 2;

/** Most close-packed layers the screen will stack. */
export const MAX_LAYER_COUNT = 6;

/** Initial number of layers — enough to tell ABAB from ABCABC. */
export const DEFAULT_LAYER_COUNT = 3;

/** Smallest axial ratio c/a the slider allows. */
export const MIN_C_OVER_A = 1.4;

/** Largest axial ratio c/a the slider allows — past zinc's 1.856. */
export const MAX_C_OVER_A = 2.0;

/** How many cells out from the origin each close-packed layer extends. */
export const CLOSE_PACKING_LAYER_RANGE = 2;

// ── Miller Indices screen ────────────────────────────────────────────────────

/** The cubic cell on the Miller screen has a fixed edge — the screen is about
 *  notation, not about a particular lattice constant. In nm. */
export const MILLER_CELL_EDGE_NM = 0.4;

/** Largest denominator an intercept handle will snap to, e.g. 1/4 but not 1/5. */
export const MAX_INTERCEPT_DENOMINATOR = 4;

/** Largest |index| the reverse-entry field accepts, keeping planes drawable. */
export const MAX_MILLER_INDEX = 4;

// ── Aperiodic Order screen ───────────────────────────────────────────────────

/** Fewest Penrose inflation steps. One, not zero: the bare seed's triangles do
 *  not pair into whole rhombi, so the first real tiling appears after one step. */
export const MIN_INFLATION_STEPS = 1;

/** Most Penrose inflation steps, capped to keep the DFT in its cheap regime. */
export const MAX_INFLATION_STEPS = 6;

/** Most hat substitution steps. Each multiplies the hat count by roughly seven,
 *  so a third step would push the scatterer count past the direct sum's budget. */
export const MAX_HAT_STEPS = 2;

/** Resolution of the k-space grid for the live diffraction display. */
export const DIFFRACTION_RESOLUTION = 96;

/** How many reciprocal-lattice periods the diffraction view spans. */
export const DIFFRACTION_PERIODS = 1.5;

/** Fraction of a tiling's radius kept when trimming it to a disc before the DFT,
 *  so the patch outline does not imprint itself on the pattern. */
export const DIFFRACTION_PATCH_FRACTION = 0.7;

/** Normalized intensity above which a diffraction maximum counts as a Bragg peak. */
export const DIFFRACTION_PEAK_THRESHOLD = 0.15;

CrystalLatticeNamespace.register("CrystalLatticeConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  PANEL_ROW_SPACING,
  CONTROL_COLUMN_SPACING,
  CONTROL_PANEL_WIDTH,
  CONTROL_FONT_SIZE,
  HEADING_FONT_SIZE,
  READOUT_FONT_SIZE,
  OUTLINE_LINE_WIDTH,
  MIN_LATTICE_VECTOR_NM,
  MAX_LATTICE_VECTOR_NM,
  DEFAULT_LATTICE_VECTOR_NM,
  MIN_GAMMA_DEGREES,
  MAX_GAMMA_DEGREES,
  DEFAULT_GAMMA_DEGREES,
  LATTICE_2D_RANGE,
  MIN_CELL_EDGE_NM,
  MAX_CELL_EDGE_NM,
  DEFAULT_CELL_EDGE_NM,
  MIN_ATOM_RADIUS_NM,
  MAX_ATOM_RADIUS_NM,
  MIN_LAYER_COUNT,
  MAX_LAYER_COUNT,
  DEFAULT_LAYER_COUNT,
  MIN_C_OVER_A,
  MAX_C_OVER_A,
  CLOSE_PACKING_LAYER_RANGE,
  MILLER_CELL_EDGE_NM,
  MAX_INTERCEPT_DENOMINATOR,
  MAX_MILLER_INDEX,
  MIN_INFLATION_STEPS,
  MAX_INFLATION_STEPS,
  MAX_HAT_STEPS,
  DIFFRACTION_RESOLUTION,
  DIFFRACTION_PERIODS,
  DIFFRACTION_PATCH_FRACTION,
  DIFFRACTION_PEAK_THRESHOLD,
});
