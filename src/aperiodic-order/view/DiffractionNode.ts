/**
 * DiffractionNode.ts
 *
 * Renders a computed diffraction pattern as an intensity image on a dark field,
 * the way a diffraction plate actually looks.
 *
 * The intensity is drawn through a canvas-backed image rather than a grid of
 * Scenery nodes: a 96 × 96 grid is 9216 cells, and that many `Rectangle`s would
 * cost far more than one `putImageData`.
 *
 * ── Why the intensity is gamma-compressed ─────────────────────────────────────
 * Bragg peaks are enormously brighter than the diffuse background — the
 * intensity goes as the *square* of an amplitude that already sums hundreds of
 * scatterers. Displayed linearly, everything but the brightest handful of peaks
 * is black. Raising the normalized intensity to a fractional power brings the
 * weaker orders into view, which is exactly what a photographic plate's
 * response does and what makes the ten-fold symmetry countable.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import { Image, Node, type NodeOptions, Rectangle } from "scenerystack/scenery";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import type { DiffractionResult } from "../../common/model/DiffractionPattern.js";
import { replaceChildren } from "../../common/view/replaceChildren.js";

export type DiffractionNodeOptions = NodeOptions;

/** Display gamma; below 1 it lifts the weaker peaks into visibility. */
const DISPLAY_GAMMA = 0.35;

export class DiffractionNode extends Node {
  private readonly resultProperty: TReadOnlyProperty<DiffractionResult>;
  private readonly size: number;
  private readonly background: Rectangle;
  private readonly imageLayer: Node;
  private readonly multilink: UnknownMultilink;

  /**
   * @param resultProperty - the pattern to draw
   * @param size - the square display size in pixels
   * @param providedOptions
   */
  public constructor(
    resultProperty: TReadOnlyProperty<DiffractionResult>,
    size: number,
    providedOptions?: DiffractionNodeOptions,
  ) {
    super(providedOptions);
    this.resultProperty = resultProperty;
    this.size = size;

    this.background = new Rectangle(0, 0, size, size, {
      fill: CrystalLatticeColors.diffractionBackgroundColorProperty,
      stroke: CrystalLatticeColors.panelBorderColorProperty,
    });
    this.imageLayer = new Node();

    this.addChild(this.background);
    this.addChild(this.imageLayer);

    this.multilink = Multilink.multilink([resultProperty], () => this.rebuild());
  }

  /** Redraws the intensity image for the current pattern. */
  private rebuild(): void {
    const result = this.resultProperty.value;
    if (result.resolution <= 1) {
      replaceChildren(this.imageLayer, []);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = result.resolution;
    canvas.height = result.resolution;
    const context = canvas.getContext("2d");
    if (context === null) {
      replaceChildren(this.imageLayer, []);
      return;
    }

    const image = context.createImageData(result.resolution, result.resolution);
    for (let i = 0; i < result.intensities.length; i++) {
      const intensity = result.intensities[i] ?? 0;
      const level = Math.round(255 * Math.min(1, intensity) ** DISPLAY_GAMMA);
      image.data[i * 4] = level;
      image.data[i * 4 + 1] = level;
      image.data[i * 4 + 2] = level;
      image.data[i * 4 + 3] = 255;
    }
    context.putImageData(image, 0, 0);

    // Scale the small computed grid up to the display size. Smoothing is left
    // off: a Bragg peak occupies one grid cell, and interpolating it would blur
    // a sharp peak into something that looks diffuse — the exact distinction
    // the screen is asking the student to make.
    replaceChildren(this.imageLayer, [
      new Image(canvas, {
        scale: this.size / result.resolution,
        imageOpacity: 1,
      }),
    ]);
  }

  public override dispose(): void {
    this.multilink.dispose();
    super.dispose();
  }
}
