import type { AbstractMesh, Vector3 } from '@babylonjs/core';

/**
 * Đại diện cho một ngôi nhà đã được đặt trong scene.
 */
export interface HouseInstance {
  /** ID duy nhất sinh tự động */
  id: string;
  /** Mesh gốc (root) của ngôi nhà trong Babylon scene */
  mesh: AbstractMesh;
  /** Tên model (e.g. 'Charmander House', 'Oak Tree') */
  type: string;
  /** URL path tới file GLB (dùng để import lại layout) */
  path?: string;
  /** Tham chiếu position (sync với mesh.position) */
  position: Vector3;
  /** Tham chiếu rotation (sync với mesh.rotation) */
  rotation: Vector3;
}

/**
 * Cấu trúc JSON khi export bố cục mặt bằng.
 */
export interface LayoutData {
  houses: Array<{
    type: string;
    /** URL path tới GLB – cần thiết để import lại */
    path?: string;
    position: { x: number; y: number; z: number };
    /** Góc xoay quanh trục Y, tính bằng độ (degrees) */
    rotation: number;
  }>;
}
