/**
 * MillerCellNode.ts
 *
 * The projected cubic cell for the Miller Indices screen: the wireframe cube,
 * its three labelled axes, and either the shaded plane (plane mode) or the
 * direction arrow (direction mode), with optional overlays for the plane's
 * normal and its symmetry-equivalent family.
 *
 * There are no atoms here on purpose. This screen is about notation, and
 * spheres would only obscure where the plane actually cuts the cell.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type Node, Path, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import { HEADING_FONT_SIZE, OUTLINE_LINE_WIDTH } from "../../CrystalLatticeConstants.js";
import { cellCorners, cellEdgeIndices } from "../../common/model/CubicCell.js";
import type { IndexTriple } from "../../common/model/MillerIndices.js";
import { planePolygonInCell } from "../../common/model/MillerIndices.js";
import type { Projection3D } from "../../common/model/Projection3D.js";
import { Projected3DNode, type Projected3DNodeOptions } from "../../common/view/Projected3DNode.js";
import { type MillerIndicesModel, MillerMode } from "../model/MillerIndicesModel.js";

export type MillerCellNodeOptions = Projected3DNodeOptions;

export class MillerCellNode extends Projected3DNode {
  private readonly model: MillerIndicesModel;
  private readonly modelMultilink: UnknownMultilink;

  public constructor(model: MillerIndicesModel, viewSize: number, providedOptions?: MillerCellNodeOptions) {
    // Room for the cube's half-diagonal plus the axis labels beyond it.
    const modelScale = viewSize / 2 / (model.edgeLength * 1.5);

    super(modelScale, [], providedOptions);
    this.model = model;

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

    const children: Node[] = [this.createWireframe(camera, offset), ...this.createAxes(camera, offset)];

    if (this.model.modeProperty.value === MillerMode.PLANE) {
      children.push(...this.createPlanes(camera, offset));
      if (this.model.showNormalProperty.value) {
        children.push(this.createNormalArrow(camera, offset));
      }
    } else {
      children.push(this.createDirectionArrow(camera, offset));
    }

    this.contentNode.children = children;
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
