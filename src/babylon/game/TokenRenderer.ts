/**
 * TokenRenderer.ts  v2
 *
 * Loads GLB character models and renders them as player tokens on the board.
 *
 * Architecture
 * ────────────
 *   tokenRoot  (TransformNode, scale = 1, this is what gets repositioned)
 *     ├─ modelRoot  (the GLB root returned by instantiateModelsToScene,
 *     │              scaled to CharacterConfig.scale)
 *     │   └─ … all GLB meshes / skeleton
 *     ├─ crownRing   (Torus,    VIP player only)
 *     ├─ crownSpike* (Cylinder, VIP player only – 5 pieces)
 *     └─ vipLight    (PointLight, VIP player only)
 *
 * Because tokenRoot has scale = 1, the crown's .position values are directly
 * in world units — no need to invert the model's scaling.
 *
 * Character assignment
 * ────────────────────
 *   playerIndex 0  → RobotExpressive (human / VIP)
 *   playerIndex 1  → Soldier
 *   playerIndex 2  → Fox
 *   playerIndex 3  → character_2
 *   playerIndex 4+ → wraps around (mod 4)
 *
 * Public API
 * ──────────
 *   createToken(playerId, colorHex, tileIndex, playerIndex) → Promise<void>
 *   placeTokenAtTile(playerId, tilePosition, playerIndex, totalPlayers)
 *   moveToken(playerId, from, to, tilePositions, playerIndex, total, onStep?)
 *   removeToken(playerId)
 *   dispose()
 */

import {
  Scene,
  TransformNode,
  Vector3,
  MeshBuilder,
  PBRMaterial,
  Color3,
  PointLight,
  Animation,
  AnimationGroup,
  Mesh,
} from '@babylonjs/core';
import { getContainer } from '../../utils/containerCache';
import { computeTileTransforms } from '../../game/board/tileLayout';
import type { TileTransform } from '../../game/board/tileLayout';

// ─── Character config ─────────────────────────────────────────────────────────

interface CharacterConfig {
  /** Path relative to /public */
  modelPath:     string;
  /**
   * Scaling applied to the GLB root node so the character stands ~1.0–1.3
   * world-units tall on the board.
   *
   * Scale strategy: scaleInPlace() MULTIPLIES the value on top of any
   * baked GLB root scale (e.g. Soldier bakes 0.01 for cm→m conversion).
   * Think of `scale` here as "factor on top of whatever the model ships with".
   *
   *   RobotExpressive : baked=1.0,  × 0.65  → visual ~1.1 units ✓
   *   Soldier         : baked=0.01, × 0.65  → net 0.0065 → ~1.1 units ✓
   *   Fox             : baked=1.0,  × 0.02  → visual ~1.6 units ✓
   *   character_2     : baked=1.0,  × 0.10  → visual ~1.9 units (adjust if needed)
   */
  scale:         number;
  /** Animation-group name used while the token is standing still. */
  idleAnimName:  string;
  /** Animation-group name used while the token is walking between tiles. */
  walkAnimName:  string;
  /** When true, a golden crown + point-light are added on top. */
  isVip:         boolean;
  /**
   * Y position (in tokenRoot-local / world units) where the crown base sits.
   * Only relevant when isVip = true.
   */
  crownY:        number;
}

const CHARACTER_CONFIGS: CharacterConfig[] = [
  // ── 0: Human player (VIP) ──────────────────────────────────────────────────
  {
    // NullEngine actual: 4.60 units native  → 4.60 × 0.65 = 2.99 units (VIP)
    // Crown sits above head: head at 4.58 × 0.65 = 2.98 → crownY = 3.2
    modelPath:    '/models/characters/RobotExpressive.glb',
    scale:        0.65,
    idleAnimName: 'Idle',
    walkAnimName: 'Walking',
    isVip:        true,
    crownY:       3.2,
  },
  // ── 1: AI player ───────────────────────────────────────────────────────────
  {
    // NullEngine actual: 1.83 units native (baked 0.01 already applied)
    // 1.83 × 1.1 = 2.02 units
    modelPath:    '/models/characters/Soldier.glb',
    scale:        1.1,
    idleAnimName: 'Idle',
    walkAnimName: 'Walk',
    isVip:        false,
    crownY:       0,
  },
  // ── 2: AI player ───────────────────────────────────────────────────────────
  {
    // NullEngine actual: 79.0 units native (geometry in cm, no baked scale)
    // 79.0 × 0.025 = 1.98 units
    modelPath:    '/models/characters/Fox.glb',
    scale:        0.025,
    idleAnimName: 'Survey',
    walkAnimName: 'Walk',
    isVip:        false,
    crownY:       0,
  },
  // ── 3: AI player ───────────────────────────────────────────────────────────
  {
    // NullEngine actual: 2.43 units native
    // 2.43 × 0.82 = 1.99 units
    modelPath:    '/models/characters/character_2.glb',
    scale:        0.82,
    idleAnimName: 'IDLE',
    walkAnimName: 'walk',
    isVip:        false,
    crownY:       0,
  },
];

// ─── Internal token record ────────────────────────────────────────────────────

interface TokenRecord {
  /** Wrapper node (scale 1). This is what gets repositioned on the board. */
  tokenRoot:        TransformNode;
  playerId:         string;
  currentPosition:  number;
  idleAnim:         AnimationGroup | null;
  walkAnim:         AnimationGroup | null;
  /** Crown + spikes materials — owned by us, safe to dispose. */
  localMaterials:   PBRMaterial[];
  vipLight:         PointLight | null;
  /**
   * Set while the GLB is still loading.  placeTokenAtTile() queues here when
   * modelRoot is not yet attached; createToken() drains it on completion.
   */
  pendingPlacement: { pos: TilePosition; playerIndex: number; totalPlayers: number } | null;
}

// ─── Public types (re-exported for callers) ───────────────────────────────────

export interface TilePosition {
  x: number;
  y: number;
  z: number;
}

/** @deprecated Use TokenRecord internally; kept for external callers that
 *  reference the old interface (e.g. getToken()). */
export interface TokenMesh {
  root:            TransformNode;
  playerId:        string;
  currentPosition: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function spreadOffset(playerIndex: number, totalPlayers: number): { dx: number; dz: number } {
  if (totalPlayers <= 1) return { dx: 0, dz: 0 };
  const angle  = (playerIndex / totalPlayers) * Math.PI * 2;
  const radius = 0.5;
  return { dx: Math.cos(angle) * radius, dz: Math.sin(angle) * radius };
}

/**
 * Find an AnimationGroup by name (exact-match first, then includes-match).
 * Case-insensitive.
 */
function findAnim(groups: AnimationGroup[], name: string): AnimationGroup | null {
  const q = name.toLowerCase();
  return (
    groups.find(ag => ag.name.toLowerCase() === q) ??
    groups.find(ag => ag.name.toLowerCase().includes(q)) ??
    null
  );
}

// ─── VIP decoration ───────────────────────────────────────────────────────────

function buildCrown(
  scene:       Scene,
  parent:      TransformNode,
  crownY:      number,
  localMats:   PBRMaterial[],
): PointLight {
  // Shared gold material (owned by us, not by any container)
  const gold = new PBRMaterial('vip_gold', scene);
  gold.albedoColor   = new Color3(1.0, 0.82, 0.1);
  gold.metallic      = 1.0;
  gold.roughness     = 0.15;
  gold.emissiveColor = new Color3(0.55, 0.44, 0.04);
  localMats.push(gold);

  // ── Crown ring ────────────────────────────────────────────────────────────
  const ring = MeshBuilder.CreateTorus(
    'vip_ring',
    { diameter: 0.44, thickness: 0.065, tessellation: 32 },
    scene,
  ) as Mesh;
  ring.parent      = parent;
  ring.position.y  = crownY;
  ring.material    = gold;
  ring.isPickable  = false;

  // Slow rotation animation on the ring
  const rotAnim = new Animation(
    'crownSpin', 'rotation.y', 30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  rotAnim.setKeys([
    { frame:  0, value: 0 },
    { frame: 90, value: Math.PI * 2 },
  ]);
  ring.animations = [rotAnim];
  scene.beginAnimation(ring, 0, 90, true, 0.25); // very slow spin

  // ── Crown spikes (5 tapered cylinders arranged radially) ──────────────────
  const SPIKE_COUNT = 5;
  for (let i = 0; i < SPIKE_COUNT; i++) {
    const angle = (i / SPIKE_COUNT) * Math.PI * 2;
    const spike = MeshBuilder.CreateCylinder(
      `vip_spike_${i}`,
      { diameterTop: 0.02, diameterBottom: 0.08, height: 0.22, tessellation: 8 },
      scene,
    ) as Mesh;
    spike.parent     = parent;
    spike.position.x = Math.cos(angle) * 0.17;
    spike.position.z = Math.sin(angle) * 0.17;
    spike.position.y = crownY + 0.09;
    spike.material   = gold;
    spike.isPickable = false;
  }

  // ── Soft golden point light ───────────────────────────────────────────────
  const light       = new PointLight('vip_light', Vector3.Zero(), scene);
  light.parent      = parent;
  light.position.y  = crownY + 0.35;
  light.diffuse     = new Color3(1.0, 0.88, 0.4);
  light.specular    = new Color3(0.5, 0.44, 0.2);
  light.intensity   = 0.85;
  light.range       = 9;

  return light;
}

// ─── Procedural fallback (original token shape) ───────────────────────────────

function buildProceduralToken(
  scene:     Scene,
  parent:    TransformNode,
  color:     Color3,
  localMats: PBRMaterial[],
): void {
  const mat          = new PBRMaterial('tokenMatFallback', scene);
  mat.albedoColor    = color;
  mat.metallic       = 0.3;
  mat.roughness      = 0.6;
  mat.emissiveColor  = color.scale(0.12);
  localMats.push(mat);

  const base = MeshBuilder.CreateCylinder('token_base', { diameter: 0.8, height: 0.15, tessellation: 24 }, scene) as Mesh;
  const body = MeshBuilder.CreateCylinder('token_body', { diameter: 0.4, height: 0.70, tessellation: 16 }, scene) as Mesh;
  const head = MeshBuilder.CreateSphere  ('token_head', { diameter: 0.35, segments: 14 },                  scene) as Mesh;

  base.parent     = parent;  base.position.y = 0.075;
  body.parent     = parent;  body.position.y = 0.475;
  head.parent     = parent;  head.position.y = 1.025;

  [base, body, head].forEach(m => {
    m.material      = mat;
    m.isPickable    = false;
    m.receiveShadows = false;
  });
}

// ─── TokenRenderer ────────────────────────────────────────────────────────────

export class TokenRenderer {
  private readonly tokens:     Map<string, TokenRecord> = new Map();
  private readonly transforms: TileTransform[];

  constructor(private readonly scene: Scene) {
    this.transforms = computeTileTransforms();
  }

  // ── Token creation ────────────────────────────────────────────────────────

  /**
   * Create an animated character token for `playerId` and place it at
   * `tileIndex`.  Loading is asynchronous; `placeTokenAtTile` calls made
   * before the GLB resolves are queued and applied automatically.
   *
   * @param playerIndex  0 = human (VIP robot), 1–3 = AI characters.
   */
  createToken(
    playerId:    string,
    colorHex:    string,
    tileIndex:   number,
    playerIndex: number = 0,
  ): void {
    this.removeToken(playerId);

    const config      = CHARACTER_CONFIGS[playerIndex % CHARACTER_CONFIGS.length]!;
    const localMats:  PBRMaterial[] = [];
    const tokenRoot   = new TransformNode(`token_root_${playerId}`, this.scene);

    // Place immediately at tile so the wrapper is in the right position even
    // before the GLB loads.
    const tilePos = this.getTilePosition(tileIndex);
    tokenRoot.position.copyFrom(tilePos);

    const record: TokenRecord = {
      tokenRoot,
      playerId,
      currentPosition:  tileIndex,
      idleAnim:         null,
      walkAnim:         null,
      localMaterials:   localMats,
      vipLight:         null,
      pendingPlacement: null,
    };
    this.tokens.set(playerId, record);

    // ── Async GLB load ──────────────────────────────────────────────────────
    void (async () => {
      try {
        const container = await getContainer(this.scene, config.modelPath);

        // Guard: token might have been removed while we were loading
        if (!this.tokens.has(playerId)) return;

        const inst      = container.instantiateModelsToScene(
          n => `token_${playerId}_${n}`,
          true, // cloneAnimations — each instance gets independent animation state
        );
        const modelRoot = inst.rootNodes[0] as TransformNode | undefined;
        if (!modelRoot) throw new Error('No root node in GLB');

        // Attach model under tokenRoot, multiply scale on top of any
        // baked-in GLB root scale (e.g. Soldier has 0.01 cm→m baked in).
        // scaleInPlace() preserves the existing value instead of overriding it.
        modelRoot.parent = tokenRoot;
        modelRoot.scaling.scaleInPlace(config.scale);

        // ── Animations ─────────────────────────────────────────────────────
        record.idleAnim = findAnim(inst.animationGroups, config.idleAnimName);
        record.walkAnim = findAnim(inst.animationGroups, config.walkAnimName);

        // Stop all animation groups first, then start idle on loop
        inst.animationGroups.forEach(ag => ag.stop());
        record.idleAnim?.start(true, 1.0);

        // ── VIP crown ──────────────────────────────────────────────────────
        if (config.isVip) {
          record.vipLight = buildCrown(this.scene, tokenRoot, config.crownY, localMats);
        }

        // ── Apply any queued placement ──────────────────────────────────────
        if (record.pendingPlacement) {
          const { pos, playerIndex: pi, totalPlayers } = record.pendingPlacement;
          this._applyPlacement(record, pos, pi, totalPlayers);
          record.pendingPlacement = null;
        }

      } catch (err) {
        console.warn(`[TokenRenderer] Failed to load ${config.modelPath}, using fallback`, err);
        if (!this.tokens.has(playerId)) return;

        const colorVal = this._hexToColor3(colorHex);
        buildProceduralToken(this.scene, tokenRoot, colorVal, localMats);
      }
    })();
  }

  // ── Placement ─────────────────────────────────────────────────────────────

  placeTokenAtTile(
    playerId:     string,
    tilePosition: TilePosition,
    playerIndex:  number,
    totalPlayers: number,
  ): void {
    const record = this.tokens.get(playerId);
    if (!record) return;

    this._applyPlacement(record, tilePosition, playerIndex, totalPlayers);
  }

  private _applyPlacement(
    record:       TokenRecord,
    pos:          TilePosition,
    playerIndex:  number,
    totalPlayers: number,
  ): void {
    const { dx, dz } = spreadOffset(playerIndex, totalPlayers);
    record.tokenRoot.position.set(pos.x + dx, 0.10, pos.z + dz);
    record.currentPosition = this._positionToIndex(pos);
  }

  // ── Animated movement ─────────────────────────────────────────────────────

  async moveToken(
    playerId:        string,
    fromPosition:    number,
    toPosition:      number,
    tilePositions:   TilePosition[],
    playerIndex:     number,
    totalPlayers:    number,
    onStepComplete?: (pos: number) => void,
  ): Promise<void> {
    const record = this.tokens.get(playerId);
    if (!record) return;

    const BOARD_SIZE = 40;
    const steps =
      toPosition >= fromPosition
        ? toPosition - fromPosition
        : BOARD_SIZE - fromPosition + toPosition;

    // Switch to walk animation
    record.idleAnim?.pause();
    record.walkAnim?.start(true, 1.0);

    for (let step = 1; step <= steps; step++) {
      const currentTile = (fromPosition + step) % BOARD_SIZE;
      const pos = tilePositions[currentTile];
      if (pos) {
        this._applyPlacement(record, pos, playerIndex, totalPlayers);
        onStepComplete?.(currentTile);
      }
      await new Promise<void>(resolve => setTimeout(resolve, 500));
    }

    // Return to idle
    record.walkAnim?.stop();
    record.idleAnim?.start(true, 1.0);
    record.currentPosition = toPosition;
  }

  animateMoveThrough(
    playerId:    string,
    fromTile:    number,
    steps:       number,
    onComplete?: () => void,
  ): void {
    const BOARD_SIZE  = 40;
    const record      = this.tokens.get(playerId);
    if (!record || steps <= 0) { onComplete?.(); return; }

    record.idleAnim?.pause();
    record.walkAnim?.start(true, 1.0);

    const STEP_DELAY = 500;

    const advance = (remaining: number, currentTile: number): void => {
      if (remaining === 0) {
        record.currentPosition = currentTile;
        record.walkAnim?.stop();
        record.idleAnim?.start(true, 1.0);
        onComplete?.();
        return;
      }
      const nextTile = (currentTile + 1) % BOARD_SIZE;
      const pos      = this.getTilePosition(nextTile);
      record.tokenRoot.position.set(pos.x, 0.10, pos.z);
      setTimeout(() => advance(remaining - 1, nextTile), STEP_DELAY);
    };

    setTimeout(() => advance(steps, fromTile), STEP_DELAY);
  }

  // ── Position helpers ──────────────────────────────────────────────────────

  getTilePosition(tileIndex: number): Vector3 {
    const t: TileTransform | undefined = this.transforms[tileIndex];
    return t
      ? new Vector3(t.position.x, 0.10, t.position.z)
      : new Vector3(20, 0.10, -20);
  }

  private _positionToIndex(pos: TilePosition): number {
    for (let i = 0; i < this.transforms.length; i++) {
      const t = this.transforms[i];
      if (!t) continue;
      if (Math.abs(t.position.x - pos.x) < 0.01 && Math.abs(t.position.z - pos.z) < 0.01) {
        return i;
      }
    }
    return 0;
  }

  private _hexToColor3(hex: string): Color3 {
    try {
      const clean = hex.startsWith('#') ? hex : `#${hex}`;
      if (clean.length !== 7) return new Color3(0.5, 0.5, 0.5);
      return Color3.FromHexString(clean);
    } catch {
      return new Color3(0.5, 0.5, 0.5);
    }
  }

  // ── Retrieval ─────────────────────────────────────────────────────────────

  getToken(playerId: string): TokenMesh | undefined {
    const r = this.tokens.get(playerId);
    if (!r) return undefined;
    return { root: r.tokenRoot, playerId: r.playerId, currentPosition: r.currentPosition };
  }

  // ── Removal ───────────────────────────────────────────────────────────────

  removeToken(playerId: string): void {
    const record = this.tokens.get(playerId);
    if (!record) return;

    // Stop animations
    record.idleAnim?.stop();
    record.walkAnim?.stop();

    // Dispose VIP light
    record.vipLight?.dispose();

    // Dispose child meshes.
    // IMPORTANT: do NOT dispose materials on the modelRoot children — those
    // materials live in the AssetContainer and are shared across instances.
    // Only dispose our locally-created crown/fallback materials (localMaterials).
    record.tokenRoot.getChildMeshes(false).forEach(m => {
      m.dispose(false, false); // false, false = keep material references alive
    });

    // Now it is safe to dispose our own locally-created materials.
    record.localMaterials.forEach(mat => mat.dispose());

    record.tokenRoot.dispose();
    this.tokens.delete(playerId);
  }

  dispose(): void {
    this.tokens.forEach((_r, id) => this.removeToken(id));
    this.tokens.clear();
  }
}
