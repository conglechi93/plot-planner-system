// ---------------------------------------------------------------------------
// tileLayout.ts
// Computes 3D transforms for all 40 Monopoly board tiles placed on a 100×100
// ground plane centred at the world origin (0, 0, 0).
//
// Board layout (top-down view, Z-axis points "up" in screen terms):
//
//   (-50,_,+50) ──────────────────── (+50,_,+50)
//        │  [20]  21 22 ... 29  [30]  │
//        │                            │
//       19   TOP EDGE (21-29)→       31
//       18   LEFT EDGE (11-19)↑      32
//       ...                          ...
//       11                           39
//        │  [10]   9  8 ... 1  [0]   │
//   (-50,_,-50) ──────────────────── (+50,_,-50)
//
// Corner tiles (16×16 units, centred at ±42 on both axes):
//   index  0 → bottom-right (+42, 0, -42)
//   index 10 → bottom-left  (-42, 0, -42)
//   index 20 → top-left     (-42, 0, +42)
//   index 30 → top-right    (+42, 0, +42)
//
// Regular tiles (≈7.556 × 14 units, TILEWIDTH = 68/9):
//   Bottom edge  (1–9)  : z = -43, x from +30.22… to -30.22… (right→left)
//   Left edge   (11–19) : x = -43, z from -30.22… to +30.22… (bottom→top)
//   Top edge    (21–29) : z = +43, x from -30.22… to +30.22… (left→right)
//   Right edge  (31–39) : x = +43, z from +30.22… to -30.22… (top→bottom)
//
// rotationY values make tile labels face OUTWARD from the board centre:
//   Bottom tiles  → rotationY = 0            (label faces -Z / south)
//   Left tiles    → rotationY = Math.PI / 2  (label faces -X / west)
//   Top tiles     → rotationY = Math.PI      (label faces +Z / north)
//   Right tiles   → rotationY = -Math.PI / 2 (label faces +X / east)
//   Corner 0  (bottom-right) → rotationY = Math.PI * 0.25
//   Corner 10 (bottom-left)  → rotationY = Math.PI * 0.75
//   Corner 20 (top-left)     → rotationY = Math.PI * 1.25
//   Corner 30 (top-right)    → rotationY = Math.PI * 1.75
// ---------------------------------------------------------------------------

export interface TileTransform {
  index: number;
  position: { x: number; y: number; z: number };
  rotationY: number; // radians — tile faces inward (toward board center)
  tileWidth: number; // width along edge
  tileDepth: number; // depth into board
  isCorner: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EDGE_POS   = 43;          // Regular tile centre distance from origin (⊥ to edge)
const CORNER_POS = 42;          // Corner tile centre distance from origin (both axes)
const CORNER_SIZE    = 16;      // Corner tile footprint: 16×16  (outer edge sits at ±50)
const REGULAR_DEPTH  = 14;     // Regular tile depth into board  (outer edge sits at ±50)

// Gap between corner inner edges = CORNER_POS - CORNER_SIZE/2 = 42 - 8 = 34, both sides
const REGULAR_SPAN_HALF = CORNER_POS - CORNER_SIZE / 2;        // 34 units from centre
const REGULAR_WIDTH     = (REGULAR_SPAN_HALF * 2) / 9;         // 68/9 ≈ 7.556 units
const TILE_Y            = 0.02;   // Slightly above ground plane

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

export function computeTileTransforms(): TileTransform[] {
  const out: TileTransform[] = new Array<TileTransform>(40);

  // ── Corners ──────────────────────────────────────────────────────────────
  // Corners use axis-aligned rotations (0 / π) so their 20×20 mesh footprint
  // stays within the allocated 20×20 cell.  A 45° rotation would turn the box
  // into a 28×28 diamond that physically overlaps adjacent regular tiles and
  // causes Z-fighting.
  //
  // index 0  → bottom-right
  out[0] = {
    index: 0,
    position: { x: CORNER_POS, y: TILE_Y, z: -CORNER_POS },
    rotationY: 0,
    tileWidth: CORNER_SIZE,
    tileDepth: CORNER_SIZE,
    isCorner: true,
  };

  // index 10 → bottom-left
  out[10] = {
    index: 10,
    position: { x: -CORNER_POS, y: TILE_Y, z: -CORNER_POS },
    rotationY: 0,
    tileWidth: CORNER_SIZE,
    tileDepth: CORNER_SIZE,
    isCorner: true,
  };

  // index 20 → top-left
  out[20] = {
    index: 20,
    position: { x: -CORNER_POS, y: TILE_Y, z: CORNER_POS },
    rotationY: Math.PI,
    tileWidth: CORNER_SIZE,
    tileDepth: CORNER_SIZE,
    isCorner: true,
  };

  // index 30 → top-right
  out[30] = {
    index: 30,
    position: { x: CORNER_POS, y: TILE_Y, z: CORNER_POS },
    rotationY: Math.PI,
    tileWidth: CORNER_SIZE,
    tileDepth: CORNER_SIZE,
    isCorner: true,
  };

  // ── Bottom edge — indices 1–9 ─────────────────────────────────────────────
  // Tiles travel from corner-0 (x=+42) toward corner-10 (x=-42), i.e. right→left.
  // Centre of slot k (0-based):  x = +REGULAR_SPAN_HALF - REGULAR_WIDTH*(k+0.5)
  for (let k = 0; k < 9; k++) {
    const x = REGULAR_SPAN_HALF - REGULAR_WIDTH * (k + 0.5);
    out[1 + k] = {
      index: 1 + k,
      position: { x, y: TILE_Y, z: -EDGE_POS },
      rotationY: 0,           // label faces -Z (south / outward)
      tileWidth: REGULAR_WIDTH,
      tileDepth: REGULAR_DEPTH,
      isCorner: false,
    };
  }

  // ── Left edge — indices 11–19 ─────────────────────────────────────────────
  // Tiles travel from corner-10 (z=-42) toward corner-20 (z=+42), i.e. bottom→top.
  // Centre of slot k (0-based):  z = -REGULAR_SPAN_HALF + REGULAR_WIDTH*(k+0.5)
  for (let k = 0; k < 9; k++) {
    const z = -REGULAR_SPAN_HALF + REGULAR_WIDTH * (k + 0.5);
    out[11 + k] = {
      index: 11 + k,
      position: { x: -EDGE_POS, y: TILE_Y, z },
      rotationY: Math.PI / 2, // label faces -X (west / outward)
      tileWidth: REGULAR_WIDTH,
      tileDepth: REGULAR_DEPTH,
      isCorner: false,
    };
  }

  // ── Top edge — indices 21–29 ──────────────────────────────────────────────
  // Tiles travel from corner-20 (x=-42) toward corner-30 (x=+42), i.e. left→right.
  // Centre of slot k (0-based):  x = -REGULAR_SPAN_HALF + REGULAR_WIDTH*(k+0.5)
  for (let k = 0; k < 9; k++) {
    const x = -REGULAR_SPAN_HALF + REGULAR_WIDTH * (k + 0.5);
    out[21 + k] = {
      index: 21 + k,
      position: { x, y: TILE_Y, z: EDGE_POS },
      rotationY: Math.PI,     // label faces +Z (north / outward)
      tileWidth: REGULAR_WIDTH,
      tileDepth: REGULAR_DEPTH,
      isCorner: false,
    };
  }

  // ── Right edge — indices 31–39 ────────────────────────────────────────────
  // Tiles travel from corner-30 (z=+42) toward corner-0 (z=-42), i.e. top→bottom.
  // Centre of slot k (0-based):  z = +REGULAR_SPAN_HALF - REGULAR_WIDTH*(k+0.5)
  for (let k = 0; k < 9; k++) {
    const z = REGULAR_SPAN_HALF - REGULAR_WIDTH * (k + 0.5);
    out[31 + k] = {
      index: 31 + k,
      position: { x: EDGE_POS, y: TILE_Y, z },
      rotationY: -Math.PI / 2, // label faces +X (east / outward)
      tileWidth: REGULAR_WIDTH,
      tileDepth: REGULAR_DEPTH,
      isCorner: false,
    };
  }

  return out;
}

// Pre-computed constant — import this directly to avoid repeated computation.
export const TILE_TRANSFORMS: TileTransform[] = computeTileTransforms();
