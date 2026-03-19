import { Material, Texture, Vector3 } from '@babylonjs/core';
import type { HouseInstance } from '../../types/HouseInstance';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TextureSnapshot {
  uScale: number;
  vScale: number;
}

interface HouseUVSnapshot {
  /** pivot.scaling tại thời điểm snapshot */
  pivotScale: Vector3;
  /** mesh.uniqueId → texture.uniqueId → UV gốc */
  meshTextures: Map<number, Map<number, TextureSnapshot>>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

/** houseId → snapshot */
const store = new Map<string, HouseUVSnapshot>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lấy tất cả Texture 2D có thể điều chỉnh uScale/vScale từ một material.
 *
 * Dùng mat.getActiveTextures() thay vì check PBRMaterial cụ thể:
 * - Hoạt động với mọi loại: PBRMaterial, StandardMaterial,
 *   PBRMetallicRoughnessMaterial, MultiMaterial (.babylon format), v.v.
 * - MultiMaterial tự động trả về textures của tất cả sub-materials.
 * - Lọc instanceof Texture (2D) để bỏ qua CubeTexture / RenderTargetTexture
 *   vì chúng không dùng uScale/vScale theo nghĩa tiling.
 */
function getScalableTextures(mat: Material): Texture[] {
  return mat
    .getActiveTextures()
    .filter((t): t is Texture => t instanceof Texture);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Ghi lại uScale/vScale gốc của tất cả texture trong house.
 * Gọi ngay sau khi đặt (placement) hoặc import – trước khi user thao tác scale.
 */
export function snapshotUVForHouse(house: HouseInstance): void {
  const meshTextures = new Map<number, Map<number, TextureSnapshot>>();

  for (const m of house.mesh.getChildMeshes(false)) {
    if (!m.material) continue;

    const textures = getScalableTextures(m.material);
    if (textures.length === 0) continue;

    const texMap = new Map<number, TextureSnapshot>();
    for (const tex of textures) {
      texMap.set(tex.uniqueId, { uScale: tex.uScale, vScale: tex.vScale });
    }
    meshTextures.set(m.uniqueId, texMap);
  }

  store.set(house.id, {
    pivotScale: house.mesh.scaling.clone(),
    meshTextures,
  });
}

/**
 * Tính lại uScale/vScale theo tỉ lệ thay đổi scale so với lúc snapshot.
 * Gọi sau mỗi lần drag-end của Scale Gizmo.
 *
 * Công thức:
 *   tex.uScale = origU × (currentScaleX / snapshotScaleX)
 *   tex.vScale = origV × (currentScaleY / snapshotScaleY)
 *
 * → texture tile theo đúng mật độ world-space, không bị kéo dãn.
 */
export function recomputeUVForHouse(house: HouseInstance): void {
  const snap = store.get(house.id);
  if (!snap) return;

  const cur = house.mesh.scaling;
  const ratioX = snap.pivotScale.x !== 0 ? cur.x / snap.pivotScale.x : 1;
  const ratioY = snap.pivotScale.y !== 0 ? cur.y / snap.pivotScale.y : 1;

  for (const m of house.mesh.getChildMeshes(false)) {
    if (!m.material) continue;

    const texMap = snap.meshTextures.get(m.uniqueId);
    if (!texMap) continue;

    for (const tex of getScalableTextures(m.material)) {
      const orig = texMap.get(tex.uniqueId);
      if (!orig) continue;

      tex.uScale = orig.uScale * ratioX;
      tex.vScale = orig.vScale * ratioY;
    }
  }
}

/**
 * Xoá snapshot khi house bị delete – tránh memory leak.
 */
export function clearUVSnapshot(houseId: string): void {
  store.delete(houseId);
}
