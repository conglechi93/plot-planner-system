/**
 * TokenRenderer.ts
 *
 * Creates and manages procedural player-token meshes inside the Babylon.js
 * scene.  Tokens are built from three primitives (base disc, body cylinder,
 * head sphere) parented under a TransformNode so they move as a single unit.
 *
 * Public API used by useGameEngine:
 *   createToken(playerId, colorHex, tileIndex)
 *   placeTokenAtTile(playerId, tilePosition, playerIndex, totalPlayers)
 *   moveToken(playerId, from, to, tilePositions, playerIndex, total, onStep?)
 *   dispose()
 *
 * Additional helpers (available for direct use or future UI):
 *   animateMoveThrough(playerId, fromTile, steps, onComplete?)
 *   getTilePosition(tileIndex)
 *   removeToken(playerId)
 */

import {
  Scene,
  MeshBuilder,
  PBRMaterial,
  Color3,
  Mesh,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { computeTileTransforms } from '../../game/board/tileLayout';
import type { TileTransform } from '../../game/board/tileLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Internal record kept for each live token. */
export interface TokenMesh {
  root:            TransformNode;
  playerId:        string;
  currentPosition: number;
}

/** A tile-centre position (y is the ground-plane height of the tile surface). */
export interface TilePosition {
  x: number;
  y: number;
  z: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a CSS hex string ('#RRGGBB' or 'RRGGBB') to a Babylon Color3.
 * Returns a neutral grey on error so the token is still visible.
 */
function hexToColor3(hex: string): Color3 {
  try {
    const clean = hex.startsWith('#') ? hex : `#${hex}`;
    // Color3.FromHexString requires exactly 7 characters.
    if (clean.length !== 7) return new Color3(0.5, 0.5, 0.5);
    return Color3.FromHexString(clean);
  } catch {
    return new Color3(0.5, 0.5, 0.5);
  }
}

/**
 * Compute the radial offset so that up to `total` tokens placed on the same
 * tile fan out in a tight circle without overlapping.
 */
function spreadOffset(
  playerIndex: number,
  totalPlayers: number,
): { dx: number; dz: number } {
  if (totalPlayers <= 1) return { dx: 0, dz: 0 };
  const angle = (playerIndex / totalPlayers) * Math.PI * 2;
  const radius = 0.5; // units – small enough to stay within a 3.33-wide tile
  return {
    dx: Math.cos(angle) * radius,
    dz: Math.sin(angle) * radius,
  };
}

// ─── TokenRenderer ────────────────────────────────────────────────────────────

export class TokenRenderer {
  private readonly tokens: Map<string, TokenMesh> = new Map();

  /** Cached tile-transform array computed once at construction time. */
  private readonly transforms: TileTransform[];

  constructor(private readonly scene: Scene) {
    this.transforms = computeTileTransforms();
  }

  // ── Token creation ────────────────────────────────────────────────────────

  /**
   * Build a three-part procedural token (base → body → head) for the given
   * player and place it at `tileIndex` immediately.
   *
   * Shape spec:
   *   base  – Cylinder, radius 0.4, height 0.15,  y = 0.075
   *   body  – Cylinder, radius 0.2, height 0.70,  y = 0.475
   *   head  – Sphere,   diameter 0.35,            y = 1.025
   */
  createToken(playerId: string, colorHex: string, tileIndex: number): void {
    // Remove any pre-existing token for this player.
    this.removeToken(playerId);

    const root  = new TransformNode(`token_root_${playerId}`, this.scene);
    const color = hexToColor3(colorHex);

    // ── PBR material ──────────────────────────────────────────────────────
    const mat = new PBRMaterial(`tokenMat_${playerId}`, this.scene);
    mat.albedoColor  = color;
    mat.metallic     = 0.3;
    mat.roughness    = 0.6;
    // A gentle emissive so the token is identifiable even in unlit areas.
    mat.emissiveColor = color.scale(0.12);

    // ── Base disc ─────────────────────────────────────────────────────────
    const base = MeshBuilder.CreateCylinder(
      `token_base_${playerId}`,
      { diameter: 0.8, height: 0.15, tessellation: 24 },
      this.scene,
    ) as Mesh;
    base.parent     = root;
    base.position.y = 0.075; // half of height = rests flat on tile surface

    // ── Body cylinder ─────────────────────────────────────────────────────
    const body = MeshBuilder.CreateCylinder(
      `token_body_${playerId}`,
      { diameter: 0.4, height: 0.70, tessellation: 16 },
      this.scene,
    ) as Mesh;
    body.parent     = root;
    body.position.y = 0.475; // base-top (0.15) + body-half (0.35) = 0.50 ≈ spec 0.475

    // ── Head sphere ───────────────────────────────────────────────────────
    const head = MeshBuilder.CreateSphere(
      `token_head_${playerId}`,
      { diameter: 0.35, segments: 14 },
      this.scene,
    ) as Mesh;
    head.parent     = root;
    head.position.y = 1.025; // body-top (0.15+0.70=0.85) + head-radius (0.175) ≈ spec 1.025

    // Assign shared material and configure picking
    ([base, body, head] as Mesh[]).forEach(m => {
      m.material       = mat;
      m.isPickable     = false;
      m.receiveShadows = false;
    });

    const tilePos = this.getTilePosition(tileIndex);
    root.position.copyFrom(tilePos);

    this.tokens.set(playerId, { root, playerId, currentPosition: tileIndex });
  }

  // ── Placement ─────────────────────────────────────────────────────────────

  /**
   * Instantly teleport a token to a tile.
   * `playerIndex` and `totalPlayers` determine the radial offset so multiple
   * tokens on the same square don't z-fight.
   */
  placeTokenAtTile(
    playerId:     string,
    tilePosition: TilePosition,
    playerIndex:  number,
    totalPlayers: number,
  ): void {
    const token = this.tokens.get(playerId);
    if (!token) return;

    const { dx, dz } = spreadOffset(playerIndex, totalPlayers);
    // y: tile surface is at 0.10 (tile height 0.10, centre at 0.05 above ground).
    // Token root sits at tile surface so the base bottom rests at y = 0.10.
    token.root.position.set(
      tilePosition.x + dx,
      0.10, // always on the tile surface, regardless of TilePosition.y
      tilePosition.z + dz,
    );
    token.currentPosition = this.positionToIndex(tilePosition);
  }

  // ── Animated movement ─────────────────────────────────────────────────────

  /**
   * Step the token from `fromPosition` to `toPosition` one tile at a time,
   * waiting 150 ms between each step (compatible with the existing async API).
   *
   * Wraps around the 40-tile board correctly.
   * Calls `onStepComplete(currentTileIndex)` after each step if provided.
   *
   * Returns a Promise that resolves when the token has reached its destination.
   */
  async moveToken(
    playerId:       string,
    fromPosition:   number,
    toPosition:     number,
    tilePositions:  TilePosition[],
    playerIndex:    number,
    totalPlayers:   number,
    onStepComplete?: (pos: number) => void,
  ): Promise<void> {
    const token = this.tokens.get(playerId);
    if (!token) return;

    const BOARD_SIZE = 40;
    const steps =
      toPosition >= fromPosition
        ? toPosition - fromPosition
        : BOARD_SIZE - fromPosition + toPosition;

    for (let step = 1; step <= steps; step++) {
      const currentTile = (fromPosition + step) % BOARD_SIZE;
      const pos = tilePositions[currentTile];
      if (pos) {
        this.placeTokenAtTile(playerId, pos, playerIndex, totalPlayers);
        onStepComplete?.(currentTile);
      }
      await new Promise<void>(resolve => setTimeout(resolve, 500));
    }

    token.currentPosition = toPosition;
  }

  /**
   * Animate `steps` forward from `fromTile` using recursive setTimeout
   * (350 ms per step) so the render loop is never blocked.
   *
   * @param onComplete  Called after the final step lands.
   */
  animateMoveThrough(
    playerId:    string,
    fromTile:    number,
    steps:       number,
    onComplete?: () => void,
  ): void {
    const BOARD_SIZE = 40;
    const token = this.tokens.get(playerId);
    if (!token || steps <= 0) {
      onComplete?.();
      return;
    }

    const STEP_DELAY = 500; // ms

    const step = (remaining: number, currentTile: number): void => {
      if (remaining === 0) {
        token.currentPosition = currentTile;
        onComplete?.();
        return;
      }

      const nextTile = (currentTile + 1) % BOARD_SIZE;
      const pos = this.getTilePosition(nextTile);

      // Preserve the current spread so the token doesn't jump relative to
      // other tokens.  We snap on the X/Z plane; use index 0 spread as default.
      token.root.position.set(pos.x, 0.10, pos.z);

      setTimeout(() => step(remaining - 1, nextTile), STEP_DELAY);
    };

    // First step fires after one delay, matching the async version's feel.
    setTimeout(() => step(steps, fromTile), STEP_DELAY);
  }

  // ── Position helpers ──────────────────────────────────────────────────────

  /**
   * Return the world-space Vector3 centre of tile `tileIndex`.
   * Falls back to the GO corner if the index is out of range.
   */
  getTilePosition(tileIndex: number): Vector3 {
    const t: TileTransform | undefined = this.transforms[tileIndex];
    if (!t) {
      // GO corner fallback
      return new Vector3(20, 0.10, -20);
    }
    return new Vector3(t.position.x, 0.10, t.position.z);
  }

  /**
   * Reverse-look-up a tile index from a TilePosition object (used to keep
   * `currentPosition` accurate after `placeTokenAtTile` calls).
   */
  private positionToIndex(pos: TilePosition): number {
    for (let i = 0; i < this.transforms.length; i++) {
      const t = this.transforms[i];
      if (!t) continue;
      if (
        Math.abs(t.position.x - pos.x) < 0.01 &&
        Math.abs(t.position.z - pos.z) < 0.01
      ) {
        return i;
      }
    }
    return 0;
  }

  // ── Retrieval ─────────────────────────────────────────────────────────────

  /** Return the internal record for a player's token (if any). */
  getToken(playerId: string): TokenMesh | undefined {
    return this.tokens.get(playerId);
  }

  // ── Removal ───────────────────────────────────────────────────────────────

  /**
   * Destroy a single player's token and its children, freeing GPU memory.
   */
  removeToken(playerId: string): void {
    const token = this.tokens.get(playerId);
    if (!token) return;
    // Dispose child meshes (base, body, head) and their materials.
    token.root.getChildMeshes().forEach(m => m.dispose(false, true));
    token.root.dispose();
    this.tokens.delete(playerId);
  }

  /**
   * Destroy all tokens.  Called by useGameEngine.stopGame().
   */
  dispose(): void {
    this.tokens.forEach((_token, id) => this.removeToken(id));
    this.tokens.clear();
  }
}
