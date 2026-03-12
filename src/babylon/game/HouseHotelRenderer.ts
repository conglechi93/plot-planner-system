/**
 * HouseHotelRenderer.ts
 *
 * Manages the 3-D house and hotel meshes shown on top of property tiles in the
 * Cờ Tỉ Phú (Vietnamese Monopoly) Babylon.js scene.
 *
 * Rules:
 *   square.houses 1-4 → render that many green house boxes in a row
 *   square.houses 5   → render one red hotel box
 *   square.houses 0   → clear all buildings from that square
 *
 * Houses are positioned on top of the tile surface (tile box is 0.10 high,
 * sitting with its base on the ground plane, so its top face is at y = 0.10).
 * Buildings sit at y = 0.10 + half their own height.
 *
 * Public API used by useGameEngine:
 *   updateSquareBuildings(squareIndex, houses)
 *   clearSquareBuildings(squareIndex)
 *   clearAll()
 *
 * Extra method aliased for the full spec:
 *   updateBuildings(square: Square)   — takes the whole Square object
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
} from '@babylonjs/core';
import { computeTileTransforms } from '../../game/board/tileLayout';
import type { TileTransform } from '../../game/board/tileLayout';
import type { Square } from '../../game/types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Width / depth of a single house cube (units). */
const HOUSE_SIZE  = 0.4;
/** Height of a single house cube (units). */
const HOUSE_HEIGHT = 0.5;

/** Width / depth of the hotel cube (units). */
const HOTEL_SIZE  = 0.8;
/** Height of the hotel cube (units). */
const HOTEL_HEIGHT = 0.7;

/** Gap between consecutive house cubes along the tile edge (units). */
const HOUSE_GAP = 0.45;

/** Tile surface height (ground + tile box height). */
const TILE_SURFACE_Y = 0.10;

// ─── Materials (created lazily, shared across all buildings) ──────────────────

let _houseMat: StandardMaterial | null = null;
let _hotelMat: StandardMaterial | null = null;

function isMaterialDead(mat: StandardMaterial | null): boolean {
  if (!mat) return true;
  // Babylon's Material base class sets `_isDisposed` (private) but exposes the
  // state only via `dispose()`.  We detect disposal by checking if the scene
  // can still find the material by name – a disposed material is removed from
  // the scene's material list.
  try {
    return !mat.getScene().materials.includes(mat);
  } catch {
    return true;
  }
}

function getHouseMaterial(scene: Scene): StandardMaterial {
  if (isMaterialDead(_houseMat)) {
    _houseMat = new StandardMaterial('sharedHouseMat', scene);
    _houseMat.diffuseColor  = new Color3(0.05, 0.65, 0.05); // bright green
    _houseMat.emissiveColor = new Color3(0.00, 0.10, 0.00);
  }
  return _houseMat as StandardMaterial;
}

function getHotelMaterial(scene: Scene): StandardMaterial {
  if (isMaterialDead(_hotelMat)) {
    _hotelMat = new StandardMaterial('sharedHotelMat', scene);
    _hotelMat.diffuseColor  = new Color3(0.85, 0.05, 0.05); // vivid red
    _hotelMat.emissiveColor = new Color3(0.12, 0.00, 0.00);
  }
  return _hotelMat as StandardMaterial;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine which world axis runs *along* the tile face so buildings can be
 * spread out on a single row.  The spread axis is the one perpendicular to the
 * outward-facing normal of the edge the tile sits on.
 *
 * Board layout (top-down):
 *   bottom edge (indices 1-9)  : tiles face +z (south), spread along X
 *   left edge   (indices 11-19): tiles face -x (west),  spread along Z
 *   top edge    (indices 21-29): tiles face -z (north),  spread along X
 *   right edge  (indices 31-39): tiles face +x (east),   spread along Z
 *   corners                    : spread along X as default
 *
 * We detect the edge by looking at which absolute coordinate is larger.
 */
function buildingSpreadAxis(t: TileTransform): 'x' | 'z' {
  // Corner tiles and tiles where |x| ≈ |z| default to X.
  if (Math.abs(t.position.z) > Math.abs(t.position.x)) {
    // Bottom or top edge — tile extends left/right, so spread along X.
    return 'x';
  }
  // Left or right edge — tile extends up/down, so spread along Z.
  return 'z';
}

/**
 * Compute the world-space position for one building on a tile.
 *
 * Buildings are placed *inward* from the outer edge by `inwardDist` so they
 * are clearly visible when looking down from a top camera, and spread along
 * the tile's long axis.
 *
 * @param t           TileTransform for the square.
 * @param buildingIdx 0-based index within the row (0 = leftmost).
 * @param totalCount  Total buildings in the row (used for centring).
 * @param isHotel     True when rendering a hotel.
 */
function buildingWorldPos(
  t:            TileTransform,
  buildingIdx:  number,
  totalCount:   number,
  isHotel:      boolean,
): Vector3 {
  const bHeight = isHotel ? HOTEL_HEIGHT : HOUSE_HEIGHT;
  const y = TILE_SURFACE_Y + bHeight / 2; // bottom of building rests on tile top face

  // How far from the tile's centre toward the inner board.
  // We push inward by 1/4 of the tile depth so buildings don't hang off the
  // outer edge into empty space.
  const inwardDist = t.tileDepth * 0.20;

  // Spread offset along the tile's long axis (centred on the tile centre).
  const spreadStep = isHotel ? 0 : HOUSE_GAP;
  const totalSpan  = (totalCount - 1) * spreadStep;
  const offset     = buildingIdx * spreadStep - totalSpan / 2;

  const spreadAxis = buildingSpreadAxis(t);

  let wx: number;
  let wz: number;

  if (spreadAxis === 'x') {
    wx = t.position.x + offset;
    // Inward for bottom-edge tiles means +z, for top-edge tiles means -z.
    const inwardZ = t.position.z < 0 ? inwardDist : -inwardDist;
    wz = t.position.z + inwardZ;
  } else {
    // Left / right edge
    const inwardX = t.position.x < 0 ? inwardDist : -inwardDist;
    wx = t.position.x + inwardX;
    wz = t.position.z + offset;
  }

  return new Vector3(wx, y, wz);
}

// ─── HouseHotelRenderer ───────────────────────────────────────────────────────

export class HouseHotelRenderer {
  /**
   * Maps square index → array of building meshes currently displayed.
   * Hotels produce exactly one mesh; house rows produce 1-4 meshes.
   */
  private readonly buildingMeshes: Map<number, Mesh[]> = new Map();

  /** Cached tile transforms (computed once). */
  private readonly transforms: TileTransform[];

  constructor(private readonly scene: Scene) {
    this.transforms = computeTileTransforms();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Synchronise the 3-D buildings on square `squareIndex` with `houses`.
   * Existing meshes are always discarded first so the call is idempotent.
   *
   *   houses = 0      → clear
   *   houses = 1..4   → that many green house cubes
   *   houses = 5      → one red hotel cube
   */
  updateSquareBuildings(squareIndex: number, houses: number): void {
    this.clearSquareBuildings(squareIndex);
    if (houses === 0) return;

    const t = this.transforms[squareIndex];
    if (!t) return;

    const isHotel = houses === 5;
    const count   = isHotel ? 1 : houses;
    const meshes: Mesh[] = [];

    for (let i = 0; i < count; i++) {
      const mesh = this.spawnBuilding(squareIndex, i, t, isHotel, count);
      meshes.push(mesh);
    }

    this.buildingMeshes.set(squareIndex, meshes);
  }

  /**
   * Convenience overload that accepts a full Square object.
   * Delegates to updateSquareBuildings.
   */
  updateBuildings(square: Square): void {
    this.updateSquareBuildings(square.index, square.houses);
  }

  /**
   * Remove all building meshes for a single square and free GPU memory.
   */
  clearSquareBuildings(squareIndex: number): void {
    const existing = this.buildingMeshes.get(squareIndex);
    if (existing) {
      existing.forEach(m => m.dispose(false, true));
      this.buildingMeshes.delete(squareIndex);
    }
  }

  /**
   * Remove all building meshes from the entire board.
   * Called by useGameEngine.stopGame() via `houseRenderer.clearAll()`.
   */
  clearAll(): void {
    this.buildingMeshes.forEach((_meshes, idx) => {
      this.clearSquareBuildings(idx);
    });
    this.buildingMeshes.clear();
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Create a single house or hotel mesh, apply a shared material, and return
   * it.  The mesh is *not* added to `buildingMeshes` here; the caller
   * collects the returned mesh into a per-square array.
   */
  private spawnBuilding(
    squareIndex: number,
    idx:         number,
    t:           TileTransform,
    isHotel:     boolean,
    totalCount:  number,
  ): Mesh {
    const name = `building_${squareIndex}_${idx}`;

    const size   = isHotel ? HOTEL_SIZE   : HOUSE_SIZE;
    const height = isHotel ? HOTEL_HEIGHT : HOUSE_HEIGHT;

    const mesh = MeshBuilder.CreateBox(
      name,
      { width: size, height, depth: size },
      this.scene,
    );

    const pos = buildingWorldPos(t, idx, totalCount, isHotel);
    mesh.position.copyFrom(pos);
    mesh.isPickable     = false;
    mesh.receiveShadows = false;

    mesh.material = isHotel
      ? getHotelMaterial(this.scene)
      : getHouseMaterial(this.scene);

    return mesh;
  }

  /**
   * Release the shared materials.  Call this only when the entire renderer is
   * torn down (i.e. from a scene-level dispose, not per-square updates).
   */
  dispose(): void {
    this.clearAll();
    if (_houseMat && !isMaterialDead(_houseMat)) {
      _houseMat.dispose();
      _houseMat = null;
    }
    if (_hotelMat && !isMaterialDead(_hotelMat)) {
      _hotelMat.dispose();
      _hotelMat = null;
    }
  }
}
