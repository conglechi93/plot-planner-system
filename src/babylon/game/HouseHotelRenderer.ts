/**
 * HouseHotelRenderer.ts
 *
 * Manages the 3-D house and hotel meshes shown on top of property tiles.
 *
 * Houses (1-4):  load the barn .babylon model, one instance per house.
 * Hotel  (5):    a single red box (kept simple / distinct from houses).
 *
 * Asset loading is asynchronous.  `updateSquareBuildings` fires-and-forgets
 * the load so the public API stays synchronous and the caller (useGameEngine)
 * doesn't need to be changed.  A generation counter prevents stale async
 * results from overwriting a newer synchronous update.
 *
 * Public API (unchanged from previous version):
 *   updateSquareBuildings(squareIndex, houses)
 *   updateBuildings(square)
 *   clearSquareBuildings(squareIndex)
 *   clearAll()
 *   preload()           ← new: warms up the barn asset cache
 *   dispose()
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  Vector3,
  TransformNode,
} from '@babylonjs/core';
import { getContainer } from '../../utils/containerCache';
import { computeTileTransforms } from '../../game/board/tileLayout';
import type { TileTransform } from '../../game/board/tileLayout';
import type { Square } from '../../game/types';

// ─── Model URL & scale ────────────────────────────────────────────────────────

const BARN_URL = 'https://d1v3nro70bdf57.cloudfront.net/dev/shed/barn/barn-v3.babylon';

/** Uniform scale applied to each barn instance. */
const BARN_SCALE = 0.25;

// ─── Hotel box constants (kept as-is) ─────────────────────────────────────────

const HOTEL_SIZE   = 0.8;
const HOTEL_HEIGHT = 0.7;

/** Tile surface height (ground + tile box height). */
const TILE_SURFACE_Y = 0.10;

// ─── Shared hotel material (lazy, module-level singleton) ─────────────────────

let _hotelMat: StandardMaterial | null = null;

function isMaterialDead(mat: StandardMaterial | null): boolean {
  if (!mat) return true;
  try { return !mat.getScene().materials.includes(mat); } catch { return true; }
}

function getHotelMaterial(scene: Scene): StandardMaterial {
  if (isMaterialDead(_hotelMat)) {
    _hotelMat = new StandardMaterial('sharedHotelMat', scene);
    _hotelMat.diffuseColor  = new Color3(0.85, 0.05, 0.05);
    _hotelMat.emissiveColor = new Color3(0.12, 0.00, 0.00);
  }
  return _hotelMat as StandardMaterial;
}

// ─── Spread-axis helper ───────────────────────────────────────────────────────

function buildingSpreadAxis(t: TileTransform): 'x' | 'z' {
  if (Math.abs(t.position.z) > Math.abs(t.position.x)) return 'x';
  return 'z';
}

// ─── World-space position for one building slot ───────────────────────────────

/** Gap between barn instances along the tile long axis. */
const BARN_SLOT_GAP = 0.45;

/**
 * Returns the X/Z centre for building slot `buildingIdx` on tile `t`.
 * Y is always TILE_SURFACE_Y so the caller can decide the vertical offset
 * per model type.
 */
function buildingSlotPos(
  t:            TileTransform,
  buildingIdx:  number,
  totalCount:   number,
  spreadStep:   number,
): Vector3 {
  // 0.40 → 40% inward from tile centre toward board centre, clear of the card label
  const inwardDist = t.tileDepth * 0.40;
  const totalSpan  = (totalCount - 1) * spreadStep;
  const offset     = buildingIdx * spreadStep - totalSpan / 2;
  const spreadAxis = buildingSpreadAxis(t);

  let wx: number;
  let wz: number;

  if (spreadAxis === 'x') {
    wx = t.position.x + offset;
    const inwardZ = t.position.z < 0 ? inwardDist : -inwardDist;
    wz = t.position.z + inwardZ;
  } else {
    const inwardX = t.position.x < 0 ? inwardDist : -inwardDist;
    wx = t.position.x + inwardX;
    wz = t.position.z + offset;
  }

  return new Vector3(wx, TILE_SURFACE_Y, wz);
}

// ─── HouseHotelRenderer ───────────────────────────────────────────────────────

export class HouseHotelRenderer {
  /** squareIndex → array of root pivot Mesh objects currently in the scene. */
  private readonly buildingMeshes = new Map<number, Mesh[]>();

  /**
   * Monotonic counter per square.  Incremented on every `updateSquareBuildings`
   * call so that a slow async load can detect it has been superseded.
   */
  private readonly generations = new Map<number, number>();

  /** Pre-computed tile transforms (computed once at construction time). */
  private readonly transforms: TileTransform[];

  constructor(private readonly scene: Scene) {
    this.transforms = computeTileTransforms();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Warm up the barn model cache so it is ready before the first house is
   * built.  Call this right after constructing the renderer.
   */
  preload(): void {
    void getContainer(this.scene, BARN_URL).catch(() => {
      // Silently ignore preload failures; spawnBarnHouses will fall back to
      // green boxes if the asset is unavailable at render time.
    });
  }

  /**
   * Synchronise the 3-D buildings for square `squareIndex`.
   *
   *   houses = 0     → clear
   *   houses = 1..4  → that many barn models (async, fallback to green box)
   *   houses = 5     → one red hotel box (sync)
   */
  updateSquareBuildings(squareIndex: number, houses: number): void {
    // Clear existing meshes synchronously so the board is never stale.
    this.clearSquareBuildings(squareIndex);

    // Bump generation so any in-flight async from a previous call aborts.
    const gen = (this.generations.get(squareIndex) ?? 0) + 1;
    this.generations.set(squareIndex, gen);

    if (houses === 0) return;

    const t = this.transforms[squareIndex];
    if (!t) return;

    if (houses === 5) {
      // ── Hotel: instant synchronous red box ──────────────────────────────
      const mesh = this.spawnHotelBox(squareIndex, t);
      this.buildingMeshes.set(squareIndex, [mesh]);
    } else {
      // ── Houses 1-4: async barn model ────────────────────────────────────
      void this.spawnBarnHouses(squareIndex, houses, t, gen).catch(err => {
        console.warn('[HouseHotelRenderer] barn load failed, using fallback:', err);
        if (this.generations.get(squareIndex) === gen) {
          this.spawnFallbackHouses(squareIndex, houses, t);
        }
      });
    }
  }

  /** Convenience overload that accepts a full Square object. */
  updateBuildings(square: Square): void {
    this.updateSquareBuildings(square.index, square.houses);
  }

  /** Remove all building meshes for a single square and free GPU memory. */
  clearSquareBuildings(squareIndex: number): void {
    const existing = this.buildingMeshes.get(squareIndex);
    if (existing) {
      existing.forEach(m => {
        // Recurse into children (pivot → barn instance nodes) but keep
        // shared materials alive (the AssetContainer owns them).
        m.dispose(false, false);
      });
      this.buildingMeshes.delete(squareIndex);
    }
  }

  /** Remove all building meshes from the entire board. */
  clearAll(): void {
    for (const idx of Array.from(this.buildingMeshes.keys())) {
      this.clearSquareBuildings(idx);
    }
    this.buildingMeshes.clear();
  }

  /** Tear down all meshes and the shared hotel material. */
  dispose(): void {
    this.clearAll();
    if (!isMaterialDead(_hotelMat)) {
      _hotelMat!.dispose();
      _hotelMat = null;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Load `count` barn instances onto tile `t` for square `squareIndex`.
   * Aborts silently when the generation counter has moved on (a newer
   * `updateSquareBuildings` call was made while we were awaiting the asset).
   */
  private async spawnBarnHouses(
    squareIndex: number,
    count:       number,
    t:           TileTransform,
    gen:         number,
  ): Promise<void> {
    const container = await getContainer(this.scene, BARN_URL);

    if (this.generations.get(squareIndex) !== gen) return;

    const pivots: Mesh[] = [];

    for (let i = 0; i < count; i++) {
      const pos = buildingSlotPos(t, i, count, BARN_SLOT_GAP);

      const pivot = new Mesh(`barn_pivot_${squareIndex}_${i}_g${gen}`, this.scene);
      pivot.position.copyFrom(pos);
      pivot.isPickable = false;

      const entries = container.instantiateModelsToScene(
        name => `barn_${squareIndex}_${i}_g${gen}_${name}`,
        true,
      );

      entries.animationGroups.forEach(ag => ag.stop());

      entries.rootNodes.forEach(node => {
        const tn = node as TransformNode;
        tn.parent = pivot;
        tn.position.set(0, 0, 0);
        tn.rotation.set(0, 0, 0);
        tn.rotationQuaternion = null;
      });

      pivot.scaling.setAll(BARN_SCALE);
      pivots.push(pivot);
    }

    if (this.generations.get(squareIndex) !== gen) {
      pivots.forEach(p => p.dispose(false, false));
      return;
    }

    this.buildingMeshes.set(squareIndex, pivots);
  }

  /**
   * Synchronous fallback: render simple green boxes when the barn asset is
   * unavailable (network error, CDN down, etc.).
   */
  private spawnFallbackHouses(
    squareIndex: number,
    count:       number,
    t:           TileTransform,
  ): void {
    const HOUSE_SIZE   = 0.4;
    const HOUSE_HEIGHT = 0.5;

    const mat = new StandardMaterial(`fallbackHouseMat_${squareIndex}`, this.scene);
    mat.diffuseColor  = new Color3(0.05, 0.65, 0.05);
    mat.emissiveColor = new Color3(0.00, 0.10, 0.00);

    const meshes: Mesh[] = [];
    for (let i = 0; i < count; i++) {
      const pos = buildingSlotPos(t, i, count, BARN_SLOT_GAP);
      const mesh = MeshBuilder.CreateBox(
        `house_fallback_${squareIndex}_${i}`,
        { width: HOUSE_SIZE, height: HOUSE_HEIGHT, depth: HOUSE_SIZE },
        this.scene,
      );
      mesh.position.set(pos.x, TILE_SURFACE_Y + HOUSE_HEIGHT / 2, pos.z);
      mesh.isPickable     = false;
      mesh.receiveShadows = false;
      mesh.material       = mat;
      meshes.push(mesh);
    }
    this.buildingMeshes.set(squareIndex, meshes);
  }

  /** Synchronous red hotel box (distinct from barn houses). */
  private spawnHotelBox(squareIndex: number, t: TileTransform): Mesh {
    const pos = buildingSlotPos(t, 0, 1, 0);
    const mesh = MeshBuilder.CreateBox(
      `hotel_${squareIndex}`,
      { width: HOTEL_SIZE, height: HOTEL_HEIGHT, depth: HOTEL_SIZE },
      this.scene,
    );
    mesh.position.set(pos.x, TILE_SURFACE_Y + HOTEL_HEIGHT / 2, pos.z);
    mesh.isPickable = false;
    mesh.material   = getHotelMaterial(this.scene);
    return mesh;
  }
}
