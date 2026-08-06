/**
 * Lattice2DNode.ts
 *
 * The play area of the 2D Lattices screen: the lattice points themselves, the
 * two draggable primitive-vector handles anchored at the highlighted origin
 * atom, and the optional overlays (primitive cell, Wigner–Seitz cell and its
 * bisector construction, nearest-neighbour shell).
 *
 * Model coordinates are nanometres with +y up; view coordinates are pixels with
 * +y down, so a single ModelViewTransform2 handles the flip and the scale, and
 * every geometry function stays in model units.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, DragListener, Node, type NodeOptions, Path } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import { DEFAULT_LATTICE_VECTOR_NM, LATTICE_2D_RANGE, OUTLINE_LINE_WIDTH } from "../../CrystalLatticeConstants.js";
import {
  firstCoordinationShell,
  generateCenteringPoints,
  generateLatticePoints,
  type Lattice2DParameters,
  primitiveCellCorners,
  primitiveVector1,
  primitiveVector2,
  wignerSeitzBisectors,
  wignerSeitzCell,
} from "../../common/model/Lattice2D.js";
import { AtomNode } from "../../common/view/AtomNode.js";
import { GAMMA_RANGE, LATTICE_VECTOR_RANGE, type Lattices2DModel } from "../model/Lattices2DModel.js";

/** Radius of an ordinary lattice point, in view pixels. */
const POINT_RADIUS = 6;

/** Radius of the origin atom, drawn larger since it anchors the two handles. */
const ORIGIN_RADIUS = 9;

/** Radius of a draggable vector handle, sized for a comfortable touch target. */
const HANDLE_RADIUS = 11;

export type Lattice2DNodeOptions = NodeOptions;

export class Lattice2DNode extends Node {
  private readonly model: Lattices2DModel;
  private readonly modelViewTransform: ModelViewTransform2;

  private readonly overlayLayer = new Node();
  private readonly pointLayer = new Node();
  private readonly vectorLayer = new Node();

  private readonly multilink: UnknownMultilink;

  /**
   * @param model - the screen model
   * @param viewSize - the square play-area size in pixels
   * @param providedOptions
   */
  public constructor(model: Lattices2DModel, viewSize: number, providedOptions?: Lattice2DNodeOptions) {
    super(providedOptions);
    this.model = model;

    // Fix the scale once, from the default vector length, rather than fitting
    // the current lattice: a scale that rescaled as the sliders moved would
    // hide the very thing the sliders change. Six default-length cells fill
    // the half-width, so the widest lattice still shows several cells either side.
    const modelExtent = 6 * DEFAULT_LATTICE_VECTOR_NM;
    const scale = viewSize / (2 * modelExtent);
    this.modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
      Vector2.ZERO,
      new Vector2(viewSize / 2, viewSize / 2),
      scale,
    );

    this.addChild(this.overlayLayer);
    this.addChild(this.pointLayer);
    this.addChild(this.vectorLayer);

    this.multilink = Multilink.multilink(
      [
        model.parametersProperty,
        model.showPrimitiveCellProperty,
        model.showWignerSeitzProperty,
        model.showBisectorsProperty,
        model.showCoordinationProperty,
      ],
      () => this.rebuild(),
    );
  }

  /** Rebuilds every layer for the current parameters and overlay toggles. */
  private rebuild(): void {
    const parameters = this.model.parametersProperty.value;
    this.rebuildOverlays(parameters);
    this.rebuildPoints(parameters);
    this.rebuildVectors(parameters);
  }

  /** Primitive cell, Wigner–Seitz cell, bisector construction, coordination shell. */
  private rebuildOverlays(parameters: Lattice2DParameters): void {
    const children: Node[] = [];

    if (this.model.showPrimitiveCellProperty.value) {
      children.push(
        new Path(this.polygonShape(primitiveCellCorners(parameters)), {
          fill: CrystalLatticeColors.cellFillColorProperty,
          stroke: CrystalLatticeColors.cellOutlineColorProperty,
          lineWidth: OUTLINE_LINE_WIDTH,
          lineDash: [6, 4],
        }),
      );
    }

    if (this.model.showBisectorsProperty.value) {
      // Each contributing neighbour gets a spoke out to it and the perpendicular
      // bisector of that spoke — the construction as it is drawn by hand.
      for (const { neighbor, midpoint } of wignerSeitzBisectors(parameters)) {
        const perpendicular = new Vector2(-neighbor.y, neighbor.x).normalized().timesScalar(neighbor.magnitude);
        children.push(
          new Path(this.lineShape(Vector2.ZERO, neighbor), {
            stroke: CrystalLatticeColors.wignerSeitzColorProperty,
            lineWidth: 1,
            opacity: 0.5,
          }),
          new Path(this.lineShape(midpoint.minus(perpendicular), midpoint.plus(perpendicular)), {
            stroke: CrystalLatticeColors.wignerSeitzColorProperty,
            lineWidth: 1,
            lineDash: [3, 3],
            opacity: 0.7,
          }),
        );
      }
    }

    if (this.model.showWignerSeitzProperty.value) {
      const cell = wignerSeitzCell(parameters);
      if (cell.length > 0) {
        children.push(
          new Path(this.polygonShape(cell), {
            fill: CrystalLatticeColors.cellFillColorProperty,
            stroke: CrystalLatticeColors.wignerSeitzColorProperty,
            lineWidth: OUTLINE_LINE_WIDTH,
          }),
        );
      }
    }

    if (this.model.showCoordinationProperty.value) {
      const shell = firstCoordinationShell(parameters);
      children.push(
        new Circle(this.modelViewTransform.modelToViewDeltaX(shell.distance), {
          center: this.modelViewTransform.modelToViewPosition(Vector2.ZERO),
          stroke: CrystalLatticeColors.successColorProperty,
          lineWidth: OUTLINE_LINE_WIDTH,
          lineDash: [5, 5],
        }),
      );
    }

    this.overlayLayer.children = children;
  }

  /** The lattice points, plus the centring basis atoms when the motif has two. */
  private rebuildPoints(parameters: Lattice2DParameters): void {
    const children: Node[] = [];

    for (const point of generateLatticePoints(parameters, LATTICE_2D_RANGE)) {
      const isOrigin = point.magnitude < 1e-9;
      children.push(
        new AtomNode(isOrigin ? ORIGIN_RADIUS : POINT_RADIUS, {
          center: this.modelViewTransform.modelToViewPosition(point),
          baseColor: isOrigin ? CrystalLatticeColors.originAtomColorProperty : CrystalLatticeColors.atomColorProperty,
        }),
      );
    }

    if (parameters.centered === true) {
      for (const point of generateCenteringPoints(parameters, LATTICE_2D_RANGE)) {
        children.push(
          new AtomNode(POINT_RADIUS, {
            center: this.modelViewTransform.modelToViewPosition(point),
            baseColor: CrystalLatticeColors.centeringAtomColorProperty,
          }),
        );
      }
    }

    this.pointLayer.children = children;
  }

  /** The two primitive vectors, each with a draggable handle at its tip. */
  private rebuildVectors(parameters: Lattice2DParameters): void {
    const origin = this.modelViewTransform.modelToViewPosition(Vector2.ZERO);
    const tip1 = this.modelViewTransform.modelToViewPosition(primitiveVector1(parameters));
    const tip2 = this.modelViewTransform.modelToViewPosition(primitiveVector2(parameters));

    this.vectorLayer.children = [
      new ArrowNode(origin.x, origin.y, tip1.x, tip1.y, {
        fill: CrystalLatticeColors.vectorAColorProperty,
        stroke: CrystalLatticeColors.vectorAColorProperty,
        headHeight: 12,
        headWidth: 12,
        tailWidth: 3,
      }),
      new ArrowNode(origin.x, origin.y, tip2.x, tip2.y, {
        fill: CrystalLatticeColors.vectorBColorProperty,
        stroke: CrystalLatticeColors.vectorBColorProperty,
        headHeight: 12,
        headWidth: 12,
        tailWidth: 3,
      }),
      this.createHandle(tip1, CrystalLatticeColors.vectorAColorProperty, true),
      this.createHandle(tip2, CrystalLatticeColors.vectorBColorProperty, false),
    ];
  }

  /**
   * A draggable handle at a vector's tip.
   *
   * Dragging a₁'s handle changes only |a₁| — a₁ is the frame's reference
   * direction and is always along +x, so letting it rotate would just spin the
   * whole picture without changing the lattice. Dragging a₂'s handle changes
   * both |a₂| and γ, which is where the interesting exploration lives.
   */
  private createHandle(
    center: Vector2,
    fill: (typeof CrystalLatticeColors)["vectorAColorProperty"],
    isFirstVector: boolean,
  ): Node {
    const handle = new Circle(HANDLE_RADIUS, {
      center,
      fill,
      stroke: CrystalLatticeColors.atomStrokeColorProperty,
      lineWidth: 2,
      cursor: "pointer",
      // A plain Node needs these to be reachable by keyboard at all.
      tagName: "div",
      focusable: true,
    });

    handle.addInputListener(
      new DragListener({
        applyOffset: false,
        drag: (event) => {
          const modelPoint = this.modelViewTransform.viewToModelPosition(this.globalToLocalPoint(event.pointer.point));
          if (isFirstVector) {
            this.model.a1Property.value = LATTICE_VECTOR_RANGE.constrainValue(Math.abs(modelPoint.x));
          } else {
            this.model.a2Property.value = LATTICE_VECTOR_RANGE.constrainValue(modelPoint.magnitude);
            const degrees = (Math.atan2(modelPoint.y, modelPoint.x) * 180) / Math.PI;
            this.model.gammaDegreesProperty.value = GAMMA_RANGE.constrainValue(degrees);
          }
        },
      }),
    );

    return handle;
  }

  /** A closed Kite Shape through model-space points, mapped to view space. */
  private polygonShape(points: readonly Vector2[]): Shape {
    const shape = new Shape();
    points.forEach((point, index) => {
      const view = this.modelViewTransform.modelToViewPosition(point);
      if (index === 0) {
        shape.moveTo(view.x, view.y);
      } else {
        shape.lineTo(view.x, view.y);
      }
    });
    return shape.close();
  }

  /** A single model-space segment, mapped to view space. */
  private lineShape(from: Vector2, to: Vector2): Shape {
    const start = this.modelViewTransform.modelToViewPosition(from);
    const end = this.modelViewTransform.modelToViewPosition(to);
    return new Shape().moveTo(start.x, start.y).lineTo(end.x, end.y);
  }

  public override dispose(): void {
    this.multilink.dispose();
    super.dispose();
  }
}
