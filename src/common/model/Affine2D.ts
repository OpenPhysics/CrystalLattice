/**
 * Affine2D.ts
 *
 * A minimal 2D affine transform, stored as the six meaningful entries of the
 * 3 × 3 matrix:
 *
 *     ⎡ a  b  c ⎤        x' = a·x + b·y + c
 *     ⎢ d  e  f ⎥        y' = d·x + e·y + f
 *     ⎣ 0  0  1 ⎦
 *
 * The aperiodic-tiling generators build deep hierarchies of transformed tiles,
 * so they want a flat, allocation-cheap representation rather than SceneryStack's
 * `Matrix3`. Everything here is a plain function over readonly tuples.
 */

import { Vector2 } from "scenerystack/dot";

/** `[a, b, c, d, e, f]` — the top two rows of the affine matrix. */
export type Affine2D = readonly [number, number, number, number, number, number];

/** The identity transform. */
export const IDENTITY: Affine2D = [1, 0, 0, 0, 1, 0];

/** Composition: `compose(A, B)` applies B first, then A. */
export function compose(a: Affine2D, b: Affine2D): Affine2D {
  return [
    a[0] * b[0] + a[1] * b[3],
    a[0] * b[1] + a[1] * b[4],
    a[0] * b[2] + a[1] * b[5] + a[2],
    a[3] * b[0] + a[4] * b[3],
    a[3] * b[1] + a[4] * b[4],
    a[3] * b[2] + a[4] * b[5] + a[5],
  ];
}

/** Matrix inverse. Throws when the transform is singular. */
export function invert(t: Affine2D): Affine2D {
  const determinant = t[0] * t[4] - t[1] * t[3];
  if (determinant === 0) {
    throw new Error("Cannot invert a singular affine transform");
  }
  return [
    t[4] / determinant,
    -t[1] / determinant,
    (t[1] * t[5] - t[2] * t[4]) / determinant,
    -t[3] / determinant,
    t[0] / determinant,
    (t[2] * t[3] - t[0] * t[5]) / determinant,
  ];
}

/** Applies a transform to a point. */
export function apply(t: Affine2D, point: Vector2): Vector2 {
  return new Vector2(t[0] * point.x + t[1] * point.y + t[2], t[3] * point.x + t[4] * point.y + t[5]);
}

/** Applies a transform to every point of a polygon. */
export function applyToPolygon(t: Affine2D, polygon: readonly Vector2[]): Vector2[] {
  return polygon.map((point) => apply(t, point));
}

/** Translation by (tx, ty). */
export function translation(tx: number, ty: number): Affine2D {
  return [1, 0, tx, 0, 1, ty];
}

/** Counter-clockwise rotation about the origin. */
export function rotation(angle: number): Affine2D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [cos, -sin, 0, sin, cos, 0];
}

/** Rotation about an arbitrary point. */
export function rotationAbout(point: Vector2, angle: number): Affine2D {
  return compose(translation(point.x, point.y), compose(rotation(angle), translation(-point.x, -point.y)));
}

/** Uniform scale about the origin. */
export function scaling(factor: number): Affine2D {
  return [factor, 0, 0, 0, factor, 0];
}

/**
 * The similarity (rotation + uniform scale + translation, no reflection) that
 * carries the unit interval (0,0)→(1,0) onto the segment p→q.
 */
export function matchSegment(p: Vector2, q: Vector2): Affine2D {
  return [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
}

/** The similarity carrying segment p1→q1 onto segment p2→q2. */
export function matchSegments(p1: Vector2, q1: Vector2, p2: Vector2, q2: Vector2): Affine2D {
  return compose(matchSegment(p2, q2), invert(matchSegment(p1, q1)));
}

/**
 * Whether the transform includes a reflection — used by the Aperiodic Order
 * screen to tell reflected hats from unreflected ones, since the hat needs both
 * chiralities to tile while the spectre does not.
 */
export function isReflecting(t: Affine2D): boolean {
  return t[0] * t[4] - t[1] * t[3] < 0;
}

/** Uniform scale factor of the transform's linear part. */
export function scaleOf(t: Affine2D): number {
  return Math.sqrt(Math.abs(t[0] * t[4] - t[1] * t[3]));
}

/** Intersection of the infinite lines p1→q1 and p2→q2. */
export function lineIntersection(p1: Vector2, q1: Vector2, p2: Vector2, q2: Vector2): Vector2 {
  const denominator = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y);
  const t = ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) / denominator;
  return new Vector2(p1.x + t * (q1.x - p1.x), p1.y + t * (q1.y - p1.y));
}
