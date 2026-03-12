import {
  Scene,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  AbstractMesh,
  Vector3,
  InstantiatedEntries,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { HouseInstance } from '../../types/HouseInstance';
import type { ModelEntry } from '../../types/ModelEntry';
import { createModelInstance } from '../meshCreators/houseLoader';
import { getContainer } from '../../utils/containerCache';
import { snap } from '../../utils/math';

const GRID_SIZE = 1;

/** Kích thước ghost box fallback theo category */
const GHOST_SIZES: Record<string, { w: number; h: number; d: number }> = {
  house:    { w: 4.0, h: 3.0, d: 4.0 },
  grass:    { w: 2.0, h: 0.4, d: 2.0 },
  tree:     { w: 2.0, h: 5.0, d: 2.0 },
  common:   { w: 3.0, h: 2.5, d: 3.0 },
};

function getGhostSize(category: string) {
  return GHOST_SIZES[category.toLowerCase()] ?? { w: 3.0, h: 2.5, d: 3.0 };
}

type PlacedCallback = (house: HouseInstance) => void;

export class PlacementSystem {
  private readonly scene: Scene;
  private readonly ground: Mesh;

  private _isPlacing = false;
  private currentModel: ModelEntry | null = null;

  /** Box ghost – luôn có ngay, hiện trong khi chờ real ghost load */
  private boxGhost: Mesh | null = null;
  /** Real ghost – hình dạng thật của model, bán trong suốt */
  private realGhost: AbstractMesh | null = null;
  /** Entries trả về từ instantiateModelsToScene, dùng để dispose sạch */
  private ghostEntries: InstantiatedEntries | null = null;

  private placedCallbacks: PlacedCallback[] = [];

  constructor(scene: Scene, ground: Mesh) {
    this.scene = scene;
    this.ground = ground;
  }

  get isPlacing(): boolean {
    return this._isPlacing;
  }

  /**
   * Bắt đầu placement mode.
   * 1. Spawn box ghost ngay lập tức
   * 2. Load GLB thật async → thay box ghost khi xong
   */
  startPlacement(model: ModelEntry): void {
    this._isPlacing = true;
    this.currentModel = model;
    this.spawnBoxGhost(model);
    void this.loadRealGhost(model);
  }

  cancelPlacement(): void {
    this._isPlacing = false;
    this.destroyAllGhosts();
  }

  updateGhost(screenX: number, screenY: number): void {
    if (!this._isPlacing) return;

    const pick = this.scene.pick(screenX, screenY, (mesh) => mesh === this.ground);
    if (!pick.hit || !pick.pickedPoint) return;

    const x = snap(pick.pickedPoint.x, GRID_SIZE);
    const z = snap(pick.pickedPoint.z, GRID_SIZE);

    // Ưu tiên real ghost nếu đã load xong
    if (this.realGhost) {
      this.realGhost.position.x = x;
      this.realGhost.position.z = z;
    } else if (this.boxGhost) {
      this.boxGhost.position.x = x;
      this.boxGhost.position.z = z;
    }
  }

  async placeHouse(): Promise<void> {
    if (!this._isPlacing || !this.currentModel) return;

    // Lấy vị trí từ ghost đang active
    const activeGhost = this.realGhost ?? this.boxGhost;
    const position = activeGhost?.position.clone() ?? Vector3.Zero();
    position.y = 0;

    this._isPlacing = false;
    this.destroyAllGhosts();

    // Load model thật (browser đã cache nên gần như tức thì)
    const instance = await createModelInstance(
      this.scene,
      this.currentModel.path,
      this.currentModel.name,
      position
    );
    this.placedCallbacks.forEach((cb) => cb(instance));
  }

  onPlaced(callback: PlacedCallback): void {
    this.placedCallbacks.push(callback);
  }

  // ─── Private ─────────────────────────────────────────────

  private spawnBoxGhost(model: ModelEntry): void {
    this.destroyBoxGhost();
    const { w, h, d } = getGhostSize(model.category);

    this.boxGhost = MeshBuilder.CreateBox(
      'placement_ghost_box',
      { width: w, height: h, depth: d },
      this.scene
    );
    this.boxGhost.position.y = h / 2;
    this.boxGhost.isPickable = false;

    const mat = new StandardMaterial('ghost_box_mat', this.scene);
    mat.diffuseColor = new Color3(0.35, 0.70, 1.0);
    mat.alpha = 0.38;
    this.boxGhost.material = mat;
  }

  /** Load GLB thật qua container cache, áp visibility 0.48, thay thế box ghost */
  private async loadRealGhost(model: ModelEntry): Promise<void> {
    try {
      const container = await getContainer(this.scene, model.path);

      // Nếu user đã cancel hoặc chọn model khác → thoát, không instantiate
      if (!this._isPlacing || this.currentModel?.path !== model.path) return;

      const entries = container.instantiateModelsToScene(undefined, true);
      const root    = entries.rootNodes[0] as AbstractMesh;
      root.name     = 'placement_ghost_real';
      root.rotationQuaternion = null; // force Euler mode

      // Áp ghost appearance: không pickable, bán trong suốt
      const applyGhost = (m: AbstractMesh) => {
        m.isPickable  = false;
        m.visibility  = 0.48;
      };
      applyGhost(root);
      root.getChildMeshes().forEach(applyGhost);

      // Giữ vị trí box ghost trước khi xoá
      const savedX = this.boxGhost?.position.x ?? 0;
      const savedZ = this.boxGhost?.position.z ?? 0;
      this.destroyBoxGhost();

      root.position.set(savedX, 0, savedZ);

      this.realGhost    = root;
      this.ghostEntries = entries;
    } catch {
      // Load thất bại → giữ box ghost
    }
  }

  private destroyBoxGhost(): void {
    if (this.boxGhost) {
      this.boxGhost.material?.dispose();
      this.boxGhost.dispose();
      this.boxGhost = null;
    }
  }

  private destroyAllGhosts(): void {
    this.destroyBoxGhost();
    if (this.ghostEntries) {
      this.ghostEntries.dispose(); // dispose tất cả instantiated nodes
      this.ghostEntries = null;
      this.realGhost    = null;
    }
  }
}
