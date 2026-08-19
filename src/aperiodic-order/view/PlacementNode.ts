/**
 * PlacementNode.ts
 *
 * The hand-placement board: the tiles a student has laid down, an outlined slot
 * at every place a next tile could go, and a two-tile palette to drag from.
 *
 * ── Why the slots are enumerated rather than free-form ────────────────────────
 * Free dragging would make the student fight the pointer for a fit that is
 * already determined — a rhombus attached to a boundary edge has only one
 * position per shape per side. So the model enumerates those positions and the
 * board snaps a drag to the nearest one. What is left for the student to decide
 * is the thing that matters: *which* slot, and therefore whether the vertex it
 * closes is one a Penrose tiling contains.
 *
 * ── Why the forbidden slots are drawn ─────────────────────────────────────────
 * The illegal candidates are exactly the point of the screen. They fit the shapes
 * flush and are still refused, which is the whole content of "matching rules":
 * geometry alone does not forbid periodicity, the vertex atlas does. Hiding them
 * would leave a student thinking the tiles simply do not fit.
 *
 * ── Why the scale is fixed ────────────────────────────────────────────────────
 * Unlike {@link TilingNode}, this board does not rescale to fit its contents. A
 * board that resized as tiles landed would move every slot out from under the
 * pointer mid-drag, and a dragged ghost would change size as it crossed the
 * board. The view clips instead, and the patch grows into the frame.
 */

import { Multilink, type TReadOnlyProperty, type UnknownMultilink } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { DragListener, FireListener, Node, type NodeOptions, Path } from "scenerystack/scenery";
import CrystalLatticeColors from "../../CrystalLatticeColors.js";
import {
  type PenroseRhombus,
  type PlacementCandidate,
  RhombusType,
  rhombusAt,
} from "../../common/model/PenroseTiling.js";
import { replaceChildren } from "../../common/view/replaceChildren.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { AperiodicOrderModel } from "../model/AperiodicOrderModel.js";

/** Model units the board spans across its width — about six tile edges. */
const BOARD_EXTENT = 6;

/** Outline width of a candidate slot, in view pixels. */
const SLOT_LINE_WIDTH = 2;

/** How near a dropped ghost must land to a slot's centre to count, in tile edges. */
const SNAP_RADIUS = 0.9;

/** Gap between the palette and the board's bottom-left corner, in view pixels. */
const PALETTE_MARGIN = 10;

export type PlacementNodeOptions = NodeOptions;

export class PlacementNode extends Node {
  private readonly model: AperiodicOrderModel;

  /** Model units → view pixels. Fixed for the life of the board. Named to avoid
   *  Node's own `scale` method. */
  private readonly modelScale: number;

  private readonly tileLayer = new Node();
  private readonly slotLayer = new Node();
  private readonly paletteLayer = new Node();
  /** Holds the tile being dragged, above everything else. */
  private readonly ghostLayer = new Node();

  private readonly multilink: UnknownMultilink;

  public constructor(model: AperiodicOrderModel, viewSize: number, providedOptions?: PlacementNodeOptions) {
    super(providedOptions);
    this.model = model;
    this.modelScale = viewSize / BOARD_EXTENT;

    this.children = [this.tileLayer, this.slotLayer, this.paletteLayer, this.ghostLayer];
    // Layers, not their contents: the slots are rebuilt after every placement,
    // and naming the layer keeps the traversal order stable across that. Palette
    // first, because choosing a shape comes before choosing where to put it.
    this.pdomOrder = [this.paletteLayer, this.slotLayer];
    this.buildPalette(viewSize);

    this.multilink = Multilink.multilink([model.placedRhombiProperty, model.candidatesProperty], () => this.rebuild());
  }

  /** Redraws the placed tiles and the slots on offer. */
  private rebuild(): void {
    replaceChildren(
      this.tileLayer,
      this.model.placedRhombiProperty.value.map((rhombus) => this.createTilePath(rhombus, false)),
    );

    const a11y = StringManager.getInstance().getAperiodicOrderA11yStrings();
    replaceChildren(
      this.slotLayer,
      this.model.candidatesProperty.value.map((candidate) => {
        const slot = new Path(this.rhombusShape(candidate.rhombus), {
          // No fill: a slot is a place, not a tile, and a filled one reads as
          // already played.
          fill: null,
          stroke: candidate.legal
            ? CrystalLatticeColors.successColorProperty
            : CrystalLatticeColors.warningColorProperty,
          lineWidth: SLOT_LINE_WIDTH,
          lineDash: candidate.legal ? [] : [4, 3],
          cursor: "pointer",
          tagName: "button",
          focusable: true,
          accessibleName: candidate.legal
            ? a11y.controls.legalSlotStringProperty
            : a11y.controls.illegalSlotStringProperty,
        });

        // FireListener rather than a press handler: it fires on a click and on
        // Enter or Space from the PDOM, so the keyboard path is the same code.
        slot.addInputListener(new FireListener({ fire: () => this.model.placeTile(candidate) }));

        return slot;
      }),
    );
  }

  /**
   * The two draggable source tiles, parked in the board's bottom-left corner.
   *
   * They are laid out from their measured bounds rather than from a nominal
   * inset: the two rhombi have very different widths, and a fixed inset either
   * clips the wide one or strands the narrow one.
   */
  private buildPalette(viewSize: number): void {
    const strings = StringManager.getInstance().getAperiodicOrderA11yStrings();
    const thick = this.createPaletteTile(RhombusType.THICK, strings.controls.paletteThickStringProperty);
    const thin = this.createPaletteTile(RhombusType.THIN, strings.controls.paletteThinStringProperty);
    this.paletteLayer.children = [thick, thin];

    const bottom = viewSize / 2 - PALETTE_MARGIN;
    const left = -viewSize / 2 + PALETTE_MARGIN;
    thick.left = left;
    thick.bottom = bottom;
    thin.left = thick.right + PALETTE_MARGIN;
    thin.bottom = bottom;
  }

  /**
   * One palette tile. Dragging it moves a ghost, and releasing hands the nearest
   * slot of the same shape to the model; the palette tile itself never moves, so
   * the source is always where the student left it.
   */
  private createPaletteTile(type: RhombusType, accessibleName: TReadOnlyProperty<string>): Node {
    const shape = this.rhombusShape(rhombusAt(type, Vector2.ZERO, 0));
    const tile = new Path(shape, {
      fill: fillFor(type),
      stroke: CrystalLatticeColors.tileStrokeColorProperty,
      lineWidth: 1.5,
      cursor: "pointer",
      tagName: "button",
      focusable: true,
      accessibleName,
    });
    const ghost = new Path(shape, { fill: fillFor(type), opacity: 0.7, visible: false });
    this.ghostLayer.addChild(ghost);

    tile.addInputListener(
      new DragListener({
        applyOffset: false,
        press: () => {
          // Selecting on press means a drag and a plain click agree about which
          // shape is armed, so the keyboard path and the pointer path never
          // disagree about what a slot is about to receive.
          this.model.selectedTileProperty.value = type;
          ghost.visible = true;
        },
        drag: (event) => {
          ghost.center = this.globalToLocalPoint(event.pointer.point);
        },
        release: (event) => {
          ghost.visible = false;
          if (event !== null) {
            this.dropAt(this.globalToLocalPoint(event.pointer.point), type);
          }
        },
      }),
    );

    return tile;
  }

  /** Places the nearest slot of the dragged shape, if the drop landed near one. */
  private dropAt(localPoint: Vector2, type: RhombusType): void {
    let nearest: PlacementCandidate | null = null;
    let nearestDistance = SNAP_RADIUS * this.modelScale;

    for (const candidate of this.model.candidatesProperty.value) {
      if (candidate.rhombus.type !== type) {
        continue;
      }
      const distance = this.toView(centroidOf(candidate.rhombus)).distance(localPoint);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    if (nearest !== null) {
      this.model.placeTile(nearest);
    }
  }

  /** A placed tile, filled by shape. */
  private createTilePath(rhombus: PenroseRhombus, isGhost: boolean): Path {
    return new Path(this.rhombusShape(rhombus), {
      fill: fillFor(rhombus.type),
      stroke: CrystalLatticeColors.tileStrokeColorProperty,
      lineWidth: 1.5,
      opacity: isGhost ? 0.6 : 1,
    });
  }

  /** A rhombus as a closed view-space Shape. */
  private rhombusShape(rhombus: PenroseRhombus): Shape {
    const shape = new Shape();
    rhombus.vertices.forEach((vertex, index) => {
      const view = this.toView(vertex);
      if (index === 0) {
        shape.moveTo(view.x, view.y);
      } else {
        shape.lineTo(view.x, view.y);
      }
    });
    return shape.close();
  }

  /** Model position → board pixels. Model +y is up; view +y is down. */
  private toView(point: Vector2): Vector2 {
    return new Vector2(point.x * this.modelScale, -point.y * this.modelScale);
  }

  public override dispose(): void {
    this.multilink.dispose();
    super.dispose();
  }
}

/** The fill that names a rhombus shape throughout the screen. */
function fillFor(type: RhombusType) {
  return type === RhombusType.THICK
    ? CrystalLatticeColors.thickRhombusColorProperty
    : CrystalLatticeColors.thinRhombusColorProperty;
}

/** The centre of a rhombus, in model units. */
function centroidOf(rhombus: PenroseRhombus): Vector2 {
  return rhombus.vertices.reduce((sum, vertex) => sum.plus(vertex), new Vector2(0, 0)).timesScalar(0.25);
}
