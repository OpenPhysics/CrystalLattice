/**
 * LayerStackNode.ts
 *
 * The projected stack of close-packed layers. Spheres are coloured by their
 * layer position — A, B or C — because that colouring *is* the lesson: an ABAB
 * stack shows two alternating colours and an ABCABC stack shows three cycling
 * ones, and nothing else about the two pictures differs.
 *
 * Rendering is depth-sorted across the whole stack, not layer by layer, so a
 * rotated stack occludes correctly rather than showing upper layers through
 * lower ones.
 */

import { Multilink, type UnknownMultilink } from "scenerystack/axon";
import { Vector3 } from "scenerystack/dot";
import { type Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import { CLOSE_PACKING_LAYER_RANGE, HEADING_FONT_SIZE, MAX_LAYER_COUNT } from "../../CrystalLatticeConstants.js";
import { LayerPosition } from "../../common/model/ClosePacking.js";
import { AtomNode } from "../../common/view/AtomNode.js";
import { Projected3DNode, type Projected3DNodeOptions } from "../../common/view/Projected3DNode.js";
import { replaceChildren } from "../../common/view/replaceChildren.js";
import { type ClosePackingModel, IN_PLANE_CONSTANT_NM } from "../model/ClosePackingModel.js";

/** Camera pitch for the stack view, steeper than the sim-wide default. */
const STACK_PITCH = (40 * Math.PI) / 180;

export type LayerStackNodeOptions = Projected3DNodeOptions;

export class LayerStackNode extends Projected3DNode {
  private readonly model: ClosePackingModel;
  private readonly modelMultilink: UnknownMultilink;

  public constructor(model: ClosePackingModel, viewSize: number, providedOptions?: LayerStackNodeOptions) {
    // Size for the worst case: the widest layer plus the tallest stack, so the
    // scale never changes as layers are added.
    const lateralExtent = (CLOSE_PACKING_LAYER_RANGE + 1) * IN_PLANE_CONSTANT_NM * 1.6;
    const verticalExtent = (MAX_LAYER_COUNT * IN_PLANE_CONSTANT_NM) / 2;
    const modelScale = viewSize / 2 / Math.max(lateralExtent, verticalExtent);

    super(modelScale, [], providedOptions);
    this.model = model;

    // Layers nest into each other's hollows, so at the default shallow tilt an
    // ABAB stack reads as one thick slab. Looking down more steeply separates
    // the layers, which is the only thing this screen asks the student to see.
    this.cameraProperty.value = this.cameraProperty.value.withPitch(STACK_PITCH);

    this.modelMultilink = Multilink.multilink(
      [model.stackProperty, model.sphereRadiusProperty, model.showLabelsProperty],
      () => this.rebuild(),
    );
  }

  /** Rebuilds the depth-sorted spheres and their optional layer labels. */
  protected override rebuild(): void {
    // The base class rebuilds once from its own constructor, before this
    // subclass has assigned its fields.
    if (this.model === undefined) {
      return;
    }

    const camera = this.cameraProperty.value;
    const stack = this.model.stackProperty.value;
    const radius = this.model.sphereRadiusProperty.value;
    const viewRadius = radius * camera.scale;

    // Centre the stack vertically so it rotates about its own middle.
    const topHeight = stack.length > 0 ? (stack[stack.length - 1] as (typeof stack)[number]).height : 0;
    const offset = new Vector3(0, 0, topHeight / 2);

    // Model +z is the stacking axis, but the camera's "up" is model +y, so the
    // stack is laid out with its height along y and drawn from a fixed tilt.
    const placed = stack.flatMap((layer) =>
      layer.centers.map((center) => ({
        position: new Vector3(center.x, center.z - offset.z, center.y),
        layer,
      })),
    );

    const children: Node[] = camera.depthSort(placed).map(
      ({ position, layer }) =>
        new AtomNode(viewRadius, {
          center: camera.projectToView(position),
          baseColor: layerColorProperty(layer.position),
        }),
    );

    if (this.model.showLabelsProperty.value) {
      children.push(...this.createLayerLabels(offset.z));
    }

    replaceChildren(this.contentNode, children);
  }

  /**
   * An A / B / C label beside each layer, placed out past the layer's edge so
   * it does not sit on top of the spheres it is naming.
   */
  private createLayerLabels(heightOffset: number): Node[] {
    const camera = this.cameraProperty.value;
    const labelX = (CLOSE_PACKING_LAYER_RANGE + 1.4) * IN_PLANE_CONSTANT_NM;

    return this.model.stackProperty.value.map((layer) => {
      const anchor = camera.projectToView(new Vector3(labelX, layer.height - heightOffset, 0));
      return new Text(layer.position, {
        font: new PhetFont({ size: HEADING_FONT_SIZE, weight: "bold" }),
        fill: layerColorProperty(layer.position),
        center: anchor,
      });
    });
  }

  /** Resets to this screen's steeper default rather than the sim-wide one. */
  public override resetCamera(): void {
    super.resetCamera();
    this.cameraProperty.value = this.cameraProperty.value.withPitch(STACK_PITCH);
  }

  public override dispose(): void {
    this.modelMultilink.dispose();
    super.dispose();
  }
}

/** The colour of a layer, which is the only thing distinguishing HCP from FCC. */
export function layerColorProperty(position: LayerPosition) {
  switch (position) {
    case LayerPosition.A:
      return CrystalLatticeColors.layerAColorProperty;
    case LayerPosition.B:
      return CrystalLatticeColors.layerBColorProperty;
    default:
      return CrystalLatticeColors.layerCColorProperty;
  }
}
