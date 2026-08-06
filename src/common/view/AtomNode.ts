/**
 * AtomNode.ts
 *
 * A single atom drawn as a shaded sphere. Used for lattice points on the 2D
 * screen and for hard-sphere atoms on the cubic and close-packing screens.
 *
 * The radial gradient is what makes a flat circle read as a ball, which matters
 * a lot once dozens of them overlap in a projected 3D cell. The stroke keeps
 * adjacent spheres of the same colour countable.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { optionize } from "scenerystack/phet-core";
import { Circle, type CircleOptions, Color, type Node, RadialGradient, type TColor } from "scenerystack/scenery";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";

type SelfOptions = {
  /** Base colour of the sphere; the gradient is derived from it. */
  baseColor?: TColor | TReadOnlyProperty<Color>;
};

export type AtomNodeOptions = SelfOptions & CircleOptions;

export class AtomNode extends Circle {
  private readonly baseColorProperty: TReadOnlyProperty<Color> | null;
  private readonly baseColorListener: ((color: Color) => void) | null;

  /**
   * @param radius - sphere radius in view pixels
   * @param providedOptions - `baseColor` plus any CircleOptions
   */
  public constructor(radius: number, providedOptions?: AtomNodeOptions) {
    const options = optionize<AtomNodeOptions, SelfOptions, CircleOptions>()(
      {
        baseColor: CrystalLatticeColors.atomColorProperty,
        stroke: CrystalLatticeColors.atomStrokeColorProperty,
        lineWidth: 0.5,
      },
      providedOptions,
    );

    super(radius, options);

    // A Property-valued colour has to re-derive the gradient whenever the
    // active colour profile changes, so keep the link and unlink it on dispose.
    if (isColorProperty(options.baseColor)) {
      const colorProperty = options.baseColor;
      const listener = (color: Color) => {
        this.fill = sphereGradient(radius, color);
      };
      colorProperty.link(listener);
      this.baseColorProperty = colorProperty;
      this.baseColorListener = listener;
    } else {
      this.baseColorProperty = null;
      this.baseColorListener = null;
      this.fill = sphereGradient(radius, toColor(options.baseColor));
    }
  }

  public override dispose(): void {
    if (this.baseColorProperty !== null && this.baseColorListener !== null) {
      this.baseColorProperty.unlink(this.baseColorListener);
    }
    super.dispose();
  }
}

/**
 * A radial gradient standing in for a lit sphere: a bright highlight up and to
 * the left, falling to a darkened rim.
 */
export function sphereGradient(radius: number, color: Color): RadialGradient {
  const highlightOffset = radius * 0.35;
  return new RadialGradient(-highlightOffset, -highlightOffset, radius * 0.05, 0, 0, radius)
    .addColorStop(0, color.colorUtilsBrighter(0.7).toCSS())
    .addColorStop(0.55, color.toCSS())
    .addColorStop(1, color.colorUtilsDarker(0.45).toCSS());
}

function isColorProperty(value: unknown): value is TReadOnlyProperty<Color> {
  return typeof value === "object" && value !== null && "link" in value;
}

function toColor(value: TColor | TReadOnlyProperty<Color>): Color {
  if (isColorProperty(value)) {
    return value.value;
  }
  if (value instanceof Color) {
    return value;
  }
  return new Color(typeof value === "string" ? value : "#ffffff");
}

/**
 * Draws a translucent wedge over an atom showing the fraction of it this unit
 * cell owns — 1/8 at a corner, 1/2 on a face, all of it at the body centre.
 * The wedge is what turns "eight spheres" into "one atom" for a student.
 *
 * @param radius - the atom's radius in view pixels
 * @param fraction - the owned fraction on (0, 1]
 * @param fill - wedge colour
 */
export function createSharingWedge(radius: number, fraction: number, fill: TColor): Node {
  const wedge = new Circle(radius, { fill });
  if (fraction >= 1) {
    return wedge;
  }

  // Scenery has no pie-slice primitive on Circle, so clip a full disc to the
  // sector. Starting at −90° puts the slice's leading edge straight up, which
  // makes the 1/8 and 1/2 cases visually distinct at a glance.
  const start = -Math.PI / 2;
  const end = start + 2 * Math.PI * fraction;
  const steps = Math.max(2, Math.ceil(24 * fraction));
  const points: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i <= steps; i++) {
    const angle = start + ((end - start) * i) / steps;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }

  wedge.setClipArea(shapeFromPoints(points));
  return wedge;
}

/** Builds a closed Kite Shape from a polygon's points. */
function shapeFromPoints(points: ReadonlyArray<readonly [number, number]>): Shape {
  const shape = new Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  return shape.close();
}
