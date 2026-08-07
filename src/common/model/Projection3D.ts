/**
 * Projection3D.ts
 *
 * Orthographic 3D → 2D projection used by the Cubic Systems and Close-Packing
 * screens. SceneryStack is a 2D scene graph, so every "3D" view in this sim is
 * really a set of flat `Node`s whose positions come from projecting model-space
 * `Vector3`s through a rotation, and whose z-order is re-sorted each time the
 * camera moves.
 *
 * ── Camera convention ─────────────────────────────────────────────────────────
 * The camera looks along −z in *view* space, so a larger projected depth means
 * "closer to the viewer". Model space is right-handed with +y up; the projection
 * negates y on the way out because Scenery's view coordinates grow downward.
 *
 * ── Rotation convention ───────────────────────────────────────────────────────
 * Two angles, applied in a fixed order:
 *   1. `yaw`   — rotation about the model +y axis (drag left/right to orbit)
 *   2. `pitch` — rotation about the *view* +x axis (drag up/down to tilt)
 * Composing yaw-then-pitch (rather than free quaternion tumbling) keeps the
 * vertical axis of the cell visually upright, which is what makes a unit cell
 * readable while the student drags it around.
 *
 * This module is deliberately free of Scenery imports so it can be unit-tested
 * without a DOM; see tests/Projection3D.test.ts.
 */

import { Matrix3, Vector2, Vector3 } from "scenerystack/dot";

/** A model-space point projected to the view plane, plus its camera depth. */
export type ProjectedPoint = {
  /** Projected position in view coordinates (y already flipped for Scenery). */
  readonly view: Vector2;
  /** Camera depth; larger means nearer the viewer. Use to z-sort nodes. */
  readonly depth: number;
};

/** Anything carrying a model-space position that can be depth-sorted. */
export type Positioned3D = { readonly position: Vector3 };

/**
 * An immutable orthographic camera: a yaw/pitch pair plus a uniform scale from
 * model units to view pixels.
 *
 * Instances are cheap and immutable — `withYaw`/`withPitch`/`rotatedBy` return
 * new cameras rather than mutating, so a view can hold the current camera in a
 * `Property` and get change notifications for free.
 */
export class Projection3D {
  /** Rotation about model +y, in radians. */
  public readonly yaw: number;

  /** Rotation about view +x, in radians. */
  public readonly pitch: number;

  /** Model units → view pixels. */
  public readonly scale: number;

  /** Combined yaw·pitch rotation, precomputed once per camera. */
  private readonly rotation: Matrix3;

  public constructor(yaw = DEFAULT_YAW, pitch = DEFAULT_PITCH, scale = 1) {
    this.yaw = yaw;
    this.pitch = pitch;
    this.scale = scale;

    // Row-major composition: apply yaw about +y first, then pitch about +x.
    // Matrix3.timesMatrix( m ) yields "this then m" when applied to a column
    // vector as pitch * (yaw * v), so pitch must be the left-hand factor.
    this.rotation = Matrix3.rotationX(pitch).timesMatrix(Matrix3.rotationY(yaw));
  }

  /**
   * Rotates a model-space point into view space without projecting it.
   * Exposed mainly so callers can compare depths of things that are not points
   * (e.g. the centroid of a face).
   */
  public rotate(point: Vector3): Vector3 {
    return this.rotation.timesVector3(point);
  }

  /**
   * Projects a model-space point to the view plane.
   *
   * @param point - position in model units
   * @returns the view-space position (scaled, y-flipped) and its camera depth
   */
  public project(point: Vector3): ProjectedPoint {
    const rotated = this.rotate(point);
    return {
      view: new Vector2(rotated.x * this.scale, -rotated.y * this.scale),
      depth: rotated.z,
    };
  }

  /** Convenience: just the view-space position of a model point. */
  public projectToView(point: Vector3): Vector2 {
    return this.project(point).view;
  }

  /** Camera depth of a model point; larger is nearer the viewer. */
  public depthOf(point: Vector3): number {
    return this.rotate(point).z;
  }

  /**
   * The inverse of {@link project}: the model-space point that lands on a given
   * view position at a given camera depth.
   *
   * A pointer drag in a flat view supplies only two numbers, so it can never
   * determine all three model coordinates. The caller therefore names the third
   * by passing the depth to hold fixed — normally the current depth of whatever
   * is being dragged, which makes the drag slide it across the plane that faces
   * the camera. That is the behaviour a student expects from a 3D handle.
   *
   * @param view - view-space position (already scaled and y-flipped)
   * @param depth - camera depth to hold fixed; larger is nearer the viewer
   */
  public unproject(view: Vector2, depth: number): Vector3 {
    const rotated = new Vector3(view.x / this.scale, -view.y / this.scale, depth);
    // The rotation is a product of two rotation matrices and so is orthonormal;
    // its transpose is its inverse, which is cheaper and exactly stable.
    return this.rotation.transposed().timesVector3(rotated);
  }

  /**
   * Returns a copy of `items` ordered back-to-front, i.e. the order in which
   * they should be added to a Scenery parent so nearer objects paint last.
   * The sort is stable, so items at equal depth keep their input order.
   */
  public depthSort<T extends Positioned3D>(items: readonly T[]): T[] {
    return items
      .map((item, index) => ({ item, index, depth: this.depthOf(item.position) }))
      .sort((a, b) => a.depth - b.depth || a.index - b.index)
      .map((entry) => entry.item);
  }

  /** A camera with the same pitch/scale but a different yaw. */
  public withYaw(yaw: number): Projection3D {
    return new Projection3D(yaw, this.pitch, this.scale);
  }

  /** A camera with the same yaw/scale but a different (clamped) pitch. */
  public withPitch(pitch: number): Projection3D {
    return new Projection3D(this.yaw, clampPitch(pitch), this.scale);
  }

  /** A camera with the same orientation but a different model→view scale. */
  public withScale(scale: number): Projection3D {
    return new Projection3D(this.yaw, this.pitch, scale);
  }

  /**
   * Applies a drag delta measured in view pixels. Dragging right increases yaw
   * and dragging down decreases pitch, which is the mapping that makes the cell
   * feel like it is being pushed by the pointer. Pitch is clamped so the cell
   * never tips past straight-down or straight-up.
   */
  public rotatedBy(deltaViewX: number, deltaViewY: number, radiansPerPixel = DEFAULT_RADIANS_PER_PIXEL): Projection3D {
    return new Projection3D(
      this.yaw + deltaViewX * radiansPerPixel,
      clampPitch(this.pitch - deltaViewY * radiansPerPixel),
      this.scale,
    );
  }
}

/** Pitch beyond ±80° looks down the cell's own axis and reads as a flat square. */
export const MAX_PITCH = (80 * Math.PI) / 180;

/** Default camera yaw — a three-quarter view that shows three cube faces. */
export const DEFAULT_YAW = (28 * Math.PI) / 180;

/** Default camera pitch — tilted enough to separate the top face from the front. */
export const DEFAULT_PITCH = (20 * Math.PI) / 180;

/** Drag sensitivity: one screen pixel of drag ≈ 0.5° of rotation. */
export const DEFAULT_RADIANS_PER_PIXEL = Math.PI / 360;

/** Restricts a pitch angle to ±{@link MAX_PITCH}. */
export function clampPitch(pitch: number): number {
  return Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
}
