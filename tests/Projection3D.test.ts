/**
 * Projection3D.test.ts
 *
 * The orthographic camera behind both pseudo-3D screens. Its two jobs are
 * projecting points and ordering them by depth; if either is wrong, spheres
 * occlude each other backwards and the cell reads as inside-out.
 */

import { Vector3 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { clampPitch, MAX_PITCH, Projection3D } from "../src/common/model/Projection3D.js";

/** An identity camera: no rotation, unit scale. */
function identityCamera(scale = 1): Projection3D {
  return new Projection3D(0, 0, scale);
}

describe("projection", () => {
  it("leaves an unrotated point where it is, flipping y for screen coordinates", () => {
    const view = identityCamera().projectToView(new Vector3(3, 4, 5));
    expect(view.x).toBeCloseTo(3, 10);
    expect(view.y).toBeCloseTo(-4, 10);
  });

  it("applies the model-to-view scale", () => {
    const view = identityCamera(10).projectToView(new Vector3(1, 2, 0));
    expect(view.x).toBeCloseTo(10, 10);
    expect(view.y).toBeCloseTo(-20, 10);
  });

  it("keeps the origin fixed under any rotation", () => {
    const camera = new Projection3D(0.7, -0.3, 5);
    const view = camera.projectToView(new Vector3(0, 0, 0));
    expect(view.x).toBeCloseTo(0, 10);
    expect(view.y).toBeCloseTo(0, 10);
  });

  it("swings +x onto the depth axis after a quarter-turn of yaw", () => {
    const camera = new Projection3D(Math.PI / 2, 0, 1);
    const projected = camera.project(new Vector3(1, 0, 0));
    expect(projected.view.x).toBeCloseTo(0, 10);
    // Rotating +x about +y by 90° carries it to −z, i.e. away from the viewer.
    expect(projected.depth).toBeCloseTo(-1, 10);
  });

  it("preserves length: an orthographic rotation is rigid", () => {
    const camera = new Projection3D(0.9, 0.4, 1);
    const rotated = camera.rotate(new Vector3(1, 2, 3));
    expect(rotated.magnitude).toBeCloseTo(Math.sqrt(1 + 4 + 9), 10);
  });
});

describe("depth sorting", () => {
  it("orders back to front, so nearer items are drawn last", () => {
    const camera = identityCamera();
    const items = [
      { name: "near", position: new Vector3(0, 0, 5) },
      { name: "far", position: new Vector3(0, 0, -5) },
      { name: "middle", position: new Vector3(0, 0, 0) },
    ];
    expect(camera.depthSort(items).map((item) => item.name)).toEqual(["far", "middle", "near"]);
  });

  it("is stable for items at equal depth", () => {
    const camera = identityCamera();
    const items = [
      { name: "first", position: new Vector3(1, 0, 0) },
      { name: "second", position: new Vector3(2, 0, 0) },
      { name: "third", position: new Vector3(3, 0, 0) },
    ];
    expect(camera.depthSort(items).map((item) => item.name)).toEqual(["first", "second", "third"]);
  });

  it("reverses the order when the camera swings round behind", () => {
    const front = new Projection3D(0, 0, 1);
    const behind = new Projection3D(Math.PI, 0, 1);
    const items = [
      { name: "a", position: new Vector3(0, 0, 1) },
      { name: "b", position: new Vector3(0, 0, -1) },
    ];
    expect(front.depthSort(items).map((item) => item.name)).toEqual(["b", "a"]);
    expect(behind.depthSort(items).map((item) => item.name)).toEqual(["a", "b"]);
  });
});

describe("camera manipulation", () => {
  it("clamps pitch so the cell never tips past its axis", () => {
    expect(clampPitch(Math.PI)).toBeCloseTo(MAX_PITCH, 10);
    expect(clampPitch(-Math.PI)).toBeCloseTo(-MAX_PITCH, 10);
    expect(clampPitch(0.1)).toBeCloseTo(0.1, 10);
  });

  it("does not clamp yaw, which can spin freely", () => {
    expect(new Projection3D(0, 0, 1).withYaw(10).yaw).toBe(10);
  });

  it("turns a rightward drag into increasing yaw", () => {
    const camera = new Projection3D(0, 0, 1);
    expect(camera.rotatedBy(100, 0).yaw).toBeGreaterThan(0);
  });

  it("turns a downward drag into decreasing pitch", () => {
    const camera = new Projection3D(0, 0, 1);
    expect(camera.rotatedBy(0, 100).pitch).toBeLessThan(0);
  });

  it("keeps scale across rotations, and orientation across rescales", () => {
    const camera = new Projection3D(0.5, 0.2, 7);
    expect(camera.rotatedBy(10, 10).scale).toBe(7);
    expect(camera.withScale(3).yaw).toBe(0.5);
    expect(camera.withScale(3).pitch).toBe(0.2);
  });

  it("clamps pitch when a drag would push past the limit", () => {
    const camera = new Projection3D(0, MAX_PITCH, 1);
    expect(camera.rotatedBy(0, -10_000).pitch).toBeCloseTo(MAX_PITCH, 10);
  });
});
