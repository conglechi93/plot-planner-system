/**
 * BoardRenderer.ts
 *
 * Renders the 40 Cờ Tỉ Phú (Vietnamese Monopoly) tiles on top of the existing
 * 50×50 Babylon.js ground plane.  Each tile is a thin box whose size, position,
 * and rotation are sourced from the pre-computed TILE_TRANSFORMS table.
 *
 * Visual layers (bottom → top):
 *   1. Tile box       – coloured by square type / property group
 *   2. DynamicTexture – painted label (name + price) baked onto the diffuse map
 *   3. Ownership strip – a small flat overlay box rendered on owned properties
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  DynamicTexture,
  Mesh,
  Vector3,
} from '@babylonjs/core';
import { computeTileTransforms } from '../../game/board/tileLayout';
import type { TileTransform } from '../../game/board/tileLayout';
import type { Square } from '../../game/types';

// ─── Colour tables ────────────────────────────────────────────────────────────

/** Property-group colours, exactly matching boardData.ts GROUP_COLORS. */
const GROUP_COLORS: Record<string, string> = {
  brown:      '#8B4513',
  light_blue: '#87CEEB',
  pink:       '#FF69B4',
  orange:     '#FFA500',
  red:        '#FF0000',
  yellow:     '#FFD700',
  green:      '#008000',
  dark_blue:  '#00008B',
};

/** Spec-mandated colours for every non-property square type. */
const SPECIAL_COLORS: Record<string, string> = {
  go:              '#00CC44', // bright green
  jail:            '#4682B4', // steel blue
  free_parking:    '#FFD700', // gold
  go_to_jail:      '#FF4500', // orange red
  community_chest: '#DDA0DD', // light purple
  chance:          '#FFA500', // orange
  tax:             '#8B0000', // dark red
  railroad:        '#555555', // dark gray
  utility:         '#FFFACD', // light yellow / lemon chiffon
};

/** Fallback cream colour for any unrecognised tile. */
const FALLBACK_COLOR = '#E8D5B7';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the hex fill colour for a square.
 */
function tileColor(square: Square): string {
  if (square.group) {
    return GROUP_COLORS[square.group] ?? FALLBACK_COLOR;
  }
  return SPECIAL_COLORS[square.type] ?? FALLBACK_COLOR;
}

/**
 * Parse a CSS hex string ('#RRGGBB') to a Babylon Color3.
 * Falls back to white on malformed input.
 */
function hexToColor3(hex: string): Color3 {
  try {
    // Color3.FromHexString expects exactly '#RRGGBB'
    const clean = hex.startsWith('#') ? hex : `#${hex}`;
    return Color3.FromHexString(clean.length === 7 ? clean : FALLBACK_COLOR);
  } catch {
    return Color3.White();
  }
}

/**
 * Determine whether the painted label text should be white (dark tile) or
 * black (light tile) for readability, using perceived-luminance heuristic.
 */
function labelTextColor(hexBg: string): string {
  try {
    const c = Color3.FromHexString(hexBg.startsWith('#') ? hexBg : `#${hexBg}`);
    // Perceived luminance (ITU-R BT.601)
    const luminance = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    return luminance > 0.55 ? '#111111' : '#FFFFFF';
  } catch {
    return '#FFFFFF';
  }
}

/**
 * Word-wrap `text` into lines that fit within `maxWidth` canvas pixels, using
 * the given canvas 2-D context for measurement.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const probe = current ? `${current} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = probe;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── BoardRenderer ────────────────────────────────────────────────────────────

export class BoardRenderer {
  /** One entry per board index (0–39). undefined = not yet created. */
  private tileMeshes: (Mesh | undefined)[] = new Array(40).fill(undefined);

  /**
   * Thin coloured ownership-strip meshes displayed on top of owned tiles.
   * Keyed by square index.
   */
  private ownerStrips: Map<number, Mesh> = new Map();

  /** Cached tile-transform array – computed once and reused. */
  private readonly transforms: TileTransform[];

  constructor(private readonly scene: Scene) {
    this.transforms = computeTileTransforms();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Create all 40 tile meshes from scratch.
   * Call once after the scene is ready, passing the initial square array.
   */
  renderBoard(squares: Square[]): void {
    this.dispose();

    for (let i = 0; i < 40; i++) {
      const t  = this.transforms[i];
      const sq = squares[i];
      if (t && sq) {
        this.tileMeshes[i] = this.buildTileMesh(t, sq);
        this.syncOwnerStrip(i, sq);
      }
    }
  }

  /**
   * Rebuild the mesh for a single tile (e.g. after an ownership change).
   * Accepts the full squares array for convenience – only index `squareIndex`
   * is used.
   */
  updateTile(squareIndex: number, squares: Square[]): void {
    // Dispose existing tile geometry + materials
    const existing = this.tileMeshes[squareIndex];
    if (existing) {
      existing.dispose(false, true); // true = also dispose materials
      this.tileMeshes[squareIndex] = undefined;
    }

    const t  = this.transforms[squareIndex];
    const sq = squares[squareIndex];
    if (t && sq) {
      this.tileMeshes[squareIndex] = this.buildTileMesh(t, sq);
      this.syncOwnerStrip(squareIndex, sq);
    }
  }

  /** Release every tile mesh, material, texture, and owner strip. */
  dispose(): void {
    for (let i = 0; i < this.tileMeshes.length; i++) {
      this.tileMeshes[i]?.dispose(false, true);
      this.tileMeshes[i] = undefined;
    }
    this.tileMeshes = new Array(40).fill(undefined);

    this.ownerStrips.forEach(m => m.dispose(false, true));
    this.ownerStrips.clear();
  }

  // ── Tile mesh construction ───────────────────────────────────────────────

  /**
   * Build and return a fully-materialised tile mesh for the given transform
   * and square data.
   */
  private buildTileMesh(t: TileTransform, square: Square): Mesh {
    const hex = tileColor(square);

    // ── Box geometry ────────────────────────────────────────────────────────
    const mesh = MeshBuilder.CreateBox(
      `tile_${t.index}`,
      {
        width:  t.tileWidth,
        height: 0.1,
        depth:  t.tileDepth,
      },
      this.scene,
    );

    // y = 0.05 places the 0.1-height box so its bottom face sits exactly on
    // the ground plane (y = 0) and its top face is at y = 0.1.
    mesh.position.set(t.position.x, 0.05, t.position.z);
    mesh.rotation.y  = t.rotationY;
    mesh.isPickable  = false;
    mesh.receiveShadows = true;

    // ── DynamicTexture label ─────────────────────────────────────────────────
    const texture = this.buildLabelTexture(t, square, hex);

    // ── StandardMaterial ─────────────────────────────────────────────────────
    const mat = new StandardMaterial(`tileMat_${t.index}`, this.scene);
    mat.diffuseColor   = hexToColor3(hex);
    mat.diffuseTexture = texture;
    // A subtle ambient self-illumination so tiles are readable without strong
    // directional light.
    mat.emissiveColor  = hexToColor3(hex).scale(0.25);
    mesh.material = mat;

    return mesh;
  }

  /**
   * Paint a DynamicTexture with the tile's background colour, a border,
   * the square name (word-wrapped), and an optional price label.
   */
  private buildLabelTexture(
    t: TileTransform,
    square: Square,
    hex: string,
  ): DynamicTexture {
    // Corner tiles get a bigger texture for their extra real-estate.
    const texW = t.isCorner ? 256 : 256;
    const texH = t.isCorner ? 256 : 128;

    const texture = new DynamicTexture(
      `tileTex_${t.index}`,
      { width: texW, height: texH },
      this.scene,
      false, // generate mips = false; tiles are seen from a fixed camera height
    );

    const ctx = texture.getContext() as CanvasRenderingContext2D;
    const textColor = labelTextColor(hex);

    // Background
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, texW, texH);

    // Thin border
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, texW - 4, texH - 4);

    // ── Name ──────────────────────────────────────────────────────────────
    const nameFontSize = t.isCorner ? 22 : 14;
    ctx.fillStyle  = textColor;
    ctx.font       = `bold ${nameFontSize}px Arial`;
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';

    const lines = wrapText(ctx, square.name, texW - 16);
    const lineH = nameFontSize + 4;
    // Start drawing centred vertically for name block
    const nameBlockH = lines.length * lineH;
    let nameY = Math.max(8, (texH * 0.55 - nameBlockH) / 2);

    for (const line of lines) {
      ctx.fillText(line, texW / 2, nameY);
      nameY += lineH;
    }

    // ── Price / tax amount ─────────────────────────────────────────────────
    if (square.price !== undefined) {
      const priceFontSize = t.isCorner ? 18 : 12;
      ctx.font       = `${priceFontSize}px Arial`;
      ctx.textBaseline = 'bottom';
      ctx.fillStyle  = textColor;
      ctx.fillText(`${square.price}tr`, texW / 2, texH - 6);
    }

    // ── Group colour band (top strip for property tiles) ─────────────────
    if (square.group) {
      const bandH = t.isCorner ? 20 : 14;
      ctx.fillStyle = GROUP_COLORS[square.group] ?? hex;
      ctx.fillRect(0, 0, texW, bandH);
      // Re-draw top border over the band
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(0, 0, texW, bandH);
    }

    texture.update();
    return texture;
  }

  // ── Ownership strip ──────────────────────────────────────────────────────

  /**
   * Add or remove the thin coloured strip that indicates an owned tile.
   * The strip sits on the very top surface of the tile box (y = 0.15).
   */
  private syncOwnerStrip(squareIndex: number, square: Square): void {
    // Remove any existing strip first
    const existing = this.ownerStrips.get(squareIndex);
    if (existing) {
      existing.dispose(false, true);
      this.ownerStrips.delete(squareIndex);
    }

    // Only render for ownable squares that are actually owned
    if (!square.ownerId) return;
    if (
      square.type !== 'property' &&
      square.type !== 'railroad' &&
      square.type !== 'utility'
    ) {
      return;
    }

    const t = this.transforms[squareIndex];
    if (!t) return;

    // Strip: full tile width, 0.05 high, 1/4 of tile depth, inset from the
    // outer edge (near player side) so it's clearly visible from a top-down
    // camera.
    const stripDepth = t.tileDepth * 0.18;
    const strip = MeshBuilder.CreateBox(
      `ownerStrip_${squareIndex}`,
      {
        width:  t.tileWidth  * 0.9,
        height: 0.04,
        depth:  stripDepth,
      },
      this.scene,
    );

    // Offset the strip toward the outer edge of the tile.
    // The tile's rotationY determines which world axis is "outward".
    const inwardOffset = (t.tileDepth / 2) - (stripDepth / 2) - 0.05;
    const stripPos = new Vector3(t.position.x, 0.12, t.position.z);

    // Shift along the tile's local Z axis (outward direction before rotation)
    // by applying the tile rotation.
    const cos = Math.cos(t.rotationY);
    const sin = Math.sin(t.rotationY);
    // Local offset vector (0, 0, inwardOffset) rotated by rotationY around Y:
    stripPos.x += sin * inwardOffset;  // rotY rotates in XZ plane: z→x = sin
    stripPos.z += cos * inwardOffset;  // z component after rotation = cos * dz

    strip.position.copyFrom(stripPos);
    strip.rotation.y  = t.rotationY;
    strip.isPickable  = false;

    // Colour the strip with the player's token colour — we don't have direct
    // player colour access here, so use the property group colour as a proxy.
    const stripColorHex = square.group
      ? GROUP_COLORS[square.group] ?? '#CCCCCC'
      : '#AAAAAA';

    const mat = new StandardMaterial(`ownerStripMat_${squareIndex}`, this.scene);
    mat.diffuseColor  = hexToColor3(stripColorHex);
    mat.emissiveColor = hexToColor3(stripColorHex).scale(0.4);
    strip.material = mat;

    this.ownerStrips.set(squareIndex, strip);
  }
}
