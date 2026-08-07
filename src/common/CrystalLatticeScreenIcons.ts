/**
 * CrystalLatticeScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 * Drawn on the standard PhET 548 × 373 canvas using CrystalLatticeColors.
 *
 * Every motif is drawn from the same geometry modules the screen itself uses —
 * `Projection3D` for the two cube icons, `generateCellAtoms` for the FCC sites,
 * `planePolygonInCell` for the (111) triangle, `generateLayer` for the stacked
 * rows, and a real inflated Penrose patch for the aperiodic one. Hand-drawn
 * approximations would drift away from the screens as those change; deriving the
 * icons means a wrong camera or a wrong plane shows up in the icon too.
 *
 * These run once at Screen construction, so each motif is deliberately kept to a
 * few dozen nodes and the Penrose patch to three inflations.
 */
import { Bounds2, Vector2, Vector3 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, Node, Path, Rectangle } from "scenerystack/scenery";
import { ArrowNode } from "scenerystack/scenery-phet";
import { ScreenIcon } from "scenerystack/sim";
import CrystalLatticeColors from "../CrystalLatticeColors.js";
import { generateLayer, LayerPosition } from "./model/ClosePacking.js";
import { CubicStructure, cellCorners, cellEdgeIndices, generateCellAtoms } from "./model/CubicCell.js";
import { planePolygonInCell } from "./model/MillerIndices.js";
import { generatePenroseTiling, mergeIntoRhombi, type PenroseRhombus, RhombusType } from "./model/PenroseTiling.js";
import { DEFAULT_PITCH, DEFAULT_YAW, Projection3D } from "./model/Projection3D.js";
import { AtomNode } from "./view/AtomNode.js";

/** The standard PhET screen-icon canvas. */
const W = 548;
const H = 373;

/** Every motif is drawn inside this square, centred on the canvas. */
const MOTIF_SIZE = 300;

/** Model-space cube edge for the two projected icons; only its ratio to the scale matters. */
const ICON_CELL_EDGE = 1;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: CrystalLatticeColors.backgroundColorProperty });
}

/** Fraction of the canvas a motif fills, leaving a margin on every side. */
const MOTIF_FILL = 0.92;

/**
 * Wraps a motif on the standard canvas, scaled to fill it and centred.
 *
 * Each `create*` function draws about its own local origin in whatever units its
 * geometry naturally produces — pixels for the flat motifs, projected model units
 * for the cubes — and the fit here is what makes those choices interchangeable.
 * Without it every motif would need its own hand-tuned scale, and a wireframe
 * icon (thin lines, no fill) would end up reading much smaller than a solid one
 * at the same nominal size.
 */
function iconFrom(motif: Node): ScreenIcon {
  const bounds = motif.bounds;
  if (bounds.isFinite() && bounds.width > 0 && bounds.height > 0) {
    motif.scale(Math.min((MOTIF_FILL * W) / bounds.width, (MOTIF_FILL * H) / bounds.height));
  }
  motif.center = new Vector2(W / 2, H / 2);

  return new ScreenIcon(new Node({ children: [background(), motif] }), {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: CrystalLatticeColors.backgroundColorProperty,
  });
}

/** The camera the two cube icons share — the screens' own default three-quarter view. */
function iconCamera(scale: number): Projection3D {
  return new Projection3D(DEFAULT_YAW, DEFAULT_PITCH, scale);
}

/** The cube's twelve edges, projected. */
function cubeWireframe(camera: Projection3D, offset: Vector3): Path {
  const corners = cellCorners(ICON_CELL_EDGE).map((corner) => corner.minus(offset));
  const shape = new Shape();

  for (const [from, to] of cellEdgeIndices()) {
    // biome-ignore lint/style/noNonNullAssertion: indices come from cellEdgeIndices
    const a = camera.projectToView(corners[from]!);
    // biome-ignore lint/style/noNonNullAssertion: indices come from cellEdgeIndices
    const b = camera.projectToView(corners[to]!);
    shape.moveTo(a.x, a.y).lineTo(b.x, b.y);
  }

  return new Path(shape, {
    stroke: CrystalLatticeColors.cellOutlineColorProperty,
    lineWidth: 3,
  });
}

/** A closed Shape through already-projected view points. */
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

/**
 * 2D Lattices — an oblique lattice with its two primitive vectors drawn out from
 * a highlighted origin, which is the screen's whole interaction in one picture.
 */
export function createLattices2DIcon(): ScreenIcon {
  const a1 = new Vector2(72, 0);
  // Deliberately oblique, matching the screen's default γ = 75°: a square grid
  // would read as "graph paper" rather than as a choice of primitive vectors.
  const a2 = Vector2.createPolar(72, (-75 * Math.PI) / 180);

  const points: Node[] = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const position = a1.timesScalar(i).plus(a2.timesScalar(j));
      const isOrigin = i === 0 && j === 0;
      points.push(
        new AtomNode(isOrigin ? 15 : 10, {
          center: position,
          baseColor: isOrigin ? CrystalLatticeColors.originAtomColorProperty : CrystalLatticeColors.atomColorProperty,
        }),
      );
    }
  }

  const arrows = [
    new ArrowNode(0, 0, a1.x, a1.y, arrowOptions(CrystalLatticeColors.vectorAColorProperty)),
    new ArrowNode(0, 0, a2.x, a2.y, arrowOptions(CrystalLatticeColors.vectorBColorProperty)),
  ];

  return iconFrom(new Node({ children: [...points, ...arrows] }));
}

/** Shared look for the icons' lattice-vector arrows. */
function arrowOptions(color: (typeof CrystalLatticeColors)["vectorAColorProperty"]) {
  return { fill: color, stroke: color, headHeight: 18, headWidth: 18, tailWidth: 5 };
}

/**
 * Cubic Systems — a face-centred cell, drawn with the same depth sort the screen
 * uses so the near atoms overlap the far ones the way they do in the sim.
 */
export function createCubicSystemsIcon(): ScreenIcon {
  const camera = iconCamera(MOTIF_SIZE / 2 / (ICON_CELL_EDGE * 0.95));
  const offset = new Vector3(ICON_CELL_EDGE / 2, ICON_CELL_EDGE / 2, ICON_CELL_EDGE / 2);

  const atoms = generateCellAtoms(CubicStructure.FACE_CENTERED).map((atom) => ({
    position: atom.fractionalPosition.timesScalar(ICON_CELL_EDGE).minus(offset),
    // Corner sites and face sites are told apart by colour, as on the screen.
    isCorner: [atom.fractionalPosition.x, atom.fractionalPosition.y, atom.fractionalPosition.z].every(
      (component) => component === 0 || component === 1,
    ),
  }));

  const spheres = camera.depthSort(atoms).map(
    (atom) =>
      new AtomNode(26, {
        center: camera.projectToView(atom.position),
        baseColor: atom.isCorner
          ? CrystalLatticeColors.atomColorProperty
          : CrystalLatticeColors.centeringAtomColorProperty,
      }),
  );

  return iconFrom(new Node({ children: [cubeWireframe(camera, offset), ...spheres] }));
}

/**
 * Close-Packing — an A-B-C stack seen from above, peeled back in two steps so
 * all three layers show at once.
 *
 * A side view cannot do this job: seen edge-on, the A and C layers differ only in
 * their depth into the page, which is exactly why the screen itself is rotatable.
 * And a plain stack of full sheets is opaque from above — the top layer hides the
 * stagger the icon exists to show. Revealing each layer over a third of the width
 * puts both offsets on screen, and the two step boundaries are where the eye
 * catches them. `generateLayer` supplies each sheet already carrying its own
 * offset, so the stagger on show is the model's rather than a drawn guess.
 */
export function createClosePackingIcon(): ScreenIcon {
  const diameter = 66;
  const third = MOTIF_SIZE / 3;
  // Bottom to top: C is revealed on the left, B in the middle, A on the right.
  const layers = [
    { position: LayerPosition.C, color: CrystalLatticeColors.layerCColorProperty, revealedFrom: -MOTIF_SIZE },
    { position: LayerPosition.B, color: CrystalLatticeColors.layerBColorProperty, revealedFrom: -third / 2 },
    { position: LayerPosition.A, color: CrystalLatticeColors.layerAColorProperty, revealedFrom: third / 2 },
  ];

  const children = layers.map(({ position, color, revealedFrom }) => {
    const spheres = generateLayer(position, diameter, 0, 3).map(
      (center) =>
        new AtomNode(diameter / 2, {
          // generateLayer already carries the layer's offset; y is negated
          // because model +y is up and view +y is down.
          center: new Vector2(center.x, -center.y),
          baseColor: color,
        }),
    );

    const layerNode = new Node({ children: spheres });
    layerNode.clipArea = Shape.bounds(new Bounds2(revealedFrom, -MOTIF_SIZE, MOTIF_SIZE, MOTIF_SIZE));
    return layerNode;
  });

  const motif = new Node({ children });
  // The sheets run well past the canvas; keep the middle so they read as endless.
  motif.clipArea = Shape.bounds(new Bounds2(-MOTIF_SIZE / 2, -MOTIF_SIZE / 2, MOTIF_SIZE / 2, MOTIF_SIZE / 2));

  return iconFrom(new Node({ children: [motif] }));
}

/**
 * Miller Indices — the (111) plane cutting a cubic cell, the canonical first
 * example and the one whose triangle is recognisable at navigation-bar size.
 *
 * The three coloured axis stubs come along because they are what distinguishes
 * this icon from the Cubic Systems one at 100 px wide; the normal arrow the
 * screen can overlay is left out, since at that size it only crosses the
 * triangle it is supposed to stand off from.
 */
export function createMillerIndicesIcon(): ScreenIcon {
  const camera = iconCamera(MOTIF_SIZE / 2 / (ICON_CELL_EDGE * 1.05));
  const offset = new Vector3(ICON_CELL_EDGE / 2, ICON_CELL_EDGE / 2, ICON_CELL_EDGE / 2);
  const origin = camera.projectToView(new Vector3(0, 0, 0).minus(offset));

  const plane = new Path(
    polygonShape(
      planePolygonInCell([1, 1, 1], ICON_CELL_EDGE).map((point) => camera.projectToView(point.minus(offset))),
    ),
    {
      fill: CrystalLatticeColors.planeColorProperty,
      stroke: CrystalLatticeColors.wignerSeitzColorProperty,
      lineWidth: 4,
    },
  );

  const axes = [
    { end: new Vector3(ICON_CELL_EDGE, 0, 0), color: CrystalLatticeColors.vectorAColorProperty },
    { end: new Vector3(0, ICON_CELL_EDGE, 0), color: CrystalLatticeColors.vectorBColorProperty },
    { end: new Vector3(0, 0, ICON_CELL_EDGE), color: CrystalLatticeColors.vectorCColorProperty },
  ].map(({ end, color }) => {
    const tip = camera.projectToView(end.minus(offset));
    return new ArrowNode(origin.x, origin.y, tip.x, tip.y, arrowOptions(color));
  });

  // Axes last: the plane is translucent, but at navigation-bar size a stub drawn
  // under it disappears entirely.
  return iconFrom(new Node({ children: [cubeWireframe(camera, offset), plane, ...axes] }));
}

/**
 * Aperiodic Order — a real inflated Penrose patch, thick against thin. Three
 * inflations is the fewest that shows the two tile shapes interleaving rather
 * than a decagon of identical wedges.
 */
export function createAperiodicOrderIcon(): ScreenIcon {
  const rhombi = mergeIntoRhombi(generatePenroseTiling(3));
  const scale = MOTIF_SIZE / 2;

  const children = rhombi.map(
    (rhombus: PenroseRhombus) =>
      new Path(polygonShape(rhombus.vertices.map((vertex) => vertex.timesScalar(scale))), {
        fill:
          rhombus.type === RhombusType.THICK
            ? CrystalLatticeColors.thickRhombusColorProperty
            : CrystalLatticeColors.thinRhombusColorProperty,
        stroke: CrystalLatticeColors.tileStrokeColorProperty,
        lineWidth: 1.5,
      }),
  );

  // The ten-fold rim, drawn as the decagon the seed actually is — it reads as
  // "five-fold symmetry" at icon size, which is the screen's headline.
  const rim = new Circle(scale, {
    stroke: CrystalLatticeColors.accentColorProperty,
    lineWidth: 3,
  });

  return iconFrom(new Node({ children: [...children, rim] }));
}
