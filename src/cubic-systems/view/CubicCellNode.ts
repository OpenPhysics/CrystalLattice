/**
 * CubicCellNode.ts
 *
 * The projected cubic unit cell: a wireframe cube plus its hard-sphere atoms,
 * z-sorted so nearer spheres paint over farther ones, and rebuilt whenever the
 * camera or the model changes.
 *
 * ── Painter's algorithm, and where it breaks ──────────────────────────────────
 * Sorting whole spheres back-to-front is exact for non-intersecting spheres of
 * equal size, which is the hard-sphere case this screen is about. Once the
 * radius slider is pushed past touching the spheres interpenetrate and the sort
 * can no longer be exact — but that state is already flagged as unphysical, so
 * a slightly wrong occlusion there is the least of its problems.
 *
 * The cube's twelve edges are drawn in two passes, behind and in front of the
 * atoms, split at the cube's centre depth. That is what makes the cell read as
 * a box containing the spheres rather than a box drawn over them.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { type Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  MAX_ATOM_RADIUS_NM,
  MAX_CELL_EDGE_NM,
  OUTLINE_LINE_WIDTH,
  READOUT_FONT_SIZE,
} from "../../CrystalLatticeConstants.js";
import { cellCorners, cellEdgeIndices, SiteKind } from "../../common/model/CubicCell.js";
import type { Projection3D } from "../../common/model/Projection3D.js";
import { AtomNode, createSharingWedge } from "../../common/view/AtomNode.js";
import { Projected3DNode, type Projected3DNodeOptions } from "../../common/view/Projected3DNode.js";
import type { CubicSystemsModel } from "../model/CubicSystemsModel.js";

export type CubicCellNodeOptions = Projected3DNodeOptions;

export class CubicCellNode extends Projected3DNode {
  private readonly model: CubicSystemsModel;
  private readonly modelMultilink: UnknownMultilink;

  /**
   * @param model - the screen model
   * @param viewSize - the play area's square size in pixels
   * @param providedOptions
   */
  public constructor(model: CubicSystemsModel, viewSize: number, providedOptions?: CubicCellNodeOptions) {
    // Scale so the largest cell the slider allows still fits at any rotation,
    // allowing for the cube's half-diagonal plus one atomic radius. Fixing the
    // scale here means the edge slider visibly changes the cell's size rather
    // than silently rescaling the view.
    const worstCaseExtent = (MAX_CELL_EDGE_NM * Math.sqrt(3)) / 2 + MAX_ATOM_RADIUS_NM;
    const modelScale = viewSize / 2 / worstCaseExtent;

    super(modelScale, [], providedOptions);
    this.model = model;

    this.modelMultilink = Multilink.multilink(
      [
        model.structureProperty,
        model.edgeLengthProperty,
        model.atomRadiusProperty,
        model.clipFrontProperty,
        model.showSharingProperty,
      ],
      () => this.rebuild(),
    );
  }

  /** Rebuilds the wireframe and the depth-sorted spheres for the current camera. */
  protected override rebuild(): void {
    // The base class calls this from its constructor, before our own fields are
    // assigned; there is nothing to draw until the model reference exists.
    if (this.model === undefined) {
      return;
    }

    const camera = this.cameraProperty.value;
    const edge = this.model.edgeLengthProperty.value;
    // Centre the cell on the origin so rotation spins it in place rather than
    // swinging it around a corner.
    const offset = new Vector3(edge / 2, edge / 2, edge / 2);

    const corners = cellCorners(edge).map((corner) => corner.minus(offset));
    const centerDepth = camera.depthOf(new Vector3(0, 0, 0));

    const behindEdges: Node[] = [];
    const frontEdges: Node[] = [];
    for (const [from, to] of cellEdgeIndices()) {
      const start = corners[from] as Vector3;
      const end = corners[to] as Vector3;
      const midDepth = camera.depthOf(start.plus(end).timesScalar(0.5));
      const line = this.createEdgeLine(camera, start, end);
      (midDepth < centerDepth ? behindEdges : frontEdges).push(line);
    }

    this.contentNode.children = [
      new Node({ children: behindEdges, opacity: 0.45 }),
      ...this.createAtomNodes(camera, offset),
      new Node({ children: frontEdges }),
    ];
  }

  /** One wireframe edge of the cube. */
  private createEdgeLine(camera: Projection3D, start: Vector3, end: Vector3): Path {
    const a = camera.projectToView(start);
    const b = camera.projectToView(end);
    return new Path(new Shape().moveTo(a.x, a.y).lineTo(b.x, b.y), {
      stroke: CrystalLatticeColors.cellOutlineColorProperty,
      lineWidth: OUTLINE_LINE_WIDTH,
    });
  }

  /** The cell's atoms as depth-sorted spheres, optionally with sharing wedges. */
  private createAtomNodes(camera: Projection3D, offset: Vector3): Node[] {
    const edge = this.model.edgeLengthProperty.value;
    const radius = this.model.atomRadiusProperty.value;
    const showSharing = this.model.showSharingProperty.value;
    const clipFront = this.model.clipFrontProperty.value;

    const placed = this.model.cellAtomsProperty.value.map((atom) => ({
      atom,
      position: atom.fractionalPosition.timesScalar(edge).minus(offset),
    }));

    const sorted = camera.depthSort(placed);
    const viewRadius = radius * camera.scale;
    const nodes: Node[] = [];

    for (const { atom, position } of sorted) {
      // "Cut away front" hides everything nearer than the cell centre, which is
      // the only way to see a body-centre atom without rotating past it.
      if (clipFront && camera.depthOf(position) > 0) {
        continue;
      }

      const view = camera.projectToView(position);
      const sphere = new AtomNode(viewRadius, {
        center: view,
        baseColor:
          atom.kind === SiteKind.CORNER
            ? CrystalLatticeColors.atomColorProperty
            : CrystalLatticeColors.centeringAtomColorProperty,
      });

      if (showSharing) {
        const wedge = createSharingWedge(viewRadius, atom.sharingFraction, "rgba(255,255,255,0.55)");
        wedge.center = view;
        nodes.push(new Node({ children: [sphere, wedge] }), this.createFractionLabel(atom.sharingFraction, view));
      } else {
        nodes.push(sphere);
      }
    }
    return nodes;
  }

  /** The "1/8", "1/2" or "1" label that goes with a sharing wedge. */
  private createFractionLabel(fraction: number, view: Vector2): Node {
    const text = fraction === 1 ? "1" : `1/${Math.round(1 / fraction)}`;
    return new Node({
      children: [
        new Circle(11, { center: view, fill: "rgba(0,0,0,0.65)" }),
        new Text(text, {
          font: new PhetFont({ size: READOUT_FONT_SIZE - 2, weight: "bold" }),
          fill: "#ffffff",
          center: view,
        }),
      ],
    });
  }

  public override dispose(): void {
    this.modelMultilink.dispose();
    super.dispose();
  }
}
