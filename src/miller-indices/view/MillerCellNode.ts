/**
 * MillerCellNode.ts
 *
 * The projected cubic cell for the Miller Indices screen: the wireframe cube,
 * its three labelled axes, either the shaded plane (plane mode) or the direction
 * arrow (direction mode), optional overlays for the plane's normal and its
 * symmetry-equivalent family, and the draggable handles that drive both.
 *
 * There are no atoms here on purpose. This screen is about notation, and
 * spheres would only obscure where the plane actually cuts the cell.
 *
 * ── Why the intercept handles snap to unit fractions ──────────────────────────
 * The plane (hkl) nearest the origin cuts the a axis at exactly 1/h, so the only
 * intercepts a drawable plane can have are the unit fractions ±1/n up to the
 * index limit, plus "parallel" for an index of 0. A continuous track would let a
 * student produce (9 8 0) from two innocuous-looking drags; a track with stops at
 * 1, 1/2, 1/3, 1/4, ∥ instead puts the reciprocals the derivation panel is about
 * directly under the pointer. The stops *are* the lesson.
 *
 * A drag therefore always lands on a *reduced* triple. (200) cannot be dragged
 * to, because an intercept of 1/2 with the other axes parallel reduces to (100) —
 * the common factor a plane's indices may carry is simply not in the intercepts.
 * That is why (200) stays a preset button with a note beside it.
 *
 * ── Why the handles are not rebuilt ───────────────────────────────────────────
 * {@link Projected3DNode} rebuilds its content on every camera frame, so a handle
 * created inside `rebuild()` would be replaced mid-drag and the drag would die on
 * the first orbit. The handles therefore live in their own persistent layer and
 * are only repositioned.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import { Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardListener, Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  HEADING_FONT_SIZE,
  MAX_MILLER_INDEX,
  OUTLINE_LINE_WIDTH,
  PARALLEL_INTERCEPT_POSITION,
  READOUT_FONT_SIZE,
} from "../../CrystalLatticeConstants.js";
import { cellCorners, cellEdgeIndices } from "../../common/model/CubicCell.js";
import type { IndexTriple } from "../../common/model/MillerIndices.js";
import { planePolygonInCell } from "../../common/model/MillerIndices.js";
import type { Projection3D } from "../../common/model/Projection3D.js";
import { Projected3DNode, type Projected3DNodeOptions } from "../../common/view/Projected3DNode.js";
import { replaceChildren } from "../../common/view/replaceChildren.js";
import { StringManager } from "../../i18n/StringManager.js";
import { type MillerIndicesModel, MillerMode } from "../model/MillerIndicesModel.js";

/** Radius of a draggable handle in view pixels, sized for a comfortable touch target. */
const HANDLE_RADIUS = 9;

/** Half-length of a tick mark drawn across an intercept track, in view pixels. */
const TICK_HALF_LENGTH = 5;

/** How far the negative half of each intercept track runs, in cell edges. */
const NEGATIVE_TRACK_EXTENT = 1.05;

/**
 * Below this projected axis length the axis points almost straight at the
 * viewer, so a drag along it carries no information and is ignored rather than
 * amplified into a wild jump.
 */
const MIN_PROJECTED_AXIS_PIXELS = 12;

/** How far one arrow-key press slides the direction tip, in cell edges. */
const DIRECTION_KEY_STEP = 0.2;

/** The three axes, in the order the index triple lists them. */
const AXES = [0, 1, 2] as const;

type AxisIndex = (typeof AXES)[number];

/**
 * The intercept stops along one axis, ordered from the negative end of the track
 * to the positive end. `null` is the "parallel to this axis" stop, drawn at
 * {@link PARALLEL_INTERCEPT_POSITION}; it has no sign because infinity has none.
 */
const INTERCEPT_STOPS: ReadonlyArray<number | null> = (() => {
  const magnitudes = Array.from({ length: MAX_MILLER_INDEX }, (_unused, index) => 1 / (index + 1));
  // Ascending along the track: -1, -1/2 … -1/4, then 1/4 … 1/2, 1, then ∥.
  // Reading left to right walks the index h through -1, -2, -3, -4, 4, 3, 2, 1, 0.
  return [...magnitudes.map((magnitude) => -magnitude), ...[...magnitudes].reverse(), null];
})();

/** Where a stop sits along its axis, in cell edges. */
function stopPosition(stop: number | null): number {
  return stop === null ? PARALLEL_INTERCEPT_POSITION : stop;
}

export type MillerCellNodeOptions = Projected3DNodeOptions;

export class MillerCellNode extends Projected3DNode {
  private readonly model: MillerIndicesModel;
  private readonly modelMultilink: UnknownMultilink;

  /** Persistent, so a drag survives the rebuilds the camera triggers. */
  private readonly handleLayer = new Node();
  private readonly interceptHandles: readonly Circle[];
  private readonly directionHandle: Circle;

  public constructor(model: MillerIndicesModel, viewSize: number, providedOptions?: MillerCellNodeOptions) {
    // Room for the cube's half-diagonal plus the axis labels beyond it.
    const modelScale = viewSize / 2 / (model.edgeLength * 1.5);

    super(modelScale, [], providedOptions);
    this.model = model;

    const a11y = StringManager.getInstance().getMillerIndicesA11yStrings();
    const interceptNames = [
      a11y.controls.interceptAStringProperty,
      a11y.controls.interceptBStringProperty,
      a11y.controls.interceptCStringProperty,
    ];
    const axisColors = [
      CrystalLatticeColors.vectorAColorProperty,
      CrystalLatticeColors.vectorBColorProperty,
      CrystalLatticeColors.vectorCColorProperty,
    ];

    this.interceptHandles = AXES.map((axis) =>
      // biome-ignore lint/style/noNonNullAssertion: the arrays are indexed by AXES
      this.createInterceptHandle(axis, axisColors[axis]!, interceptNames[axis]!),
    );
    this.directionHandle = this.createDirectionHandle(a11y.controls.directionHandleStringProperty);

    this.handleLayer.children = [...this.interceptHandles, this.directionHandle];
    this.addChild(this.handleLayer);

    this.modelMultilink = Multilink.multilink(
      [
        model.modeProperty,
        model.planeIndicesProperty,
        model.directionIndicesProperty,
        model.showNormalProperty,
        model.showFamilyProperty,
      ],
      () => this.rebuild(),
    );
  }

  /** The three intercept handles and the direction tip, in PDOM order. */
  public getHandles(): readonly Node[] {
    return [...this.interceptHandles, this.directionHandle];
  }

  /** Rebuilds the cube, its axes and the current plane or direction. */
  protected override rebuild(): void {
    // The base class rebuilds once from its own constructor, before this
    // subclass has assigned its fields.
    if (this.model === undefined) {
      return;
    }

    const camera = this.cameraProperty.value;
    const edge = this.model.edgeLength;
    // Draw with the cell origin at the cube's own corner, but rotate about the
    // cube's centre, so the origin stays a meaningful landmark for the indices.
    const offset = new Vector3(edge / 2, edge / 2, edge / 2);

    const isPlaneMode = this.model.modeProperty.value === MillerMode.PLANE;
    const children: Node[] = [this.createWireframe(camera, offset), ...this.createAxes(camera, offset)];

    if (isPlaneMode) {
      children.push(...this.createInterceptTracks(camera, offset));
      children.push(...this.createPlanes(camera, offset));
      if (this.model.showNormalProperty.value) {
        children.push(this.createNormalArrow(camera, offset));
      }
    } else {
      children.push(this.createDirectionArrow(camera, offset));
    }

    replaceChildren(this.contentNode, children);
    this.positionHandles(camera, offset, isPlaneMode);
  }

  // ── Handles ────────────────────────────────────────────────────────────────

  /**
   * Moves each handle onto the point it represents. Positions are set with
   * `x`/`y` rather than `centerX`/`centerY`: the projection already centres its
   * content on the local origin, and a bounds-based centre would drift as the
   * content's extent changed.
   */
  private positionHandles(camera: Projection3D, offset: Vector3, isPlaneMode: boolean): void {
    for (const axis of AXES) {
      // biome-ignore lint/style/noNonNullAssertion: interceptHandles is indexed by AXES
      const handle = this.interceptHandles[axis]!;
      handle.visible = isPlaneMode;

      const intercept = this.model.interceptsProperty.value[axis];
      const position = intercept === null ? PARALLEL_INTERCEPT_POSITION : intercept.value;
      const view = camera.projectToView(this.axisPoint(axis, position).minus(offset));
      handle.x = view.x;
      handle.y = view.y;
      // A parallel intercept is a different kind of answer from a numeric one,
      // so the handle says so by going hollow rather than only by moving.
      handle.fill = intercept === null ? null : this.axisColor(axis);
    }

    this.directionHandle.visible = !isPlaneMode;
    const tip = camera.projectToView(this.model.directionVectorProperty.value.minus(offset));
    this.directionHandle.x = tip.x;
    this.directionHandle.y = tip.y;
  }

  /** A draggable handle that slides along one axis between the intercept stops. */
  private createInterceptHandle(
    axis: AxisIndex,
    fill: (typeof CrystalLatticeColors)["vectorAColorProperty"],
    accessibleName: TReadOnlyProperty<string>,
  ): Circle {
    const handle = new Circle(HANDLE_RADIUS, {
      fill,
      stroke: CrystalLatticeColors.textColorProperty,
      lineWidth: 2,
      cursor: "pointer",
      accessibleName,
      // A plain Node needs these to be reachable by keyboard at all.
      tagName: "div",
      focusable: true,
    });

    handle.addInputListener(
      new DragListener({
        applyOffset: false,
        drag: (event) => {
          const along = this.dragToAxisPosition(axis, event.pointer.point);
          if (along !== null) {
            this.model.setIntercept(axis, nearestStop(along));
          }
        },
      }),
    );

    // Both axis pairs step the track: which screen direction an axis points in
    // depends entirely on where the student has orbited the cell to.
    handle.addInputListener(
      new KeyboardListener({
        keys: ["arrowRight", "arrowUp", "arrowLeft", "arrowDown", "home", "end"],
        fire: (_event, keysPressed) => this.stepIntercept(axis, keysPressed),
      }),
    );

    return handle;
  }

  /** Moves an intercept by one stop, or to either end of its track. */
  private stepIntercept(axis: AxisIndex, keysPressed: string): void {
    const current = this.model.interceptsProperty.value[axis];
    const index = INTERCEPT_STOPS.findIndex((candidate) =>
      candidate === null ? current === null : current !== null && Math.abs(candidate - current.value) < 1e-6,
    );
    // An intercept that is not on the track can only be the parallel one.
    const from = index === -1 ? INTERCEPT_STOPS.length - 1 : index;

    const target =
      keysPressed === "home"
        ? 0
        : keysPressed === "end"
          ? INTERCEPT_STOPS.length - 1
          : keysPressed === "arrowRight" || keysPressed === "arrowUp"
            ? from + 1
            : from - 1;

    const stop = INTERCEPT_STOPS[Math.max(0, Math.min(INTERCEPT_STOPS.length - 1, target))];
    if (stop !== undefined) {
      this.model.setIntercept(axis, stop);
    }
  }

  /**
   * Where a pointer sits along one axis, in cell edges, or null when the axis is
   * too foreshortened for the answer to mean anything. The projection is linear,
   * so the axis stays a straight line in view space and the position is just the
   * pointer's component along it.
   */
  private dragToAxisPosition(axis: AxisIndex, globalPoint: Vector2): number | null {
    const camera = this.cameraProperty.value;
    const edge = this.model.edgeLength;
    const offset = new Vector3(edge / 2, edge / 2, edge / 2);

    const origin = camera.projectToView(new Vector3(0, 0, 0).minus(offset));
    const unit = camera.projectToView(this.axisPoint(axis, 1).minus(offset)).minus(origin);
    if (unit.magnitude < MIN_PROJECTED_AXIS_PIXELS) {
      return null;
    }

    const local = this.globalToLocalPoint(globalPoint);
    return local.minus(origin).dot(unit) / unit.magnitudeSquared;
  }

  /** A draggable handle at the tip of the direction vector. */
  private createDirectionHandle(accessibleName: TReadOnlyProperty<string>): Circle {
    const handle = new Circle(HANDLE_RADIUS, {
      fill: CrystalLatticeColors.directionColorProperty,
      stroke: CrystalLatticeColors.textColorProperty,
      lineWidth: 2,
      cursor: "pointer",
      accessibleName,
      tagName: "div",
      focusable: true,
    });

    handle.addInputListener(
      new DragListener({
        applyOffset: false,
        drag: (event) => this.dragDirectionTo(this.globalToLocalPoint(event.pointer.point)),
      }),
    );

    handle.addInputListener(
      new KeyboardListener({
        keys: ["arrowRight", "arrowLeft", "arrowUp", "arrowDown"],
        fire: (_event, keysPressed) => this.nudgeDirection(keysPressed),
      }),
    );

    return handle;
  }

  /**
   * Points the direction vector at a view position. Two view coordinates cannot
   * fix three model components, so the tip's current camera depth is held: the
   * drag slides the tip across the plane facing the viewer, and orbiting the cell
   * is how the third component is reached.
   */
  private dragDirectionTo(localPoint: Vector2): void {
    const camera = this.cameraProperty.value;
    const edge = this.model.edgeLength;
    const offset = new Vector3(edge / 2, edge / 2, edge / 2);
    const current = this.model.directionVectorProperty.value.minus(offset);

    this.model.setDirectionFromVector(camera.unproject(localPoint, camera.depthOf(current)).plus(offset));
  }

  /** Slides the direction tip one step across the plane facing the viewer. */
  private nudgeDirection(keysPressed: string): void {
    const camera = this.cameraProperty.value;
    const edge = this.model.edgeLength;
    const offset = new Vector3(edge / 2, edge / 2, edge / 2);
    const current = this.model.directionVectorProperty.value.minus(offset);
    const view = camera.projectToView(current);

    const step = DIRECTION_KEY_STEP * edge * camera.scale;
    const delta = new Vector2(
      keysPressed === "arrowRight" ? step : keysPressed === "arrowLeft" ? -step : 0,
      // View y grows downward, so "up" is a negative step.
      keysPressed === "arrowDown" ? step : keysPressed === "arrowUp" ? -step : 0,
    );

    this.model.setDirectionFromVector(camera.unproject(view.plus(delta), camera.depthOf(current)).plus(offset));
  }

  /** The model-space point `position` cell edges out along one axis. */
  private axisPoint(axis: AxisIndex, position: number): Vector3 {
    const distance = position * this.model.edgeLength;
    return new Vector3(axis === 0 ? distance : 0, axis === 1 ? distance : 0, axis === 2 ? distance : 0);
  }

  /** The colour that names one axis throughout the sim. */
  private axisColor(axis: AxisIndex): (typeof CrystalLatticeColors)["vectorAColorProperty"] {
    return axis === 0
      ? CrystalLatticeColors.vectorAColorProperty
      : axis === 1
        ? CrystalLatticeColors.vectorBColorProperty
        : CrystalLatticeColors.vectorCColorProperty;
  }

  /** The cube's twelve edges. */
  private createWireframe(camera: Projection3D, offset: Vector3): Node {
    const corners = cellCorners(this.model.edgeLength).map((corner) => corner.minus(offset));
    const shape = new Shape();

    for (const [from, to] of cellEdgeIndices()) {
      const a = camera.projectToView(corners[from] as Vector3);
      const b = camera.projectToView(corners[to] as Vector3);
      shape.moveTo(a.x, a.y).lineTo(b.x, b.y);
    }

    return new Path(shape, {
      stroke: CrystalLatticeColors.cellOutlineColorProperty,
      lineWidth: OUTLINE_LINE_WIDTH,
      opacity: 0.7,
    });
  }

  /** The a, b and c axes drawn out from the cell origin, each in its own colour. */
  private createAxes(camera: Projection3D, offset: Vector3): Node[] {
    const edge = this.model.edgeLength;
    const origin = new Vector3(0, 0, 0).minus(offset);

    const axes: Array<{ end: Vector3; label: string; color: (typeof CrystalLatticeColors)["vectorAColorProperty"] }> = [
      {
        end: new Vector3(edge * 1.25, 0, 0).minus(offset),
        label: "a",
        color: CrystalLatticeColors.vectorAColorProperty,
      },
      {
        end: new Vector3(0, edge * 1.25, 0).minus(offset),
        label: "b",
        color: CrystalLatticeColors.vectorBColorProperty,
      },
      {
        end: new Vector3(0, 0, edge * 1.25).minus(offset),
        label: "c",
        color: CrystalLatticeColors.vectorCColorProperty,
      },
    ];

    return axes.flatMap(({ end, label, color }) => {
      const start = camera.projectToView(origin);
      const tip = camera.projectToView(end);
      const labelPosition = camera.projectToView(end).plus(tip.minus(start).normalized().timesScalar(14));
      return [
        new ArrowNode(start.x, start.y, tip.x, tip.y, {
          fill: color,
          stroke: color,
          headHeight: 10,
          headWidth: 10,
          tailWidth: 2,
        }),
        new Text(label, {
          font: new PhetFont({ size: HEADING_FONT_SIZE, weight: "bold" }),
          fill: color,
          center: labelPosition,
        }),
      ];
    });
  }

  /**
   * The track each intercept handle slides along: a faint guide covering the
   * negative half the axis arrow does not reach, a tick at every stop, and a "∥"
   * marker naming the far end. The ticks are what make the stops discoverable —
   * without them a snapping handle just feels sticky.
   */
  private createInterceptTracks(camera: Projection3D, offset: Vector3): Node[] {
    const strings = StringManager.getInstance().getMillerIndicesStrings();
    const nodes: Node[] = [];

    for (const axis of AXES) {
      const color = this.axisColor(axis);
      const origin = camera.projectToView(new Vector3(0, 0, 0).minus(offset));
      const unit = camera.projectToView(this.axisPoint(axis, 1).minus(offset)).minus(origin);
      // Perpendicular to the projected axis, so ticks cross it rather than lie along it.
      const across =
        unit.magnitude < 1e-6 ? Vector2.ZERO : new Vector2(-unit.y, unit.x).normalized().timesScalar(TICK_HALF_LENGTH);

      const negativeEnd = camera.projectToView(this.axisPoint(axis, -NEGATIVE_TRACK_EXTENT).minus(offset));
      nodes.push(
        new Path(new Shape().moveTo(origin.x, origin.y).lineTo(negativeEnd.x, negativeEnd.y), {
          stroke: color,
          lineWidth: 1,
          lineDash: [4, 4],
          opacity: 0.5,
        }),
      );

      const ticks = new Shape();
      for (const stop of INTERCEPT_STOPS) {
        const at = camera.projectToView(this.axisPoint(axis, stopPosition(stop)).minus(offset));
        ticks.moveTo(at.x - across.x, at.y - across.y).lineTo(at.x + across.x, at.y + across.y);
      }
      nodes.push(new Path(ticks, { stroke: color, lineWidth: 2, opacity: 0.8 }));

      const parallelAt = camera.projectToView(this.axisPoint(axis, PARALLEL_INTERCEPT_POSITION).minus(offset));
      nodes.push(
        new Text(strings.parallelSymbolStringProperty, {
          font: new PhetFont(READOUT_FONT_SIZE - 2),
          fill: color,
          center: parallelAt.plus(across.timesScalar(2)),
          opacity: 0.9,
        }),
      );
    }

    return nodes;
  }

  /** The selected plane, plus its equivalent family when that overlay is on. */
  private createPlanes(camera: Projection3D, offset: Vector3): Node[] {
    const indices = this.model.planeIndicesProperty.value;
    const nodes = [this.createPlanePolygon(camera, offset, indices, 1)];

    if (this.model.showFamilyProperty.value) {
      // Family members are drawn faint so the selected plane stays legible;
      // {100}'s six faces would otherwise fill the cube with solid colour.
      for (const member of this.model.familyProperty.value) {
        if (member.join(",") === indices.join(",")) {
          continue;
        }
        const polygon = this.createPlanePolygon(camera, offset, member, 1);
        polygon.opacity = 0.35;
        nodes.push(polygon);
      }
    }
    return nodes;
  }

  /** One plane's cross-section through the cell. */
  private createPlanePolygon(camera: Projection3D, offset: Vector3, indices: IndexTriple, planeOffset: number): Path {
    const points = planePolygonInCell(indices, this.model.edgeLength, planeOffset).map((point) =>
      camera.projectToView(point.minus(offset)),
    );
    return new Path(polygonShape(points), {
      fill: CrystalLatticeColors.planeColorProperty,
      stroke: CrystalLatticeColors.wignerSeitzColorProperty,
      lineWidth: OUTLINE_LINE_WIDTH,
    });
  }

  /** The direction vector [uvw], drawn from the cell origin. */
  private createDirectionArrow(camera: Projection3D, offset: Vector3): Node {
    const start = camera.projectToView(new Vector3(0, 0, 0).minus(offset));
    const end = camera.projectToView(this.model.directionVectorProperty.value.minus(offset));
    return new ArrowNode(start.x, start.y, end.x, end.y, {
      fill: CrystalLatticeColors.directionColorProperty,
      stroke: CrystalLatticeColors.directionColorProperty,
      headHeight: 14,
      headWidth: 14,
      tailWidth: 4,
    });
  }

  /**
   * The plane's normal [hkl], drawn from the cell origin. In a cubic crystal
   * the normal to (hkl) is the direction [hkl] with the same numbers, which is
   * the connection this overlay exists to make visible.
   */
  private createNormalArrow(camera: Projection3D, offset: Vector3): Node {
    const normal = this.model.planeNormalVector().normalized().timesScalar(this.model.edgeLength);
    const start = camera.projectToView(new Vector3(0, 0, 0).minus(offset));
    const end = camera.projectToView(normal.minus(offset));
    return new ArrowNode(start.x, start.y, end.x, end.y, {
      fill: CrystalLatticeColors.directionColorProperty,
      stroke: CrystalLatticeColors.directionColorProperty,
      headHeight: 12,
      headWidth: 12,
      tailWidth: 3,
      lineDash: [5, 4],
    });
  }

  public override dispose(): void {
    this.modelMultilink.dispose();
    super.dispose();
  }
}

/**
 * The stop nearest a dragged position along an axis. Distances are measured in
 * cell edges along the track, which is a monotone function of view distance, so
 * "nearest on screen" and "nearest here" pick the same stop.
 */
function nearestStop(position: number): number | null {
  let best = INTERCEPT_STOPS[0] ?? null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const stop of INTERCEPT_STOPS) {
    const distance = Math.abs(stopPosition(stop) - position);
    if (distance < bestDistance) {
      best = stop;
      bestDistance = distance;
    }
  }
  return best;
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
