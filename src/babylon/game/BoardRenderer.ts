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

    // ── Flat-plane geometry ──────────────────────────────────────────────────
    //
    // We use CreateGround (a flat quad lying in the XZ plane) rather than
    // CreateBox for two reasons:
    //
    //  1. No side faces → no coplanar-face Z-fighting between adjacent tiles
    //     (tiles that share an edge would otherwise have their side faces at
    //     exactly the same world position, causing flicker).
    //
    //  2. Corner tiles no longer extend beyond their 20×20 footprint when
    //     rotated, because there is no volume to spill over.
    //
    // Each tile is rendered at 96 % of its allocated width/depth, leaving a
    // 2 % gap on every side that prevents even the top-face edges of adjacent
    // tiles from aligning perfectly.
    const GAP = 0.96;
    const w = t.tileWidth  * GAP;
    const d = t.tileDepth  * GAP;

    const mesh = MeshBuilder.CreateGround(
      `tile_${t.index}`,
      { width: w, height: d, subdivisions: 1 },
      this.scene,
    );

    // y = TILE_Y (from tileLayout) + a tiny lift so the plane never sits flush
    // with the ground and never Z-fights with ground geometry.
    // We add 0.05 on top of the tileLayout y to ensure clearance.
    mesh.position.set(t.position.x, t.position.y + 0.05, t.position.z);
    mesh.rotation.y  = t.rotationY;
    mesh.isPickable  = false;
    mesh.receiveShadows = true;

    // ── DynamicTexture label ─────────────────────────────────────────────────
    const texture = this.buildLabelTexture(t, square, hex);

    // ── StandardMaterial ─────────────────────────────────────────────────────
    const mat = new StandardMaterial(`tileMat_${t.index}`, this.scene);
    mat.diffuseColor   = hexToColor3(hex);
    mat.diffuseTexture = texture;
    mat.emissiveColor  = hexToColor3(hex).scale(0.25);
    // Flat planes are single-sided by default in Babylon; enable back-face
    // culling off so the tile is visible from below too (during camera orbits).
    mat.backFaceCulling = false;
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
    // ── Texture size must match the tile's WORLD aspect ratio ─────────────────
    //
    // Regular tile mesh: width=6.67u, depth=20u  → ratio 1:3
    // Corner  tile mesh: 20u × 20u               → ratio 1:1
    //
    // Mismatching the texture aspect ratio stretches every pixel on one axis
    // (the old 256×128 = 2:1 ratio on a 1:3 mesh caused 6× vertical stretch
    // and blurry text).  Use 128×384 (≈1:3) for regular and 256×256 for corners.
    //
    // generateMipMaps=true  so the GPU uses the correct mip level when the tile
    // is small on screen (camera zoomed out) instead of point-sampling a huge
    // texture into a few pixels.
    const texW = t.isCorner ? 256 : 128;
    const texH = t.isCorner ? 256 : 384;

    const texture = new DynamicTexture(
      `tileTex_${t.index}`,
      { width: texW, height: texH },
      this.scene,
      true, // generateMipMaps — critical for sharpness at distance
    );

    const ctx = texture.getContext() as CanvasRenderingContext2D;
    const textColor = labelTextColor(hex);

    // Background
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, texW, texH);

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, texW - 4, texH - 4);

    // ── Group colour band ──────────────────────────────────────────────────
    // Draw band FIRST so text paints on top of it.
    if (square.group) {
      const bandH = t.isCorner ? 30 : 40; // 40/384 ≈ 2 world units — clearly visible
      ctx.fillStyle = GROUP_COLORS[square.group] ?? hex;
      ctx.fillRect(0, 0, texW, bandH);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, 0, texW, bandH);
    }

    // ── Name ──────────────────────────────────────────────────────────────
    // Font sized so characters are legible in world-space.
    // Regular: 24 px in 128 px width  → ≈19 % of tile width  → ~1.2 world-unit text height
    // Corner : 26 px in 256 px width  → ≈10 % of tile width
    const nameFontSize = t.isCorner ? 26 : 24;
    ctx.fillStyle    = textColor;
    ctx.font         = `bold ${nameFontSize}px Arial`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const lines  = wrapText(ctx, square.name, texW - 12);
    const lineH  = nameFontSize + 6;
    const nameBlockH = lines.length * lineH;

    // Vertically centre the name block within the lower 70 % of the tile
    // (leaving the top 30 % for the colour band area).
    const topReserve = t.isCorner ? 36 : 48;  // reserve for band
    const textAreaH  = texH - topReserve - 30; // 30 px reserved at bottom for price
    let nameY = topReserve + Math.max(8, (textAreaH - nameBlockH) / 2);

    for (const line of lines) {
      ctx.fillText(line, texW / 2, nameY);
      nameY += lineH;
    }

    // ── Price / tax amount ─────────────────────────────────────────────────
    if (square.price !== undefined) {
      const priceFontSize = t.isCorner ? 20 : 18;
      ctx.font         = `${priceFontSize}px Arial`;
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = textColor;
      ctx.fillText(`${square.price} tr`, texW / 2, texH - 6);
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

    // Ownership strip: a flat plane (CreateGround) rendered just above the
    // tile plane so it is never coplanar with the tile.
    // Width: 80 % of tileWidth; depth: 20 % of tileDepth (near outer edge).
    const stripW = t.tileWidth  * 0.80;
    const stripD = t.tileDepth  * 0.20;

    const strip = MeshBuilder.CreateGround(
      `ownerStrip_${squareIndex}`,
      { width: stripW, height: stripD, subdivisions: 1 },
      this.scene,
    );

    // Place strip just above the tile (tile is at tileY + 0.05; strip at + 0.06).
    const stripY = t.position.y + 0.06;

    // Offset strip toward the OUTER edge of the tile in the tile's local space.
    // "Outer" is the -Z direction in local tile space (before rotationY).
    // After applying rotationY the world-space offset becomes:
    //   Δx =  sin(rotY) * outwardLocalZ
    //   Δz =  cos(rotY) * outwardLocalZ
    const outwardLocalZ = -(t.tileDepth / 2 - stripD / 2 - 0.1);
    const cos = Math.cos(t.rotationY);
    const sin = Math.sin(t.rotationY);

    strip.position.set(
      t.position.x + sin * outwardLocalZ,
      stripY,
      t.position.z + cos * outwardLocalZ,
    );
    strip.rotation.y = t.rotationY;
    strip.isPickable = false;

    const stripColorHex = square.group
      ? GROUP_COLORS[square.group] ?? '#CCCCCC'
      : '#AAAAAA';

    const mat = new StandardMaterial(`ownerStripMat_${squareIndex}`, this.scene);
    mat.diffuseColor    = hexToColor3(stripColorHex);
    mat.emissiveColor   = hexToColor3(stripColorHex).scale(0.5);
    mat.backFaceCulling = false;
    strip.material = mat;

    this.ownerStrips.set(squareIndex, strip);
  }
}
