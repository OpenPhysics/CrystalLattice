/**
 * Projected3DNode.ts
 *
 * The base class for the sim's pseudo-3D views. It owns a {@link Projection3D}
 * camera, turns pointer drags into camera rotation, and gives subclasses a
 * single `rebuild()` hook that runs whenever the camera or the model changes.
 *
 * ── Why rebuild rather than reposition ────────────────────────────────────────
 * Correct occlusion in a 2D scene graph comes from child order, and child order
 * depends on the camera. Since the camera changes on every drag frame, the
 * cheapest correct thing is to rebuild the children each time rather than to
 * track which node needs to move where. Cell contents here top out at a few
 * hundred spheres, which is comfortably inside the budget for that.
 */

import { Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector3 } from "scenerystack/dot";
import { DragListener, Node, type NodeOptions } from "scenerystack/scenery";
import { DEFAULT_PITCH, DEFAULT_YAW, Projection3D } from "../model/Projection3D.js";

export type Projected3DNodeOptions = NodeOptions;

export abstract class Projected3DNode extends Node {
  /** The current camera. Subclasses read it in {@link rebuild}. */
  public readonly cameraProperty: Property<Projection3D>;

  /** Holds the projected content, so chrome added by subclasses is not rebuilt. */
  protected readonly contentNode: Node;

  private readonly rebuildListener: () => void;
  private readonly dependencies: ReadonlyArray<TReadOnlyProperty<unknown>>;

  /**
   * @param modelScale - model units → view pixels
   * @param dependencies - model Properties that should trigger a rebuild
   * @param providedOptions
   */
  protected constructor(
    modelScale: number,
    dependencies: ReadonlyArray<TReadOnlyProperty<unknown>>,
    providedOptions?: Projected3DNodeOptions,
  ) {
    super(providedOptions);

    this.cameraProperty = new Property(new Projection3D(DEFAULT_YAW, DEFAULT_PITCH, modelScale));
    this.contentNode = new Node();
    this.addChild(this.contentNode);

    this.dependencies = dependencies;
    this.rebuildListener = () => this.rebuild();

    this.cameraProperty.link(this.rebuildListener);
    for (const dependency of dependencies) {
      dependency.link(this.rebuildListener);
    }

    // Drag to orbit. `applyOffset: false` keeps the listener from moving this
    // Node itself — the drag drives the camera, and the camera drives the
    // children's positions.
    this.addInputListener(
      new DragListener({
        applyOffset: false,
        drag: (_event, listener) => {
          const delta = listener.modelDelta;
          this.cameraProperty.value = this.cameraProperty.value.rotatedBy(delta.x, delta.y);
        },
      }),
    );
  }

  /**
   * Rebuilds {@link contentNode} for the current camera and model state.
   * Called on construction and on every camera or dependency change.
   */
  protected abstract rebuild(): void;

  /** Resets the camera to its default three-quarter view. */
  public resetCamera(): void {
    this.cameraProperty.value = new Projection3D(DEFAULT_YAW, DEFAULT_PITCH, this.cameraProperty.value.scale);
  }

  /** Sets the model→view scale, keeping the current orientation. */
  public setModelScale(scale: number): void {
    this.cameraProperty.value = this.cameraProperty.value.withScale(scale);
  }

  /** Projects a model point to this Node's local coordinates. */
  protected toView(point: Vector3): { x: number; y: number } {
    return this.cameraProperty.value.projectToView(point);
  }

  public override dispose(): void {
    this.cameraProperty.unlink(this.rebuildListener);
    for (const dependency of this.dependencies) {
      dependency.unlink(this.rebuildListener);
    }
    this.cameraProperty.dispose();
    super.dispose();
  }
}
