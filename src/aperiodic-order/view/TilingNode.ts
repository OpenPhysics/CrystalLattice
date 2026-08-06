/**
 * TilingNode.ts
 *
 * Draws the real-space half of the Aperiodic Order screen: Penrose rhombi, a
 * patch of hat tiles, or the periodic comparison lattice.
 *
 * The view rescales to fit whatever it is given, because the tilings shrink
 * dramatically as they inflate — a sixth-generation Penrose tiling has edges
 * 1/φ⁶ ≈ 1/18 of the seed's. Fitting to bounds keeps the patch the same size on
 * screen so the student sees *more detail*, which is what inflation actually
 * produces, rather than a shrinking blob.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, type NodeOptions, Path } from "scenerystack/scenery";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import { MetatileType, type PlacedHat } from "../../common/model/EinsteinTiling.js";
import { type PenroseRhombus, RhombusType } from "../../common/model/PenroseTiling.js";
import { type AperiodicOrderModel, TilingMode } from "../model/AperiodicOrderModel.js";

export type TilingNodeOptions = NodeOptions;

/** Edge directions of a Penrose tiling all lie at multiples of 36°. */
const ORIENTATION_COUNT = 5;

export class TilingNode extends Node {
  private readonly model: AperiodicOrderModel;
  private readonly viewSize: number;
  private readonly multilink: UnknownMultilink;

  public constructor(model: AperiodicOrderModel, viewSize: number, providedOptions?: TilingNodeOptions) {
    super(providedOptions);
    this.model = model;
    this.viewSize = viewSize;

    this.multilink = Multilink.multilink(
      [
        model.modeProperty,
        model.rhombiProperty,
        model.hatsProperty,
        model.highlightOrientationsProperty,
        model.showMetatilesProperty,
        model.showReflectedProperty,
      ],
      () => this.rebuild(),
    );
  }

  /** Rebuilds the tiling for the current mode. */
  private rebuild(): void {
    const mode = this.model.modeProperty.value;
    const polygons =
      mode === TilingMode.PENROSE ? this.rhombusPolygons() : mode === TilingMode.EINSTEIN ? this.hatPolygons() : [];

    if (mode === TilingMode.PERIODIC) {
      this.children = [this.createLatticeDots()];
      return;
    }

    // Fit whatever was produced into the play area, so inflation reads as more
    // detail rather than as the patch shrinking away.
    const bounds = boundsOf(polygons.map((entry) => entry.points));
    const scale = bounds.isEmpty() ? 1 : this.viewSize / Math.max(bounds.width, bounds.height);
    const center = bounds.isEmpty() ? Vector2.ZERO : bounds.center;

    const toView = (point: Vector2): Vector2 => new Vector2((point.x - center.x) * scale, (point.y - center.y) * scale);

    const children: Node[] = polygons.map(
      (entry) =>
        new Path(polygonShape(entry.points.map(toView)), {
          fill: entry.fill,
          stroke: CrystalLatticeColors.tileStrokeColorProperty,
          lineWidth: Math.max(0.4, 1.5 - polygons.length / 400),
        }),
    );

    if (mode === TilingMode.PENROSE && this.model.highlightOrientationsProperty.value) {
      children.push(...this.createOrientationOverlay(polygons, toView));
    }

    this.children = children;
  }

  /** Penrose rhombi, coloured thick versus thin. */
  private rhombusPolygons(): PolygonEntry[] {
    return this.model.rhombiProperty.value.map((rhombus: PenroseRhombus) => ({
      points: [...rhombus.vertices],
      fill:
        rhombus.type === RhombusType.THICK
          ? CrystalLatticeColors.thickRhombusColorProperty
          : CrystalLatticeColors.thinRhombusColorProperty,
    }));
  }

  /**
   * Hat tiles, coloured either by metatile cluster (which makes the hierarchical
   * structure visible) or by chirality (which makes the reflected copies, and
   * therefore the hat's one weakness relative to the spectre, visible).
   */
  private hatPolygons(): PolygonEntry[] {
    const byMetatile = this.model.showMetatilesProperty.value;
    const markReflected = this.model.showReflectedProperty.value;

    return this.model.hatsProperty.value.map((hat: PlacedHat) => ({
      points: [...hat.polygon],
      fill:
        markReflected && hat.reflected
          ? CrystalLatticeColors.hatReflectedColorProperty
          : byMetatile
            ? metatileColor(hat.metatile)
            : CrystalLatticeColors.hatHColorProperty,
    }));
  }

  /**
   * Every tile edge running in one of the five Penrose directions, drawn on top
   * of the tiling. Five-fold symmetry is present in the *statistics* of a
   * Penrose tiling rather than as an exact rotation of the whole patch, and
   * seeing five families of parallel edges is the most direct way to notice it.
   */
  private createOrientationOverlay(polygons: readonly PolygonEntry[], toView: (point: Vector2) => Vector2): Node[] {
    const byDirection: Shape[] = Array.from({ length: ORIENTATION_COUNT }, () => new Shape());

    for (const entry of polygons) {
      for (let i = 0; i < entry.points.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: index is bounded by the loop
        const from = entry.points[i]!;
        // biome-ignore lint/style/noNonNullAssertion: modular index stays in range
        const to = entry.points[(i + 1) % entry.points.length]!;
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        // Edges come in antiparallel pairs, so fold the angle onto [0, π) before
        // bucketing: an edge and its reverse belong to the same direction.
        const folded = ((angle % Math.PI) + Math.PI) % Math.PI;
        const bucket = Math.round((folded * ORIENTATION_COUNT) / Math.PI) % ORIENTATION_COUNT;

        const a = toView(from);
        const b = toView(to);
        // biome-ignore lint/style/noNonNullAssertion: bucket is bounded by the modulo
        byDirection[bucket]!.moveTo(a.x, a.y).lineTo(b.x, b.y);
      }
    }

    const palette = [
      CrystalLatticeColors.vectorAColorProperty,
      CrystalLatticeColors.vectorBColorProperty,
      CrystalLatticeColors.vectorCColorProperty,
      CrystalLatticeColors.wignerSeitzColorProperty,
      CrystalLatticeColors.directionColorProperty,
    ];

    return byDirection.map(
      (shape, index) =>
        new Path(shape, {
          // biome-ignore lint/style/noNonNullAssertion: palette matches ORIENTATION_COUNT
          stroke: palette[index]!,
          lineWidth: 2,
        }),
    );
  }

  /** The periodic comparison lattice, as plain dots. */
  private createLatticeDots(): Node {
    const points = this.model.scatterersProperty.value;
    const bounds = boundsOf([[...points]]);
    const scale = bounds.isEmpty() ? 1 : this.viewSize / Math.max(bounds.width, bounds.height);
    const center = bounds.isEmpty() ? Vector2.ZERO : bounds.center;

    return new Node({
      children: points.map(
        (point) =>
          new Circle(3, {
            center: new Vector2((point.x - center.x) * scale, (point.y - center.y) * scale),
            fill: CrystalLatticeColors.atomColorProperty,
          }),
      ),
    });
  }

  public override dispose(): void {
    this.multilink.dispose();
    super.dispose();
  }
}

/** A polygon and the colour it is filled with. */
type PolygonEntry = {
  readonly points: Vector2[];
  readonly fill: (typeof CrystalLatticeColors)["thickRhombusColorProperty"];
};

/** The colour of a hat belonging to a given metatile cluster. */
function metatileColor(metatile: MetatileType) {
  switch (metatile) {
    case MetatileType.H:
      return CrystalLatticeColors.hatHColorProperty;
    case MetatileType.T:
      return CrystalLatticeColors.hatTColorProperty;
    case MetatileType.P:
      return CrystalLatticeColors.hatPColorProperty;
    default:
      return CrystalLatticeColors.hatFColorProperty;
  }
}

/** The bounding box of a set of polygons. */
function boundsOf(polygons: ReadonlyArray<readonly Vector2[]>): Bounds2 {
  const bounds = Bounds2.NOTHING.copy();
  for (const polygon of polygons) {
    for (const point of polygon) {
      bounds.addPoint(point);
    }
  }
  return bounds;
}

/** A closed Kite Shape through already-projected view points. */
function polygonShape(points: readonly Vector2[]): Shape {
  const shape = new Shape();
  points.forEach((point, index) => {
    if (index === 0) {
      shape.moveTo(point.x, point.y);
    } else {
      shape.lineTo(point.x, point.y);
    }
  });
  return shape.close();
}
