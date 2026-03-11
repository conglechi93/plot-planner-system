import { Scene, HighlightLayer, AbstractMesh, Mesh, Color3 } from '@babylonjs/core';
import type { HouseInstance } from '../../types/HouseInstance';

type SelectionCallback = (house: HouseInstance | null) => void;

/**
 * SelectionSystem quản lý việc chọn / bỏ chọn nhà trong scene.
 *
 * Khi một nhà được chọn, tất cả mesh con của nó sẽ được tô sáng (highlight)
 * bằng màu vàng thông qua Babylon HighlightLayer.
 */
export class SelectionSystem {
  private readonly highlightLayer: HighlightLayer;
  private selectedHouse: HouseInstance | null = null;
  private callbacks: SelectionCallback[] = [];

  constructor(scene: Scene) {
    // HighlightLayer cần stencil buffer (đã bật trong Engine options)
    this.highlightLayer = new HighlightLayer('selectionHighlight', scene);
    this.highlightLayer.blurHorizontalSize = 0.4;
    this.highlightLayer.blurVerticalSize = 0.4;
  }

  /**
   * Chọn một ngôi nhà (hoặc null để bỏ chọn).
   * Tự động xóa highlight của ngôi nhà cũ và thêm highlight cho ngôi nhà mới.
   */
  select(house: HouseInstance | null): void {
    // Xóa highlight của ngôi nhà đang được chọn
    if (this.selectedHouse) {
      this.clearHighlight(this.selectedHouse.mesh);
    }

    this.selectedHouse = house;

    // Thêm highlight cho ngôi nhà mới
    if (house) {
      this.applyHighlight(house.mesh, Color3.Yellow());
    }

    // Thông báo tất cả listeners
    this.callbacks.forEach((cb) => cb(house));
  }

  /** Lấy ngôi nhà đang được chọn */
  getSelected(): HouseInstance | null {
    return this.selectedHouse;
  }

  /** Đăng ký callback khi selection thay đổi */
  onChange(callback: SelectionCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Tìm houseId từ một mesh được click.
   * Vì tất cả children đều được tag houseId trong metadata,
   * chỉ cần đọc mesh.metadata.houseId.
   * Nếu không có, traverse lên parent để tìm.
   */
  static getHouseIdFromMesh(mesh: AbstractMesh): string | null {
    let current: AbstractMesh | null = mesh;

    while (current) {
      const houseId = current.metadata?.houseId as string | undefined;
      if (houseId) return houseId;

      // Traverse lên parent (nếu parent là AbstractMesh)
      current =
        current.parent instanceof AbstractMesh ? current.parent : null;
    }

    return null;
  }

  /** Áp dụng highlight lên mesh và tất cả child meshes có geometry */
  private applyHighlight(mesh: AbstractMesh, color: Color3): void {
    const tryAdd = (m: AbstractMesh) => {
      if (m instanceof Mesh && m.getTotalVertices() > 0) {
        this.highlightLayer.addMesh(m, color);
      }
    };
    tryAdd(mesh);
    mesh.getChildMeshes().forEach(tryAdd);
  }

  /** Xóa highlight khỏi mesh và tất cả child meshes */
  private clearHighlight(mesh: AbstractMesh): void {
    const tryRemove = (m: AbstractMesh) => {
      if (m instanceof Mesh) {
        this.highlightLayer.removeMesh(m);
      }
    };
    tryRemove(mesh);
    mesh.getChildMeshes().forEach(tryRemove);
  }
}
