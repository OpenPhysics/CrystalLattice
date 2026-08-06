/**
 * CrystalLatticeColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import CrystalLatticeColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import CrystalLatticeColors from "../../CrystalLatticeColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: CrystalLatticeColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the CrystalLatticeColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import CrystalLatticeNamespace from "./CrystalLatticeNamespace.js";

const CrystalLatticeColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),

  // ── Crystal structure ────────────────────────────────────────────────────────

  /** Fill of an ordinary atom / lattice point. */
  atomColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "atom", {
    default: "#7fd4ff",
    projector: "#1565c0",
  }),

  /** Fill of an atom at a body- or face-centring site, so the motif reads at a glance. */
  centeringAtomColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "centeringAtom", {
    default: "#ffb74d",
    projector: "#e65100",
  }),

  /** Fill of the origin atom, the anchor for the lattice-vector handles. */
  originAtomColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "originAtom", {
    default: "#ff7597",
    projector: "#b3003c",
  }),

  /** Outline of an atom, drawn so overlapping spheres stay countable. */
  atomStrokeColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "atomStroke", {
    default: "#0d2b45",
    projector: "#ffffff",
  }),

  /** Wireframe of a unit cell. */
  cellOutlineColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "cellOutline", {
    default: "#e0e0e0",
    projector: "#212121",
  }),

  /** Translucent shading of a unit cell's interior or a primitive-cell overlay. */
  cellFillColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "cellFill", {
    default: "rgba(79,195,247,0.16)",
    projector: "rgba(21,101,192,0.14)",
  }),

  /** The a₁ lattice vector and the a-axis of the cubic cell. */
  vectorAColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "vectorA", {
    default: "#ff8a65",
    projector: "#bf360c",
  }),

  /** The a₂ lattice vector and the b-axis of the cubic cell. */
  vectorBColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "vectorB", {
    default: "#aed581",
    projector: "#33691e",
  }),

  /** The c-axis of the cubic cell. */
  vectorCColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "vectorC", {
    default: "#ba68c8",
    projector: "#4a148c",
  }),

  /** The Wigner–Seitz cell outline and its perpendicular-bisector construction lines. */
  wignerSeitzColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "wignerSeitz", {
    default: "#ffd54f",
    projector: "#f57f17",
  }),

  /** Fill of a crystallographic plane drawn inside the cubic cell. */
  planeColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "plane", {
    default: "rgba(255,213,79,0.35)",
    projector: "rgba(245,127,23,0.3)",
  }),

  /** A crystallographic direction vector. */
  directionColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "direction", {
    default: "#4dd0e1",
    projector: "#006064",
  }),

  // ── Close-packed layers ──────────────────────────────────────────────────────

  /** Spheres of an A layer. */
  layerAColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "layerA", {
    default: "#64b5f6",
    projector: "#0d47a1",
  }),

  /** Spheres of a B layer. */
  layerBColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "layerB", {
    default: "#81c784",
    projector: "#1b5e20",
  }),

  /** Spheres of a C layer. */
  layerCColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "layerC", {
    default: "#e57373",
    projector: "#b71c1c",
  }),

  // ── Aperiodic tilings ────────────────────────────────────────────────────────

  /** Fill of a thick (72°/108°) Penrose rhombus. */
  thickRhombusColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "thickRhombus", {
    default: "#4fc3f7",
    projector: "#0277bd",
  }),

  /** Fill of a thin (36°/144°) Penrose rhombus. */
  thinRhombusColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "thinRhombus", {
    default: "#f06292",
    projector: "#ad1457",
  }),

  /** Outline shared by every tile in the aperiodic screen. */
  tileStrokeColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "tileStroke", {
    default: "#12213d",
    projector: "#ffffff",
  }),

  /** Fill of a hat belonging to an H metatile cluster. */
  hatHColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "hatH", {
    default: "#4fc3f7",
    projector: "#0288d1",
  }),

  /** Fill of a hat belonging to a T metatile cluster. */
  hatTColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "hatT", {
    default: "#fff59d",
    projector: "#f9a825",
  }),

  /** Fill of a hat belonging to a P metatile cluster. */
  hatPColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "hatP", {
    default: "#b0bec5",
    projector: "#546e7a",
  }),

  /** Fill of a hat belonging to an F metatile cluster. */
  hatFColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "hatF", {
    default: "#a5d6a7",
    projector: "#2e7d32",
  }),

  /** Fill of a reflected hat — the copies the spectre makes unnecessary. */
  hatReflectedColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "hatReflected", {
    default: "#ff8a65",
    projector: "#d84315",
  }),

  // ── Diffraction ──────────────────────────────────────────────────────────────

  /** Background of the diffraction panel — dark in both profiles, as film would be. */
  diffractionBackgroundColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "diffractionBackground", {
    default: "#05070f",
    projector: "#0a0a0a",
  }),

  /** Colour a full-intensity Bragg peak is drawn in. */
  diffractionPeakColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "diffractionPeak", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  // ── Feedback ─────────────────────────────────────────────────────────────────

  /** Highlight for a legal tile placement or a matched lattice type. */
  successColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "success", {
    default: "#81c784",
    projector: "#2e7d32",
  }),

  /** Highlight for an illegal placement or an unphysical (overlapping) radius. */
  warningColorProperty: new ProfileColorProperty(CrystalLatticeNamespace, "warning", {
    default: "#ff8a80",
    projector: "#c62828",
  }),
};

export default CrystalLatticeColors;
