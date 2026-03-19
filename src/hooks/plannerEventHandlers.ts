import { Scene, GizmoManager, AbstractMesh } from '@babylonjs/core';
import { SelectionSystem } from '../babylon/interactions/selectionSystem';
import type { PlacementSystem } from '../babylon/interactions/placementSystem';
import type { TransformSystem } from '../babylon/interactions/transformSystem';
import type { HouseInstance } from '../types/HouseInstance';

// ─────────────────────────────────────────────────────────────────
// Pointer handlers
// ─────────────────────────────────────────────────────────────────

interface PointerHandlerDeps {
  scene: Scene;
  ground: AbstractMesh;
  placementSystem: PlacementSystem;
  selectionSystem: SelectionSystem;
  transformSystem: TransformSystem;
  gizmoManager: GizmoManager;
  housesRef: { current: Map<string, HouseInstance> };
  gameModeActiveRef: { current: boolean };
}

export function createPointerHandlers(deps: PointerHandlerDeps) {
  const {
    scene,
    ground,
    placementSystem,
    selectionSystem,
    transformSystem,
    gizmoManager,
    housesRef,
    gameModeActiveRef,
  } = deps;

  function handlePointerMove(evt: PointerEvent): void {
    if (placementSystem.isPlacing) {
      placementSystem.updateGhost(evt.offsetX, evt.offsetY);
    }
  }

  function handlePointerTap(evt: PointerEvent): void {
    if ((evt as MouseEvent).button !== 0) return;
    if (gameModeActiveRef.current) return;

    const pick = scene.pick(evt.offsetX, evt.offsetY);

    // ── Placement mode: chỉ cho đặt xuống ground ──
    if (placementSystem.isPlacing) {
      if (pick.pickedMesh === ground) {
        void placementSystem.placeHouse();
      }
      return;
    }

    const isGizmoHovered = gizmoManager.gizmos.positionGizmo?.isHovered ?? false;

    // ── Không chạm mesh nào ──
    if (!pick.hit || pick.pickedMesh === null) {
      if (!isGizmoHovered) selectionSystem.select(null);
      return;
    }

    // ── Ground click: bỏ chọn (không di chuyển vật) ──
    if (pick.pickedMesh === ground) {
      selectionSystem.select(null);
      return;
    }

    // ── Gizmo handle: để gizmo tự xử lý ──
    if (isGizmoHovered) return;

    // ── House click: select ──
    const houseId = SelectionSystem.getHouseIdFromMesh(pick.pickedMesh);
    if (houseId) {
      const house = housesRef.current.get(houseId);
      if (house) {
        selectionSystem.select(house);
        return;
      }
    }

    selectionSystem.select(null);
  }

  return { handlePointerMove, handlePointerTap };
}

// ─────────────────────────────────────────────────────────────────
// Keyboard handler
// ─────────────────────────────────────────────────────────────────

interface KeyboardHandlerDeps {
  placementSystem: PlacementSystem;
  selectionSystem: SelectionSystem;
  transformSystem: TransformSystem;
  setIsPlacing: (v: boolean) => void;
  setStatus: (v: string) => void;
}

export function createKeyboardHandler(deps: KeyboardHandlerDeps) {
  const { placementSystem, selectionSystem, transformSystem, setIsPlacing, setStatus } = deps;

  return function handleKeyDown(e: KeyboardEvent): void {
    const selected = selectionSystem.getSelected();

    switch (e.key) {
      case 'r':
      case 'R':
        if (selected) {
          transformSystem.rotateHouse(selected);
          setStatus('Rotated 90°');
        }
        break;

      case 'Delete':
      case 'Backspace':
        if (selected) {
          transformSystem.deleteHouse(selected);
        }
        break;

      case 'Escape':
        if (placementSystem.isPlacing) {
          placementSystem.cancelPlacement();
          setIsPlacing(false);
          setStatus('Placement cancelled.');
        } else {
          selectionSystem.select(null);
        }
        break;
    }
  };
}
