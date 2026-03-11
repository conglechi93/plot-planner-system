import { Vector3 } from '@babylonjs/core';
import type { HouseInstance } from '../../types/HouseInstance';
import { snap } from '../../utils/math';

/** Kích thước ô lưới snap (đơn vị: mét) */
const GRID_SIZE = 1;

type DeleteCallback = (id: string) => void;

/**
 * TransformSystem xử lý 3 thao tác biến đổi trên HouseInstance đã được chọn:
 *  - moveHouse   : Di chuyển nhà đến vị trí mới (snap lưới 1m)
 *  - rotateHouse : Xoay nhà 90° quanh trục Y
 *  - deleteHouse : Xóa nhà khỏi scene và giải phóng bộ nhớ
 */
export class TransformSystem {
  private deleteCallbacks: DeleteCallback[] = [];

  /**
   * Di chuyển nhà đến vị trí worldPosition (đã snap lưới).
   * Y luôn = 0 để nhà đứng trên mặt đất.
   */
  moveHouse(house: HouseInstance, worldPosition: Vector3): void {
    const snappedX = snap(worldPosition.x, GRID_SIZE);
    const snappedZ = snap(worldPosition.z, GRID_SIZE);

    house.mesh.position.set(snappedX, 0, snappedZ);

    // Đồng bộ lại tham chiếu position trong HouseInstance
    house.position = house.mesh.position;
  }

  /**
   * Xoay nhà thêm 90° (π/2 radian) quanh trục Y.
   * Phím tắt: R
   */
  rotateHouse(house: HouseInstance): void {
    house.mesh.rotation.y += Math.PI / 2;

    // Đồng bộ lại rotation
    house.rotation = house.mesh.rotation;
  }

  /**
   * Xóa ngôi nhà khỏi scene.
   * - Dispose toàn bộ child meshes và materials
   * - Dispose root mesh
   * - Gọi các onDelete callbacks để state bên ngoài cập nhật
   *
   * Phím tắt: Delete / Backspace
   */
  deleteHouse(house: HouseInstance): void {
    // Dispose materials của children
    house.mesh.getChildMeshes().forEach((child) => {
      child.material?.dispose();
      child.dispose();
    });

    // Dispose material của root (nếu có)
    house.mesh.material?.dispose();
    house.mesh.dispose();

    // Thông báo để xóa khỏi Map lưu trữ
    this.deleteCallbacks.forEach((cb) => cb(house.id));
  }

  /** Đăng ký callback được gọi sau khi một nhà bị xóa */
  onDelete(callback: DeleteCallback): void {
    this.deleteCallbacks.push(callback);
  }
}
