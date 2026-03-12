import { useEffect, useRef, useState, useCallback } from 'react';
import { PointerEventTypes, Mesh, Vector3 } from '@babylonjs/core';
import { createSceneSetup } from '../babylon/scenes/sceneFactory';
import { SelectionSystem } from '../babylon/interactions/selectionSystem';
import { createModelInstance } from '../babylon/meshCreators/houseLoader';
import type { HouseInstance, LayoutData } from '../types/HouseInstance';
import type { ModelEntry } from '../types/ModelEntry';
import { toDegrees, toRadians } from '../utils/math';
import { useInspector } from './useInspector';

export type GizmoMode = 'position' | 'rotation' | 'scale' | null;

export interface PlannerControls {
  startPlacement: (model: ModelEntry) => void;
  cancelPlacement: () => void;
  isPlacing: boolean;
  houseCount: number;
  exportLayout: () => LayoutData;
  importLayout: (file: File) => Promise<void>;
  status: string;
  isPickerOpen: boolean;
  openPicker: (callback: (model: ModelEntry) => void) => void;
  closePicker: () => void;
  pickerCallback: React.MutableRefObject<((model: ModelEntry) => void) | null>;
  gizmoMode: GizmoMode;
  setGizmoMode: (mode: GizmoMode) => void;
  toggleInspector: () => void;
  isInspectorOpen: boolean;
  /** Returns the current Babylon Scene (null before scene is initialised). */
  getScene: () => import('@babylonjs/core').Scene | null;
}

interface UsePlannerOptions {
  onSelectChange: (house: HouseInstance | null) => void;
  /** When true, pointer events (select, place, move) are suppressed so the game overlay can handle them. */
  gameModeActive?: boolean;
}

export function usePlanner(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options: UsePlannerOptions
): PlannerControls {
  // ── Babylon refs (survive re-renders without triggering them) ──
  const sceneRef      = useRef<ReturnType<typeof createSceneSetup> | null>(null);
  const housesRef     = useRef<Map<string, HouseInstance>>(new Map());
  /** Tracks game-mode flag without re-render; read in pointer-event closure. */
  const gameModeActiveRef = useRef(options.gameModeActive ?? false);

  // Keep latest callback in a ref to avoid stale closures in effects
  const onSelectChangeRef = useRef(options.onSelectChange);
  useEffect(() => {
    onSelectChangeRef.current = options.onSelectChange;
  }, [options.onSelectChange]);

  // Keep gameModeActiveRef in sync with prop without re-creating the scene effect
  useEffect(() => {
    gameModeActiveRef.current = options.gameModeActive ?? false;
  }, [options.gameModeActive]);

  // ── React state (drives UI re-renders) ──
  const [isPlacing, setIsPlacing]       = useState(false);
  const [houseCount, setHouseCount]     = useState(0);
  const [status, setStatus]             = useState('Click "Add Model" to start placing');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [gizmoMode, setGizmoModeState]  = useState<GizmoMode>('position');

  const { toggleInspector, isInspectorOpen } = useInspector(
    () => sceneRef.current?.scene ?? null
  );

  // Picker callback stored in ref so it is always current
  const pickerCallback = useRef<((model: ModelEntry) => void) | null>(null);

  const openPicker = useCallback((cb: (model: ModelEntry) => void) => {
    pickerCallback.current = cb;
    setIsPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const startPlacement = useCallback((model: ModelEntry) => {
    const setup = sceneRef.current;
    if (!setup) return;
    setup.selectionSystem.select(null);
    setup.placementSystem.startPlacement(model);
    setIsPlacing(true);
    setStatus(`Click on the ground to place "${model.name}" (Esc to cancel)`);
  }, []);

  const cancelPlacement = useCallback(() => {
    const setup = sceneRef.current;
    if (!setup) return;
    setup.placementSystem.cancelPlacement();
    setIsPlacing(false);
    setStatus('Placement cancelled.');
  }, []);

  const exportLayout = useCallback((): LayoutData => {
    return {
    houses: Array.from(housesRef.current.values()).map((house) => ({
        type:     house.type,
        path:     house.path,
        position: {
          x: Math.round(house.mesh.position.x * 100) / 100,
          y: Math.round(house.mesh.position.y * 100) / 100,
          z: Math.round(house.mesh.position.z * 100) / 100,
        },
        rotation: Math.round(toDegrees(house.mesh.rotation.y)),
        scale:    Math.round(house.mesh.scaling.x * 1000) / 1000,
      })),
    };
  }, []);

  const importLayout = useCallback(async (file: File): Promise<void> => {
    const setup = sceneRef.current;
    if (!setup) return;

    try {
      const text = await file.text();
      const layout = JSON.parse(text) as LayoutData;

      if (!layout.houses || layout.houses.length === 0) {
        setStatus('Layout file trống, không có model nào để import.');
        return;
      }

      const withPath = layout.houses.filter((h) => h.path);
      if (withPath.length === 0) {
        setStatus('File layout cũ không có thông tin path – không thể import.');
        return;
      }

      // ── Xóa toàn bộ models hiện tại trước khi load layout mới ──
      setup.selectionSystem.select(null);
      setup.gizmoManager.attachToMesh(null);
      for (const house of housesRef.current.values()) {
        house.mesh.getChildMeshes().forEach((m) => { m.material?.dispose(); m.dispose(); });
        house.mesh.material?.dispose();
        house.mesh.dispose();
      }
      housesRef.current.clear();
      setHouseCount(0);

      setStatus(`Đang import ${withPath.length} model…`);

      for (const entry of withPath) {
        const position = new Vector3(entry.position.x, entry.position.y, entry.position.z);
        const instance = await createModelInstance(setup.scene, entry.path!, entry.type, position);
        instance.mesh.rotation.y = toRadians(entry.rotation);
        instance.rotation        = instance.mesh.rotation;
        const s = entry.scale ?? 1;
        instance.mesh.scaling.setAll(s);

        [instance.mesh, ...instance.mesh.getChildMeshes()].forEach((m) => {
          setup.shadowGen.addShadowCaster(m);
        });

        housesRef.current.set(instance.id, instance);
      }

      setHouseCount(housesRef.current.size);
      setStatus(`✓ Imported ${withPath.length} model(s). Total: ${housesRef.current.size}`);
    } catch (err) {
      console.error('[PlotPlanner] Import failed:', err);
      setStatus('Import thất bại – file JSON không hợp lệ.');
    }
  }, []);

  const setGizmoMode = useCallback((mode: GizmoMode) => {
    const setup = sceneRef.current;
    if (!setup) return;
    const { gizmoManager, selectionSystem } = setup;

    gizmoManager.positionGizmoEnabled     = mode === 'position';
    gizmoManager.rotationGizmoEnabled     = mode === 'rotation';
    gizmoManager.scaleGizmoEnabled        = mode === 'scale';
    gizmoManager.boundingBoxGizmoEnabled  = false;
    setGizmoModeState(mode);

    // Re-attach to currently selected mesh
    const selected = selectionSystem.getSelected();
    if (selected && mode !== null) {
      gizmoManager.attachToMesh(null);
      gizmoManager.attachToMesh(selected.mesh);
    } else {
      gizmoManager.attachToMesh(null);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = createSceneSetup(canvas);
    sceneRef.current = setup;

    const { engine, scene, shadowGen, selectionSystem, transformSystem, placementSystem, gizmoManager, ground } = setup;

    // ── System callbacks ──

    placementSystem.onPlaced((house) => {
      housesRef.current.set(house.id, house);
      [house.mesh, ...house.mesh.getChildMeshes()].forEach((m) => {
        shadowGen.addShadowCaster(m);
      });
      setIsPlacing(false);
      setHouseCount(housesRef.current.size);
      setStatus(`House placed! Total: ${housesRef.current.size}. Click a house to select it.`);
    });

    transformSystem.onDelete((id) => {
      housesRef.current.delete(id);
      selectionSystem.select(null);
      gizmoManager.attachToMesh(null);
      setHouseCount(housesRef.current.size);
      setStatus(`House deleted. Remaining: ${housesRef.current.size}`);
    });

    selectionSystem.onChange((house) => {
      onSelectChangeRef.current(house);
      if (house) {
        // Gắn gizmo vào root mesh
        if (house.mesh instanceof Mesh) {
          gizmoManager.attachToMesh(house.mesh);
        } else {
          // Fallback: body mesh cho procedural house
          const bodyMesh = house.mesh.getChildMeshes(false, (m) => m.name.includes('body'))[0];
          if (bodyMesh instanceof Mesh) gizmoManager.attachToMesh(bodyMesh);
        }
        setStatus(`Selected: ${house.type} | [R] Rotate | [Del] Delete | Click ground to move`);
      } else {
        gizmoManager.attachToMesh(null);
        setStatus('Click a house to select it, or add a new one.');
      }
    });

    // ── Pointer events ──
    scene.onPointerObservable.add((pointerInfo) => {
      const evt = pointerInfo.event as PointerEvent;

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        if (placementSystem.isPlacing) {
          placementSystem.updateGhost(evt.offsetX, evt.offsetY);
        }
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERTAP) {
        if ((evt as MouseEvent).button !== 0) return;
        // Suppress planner interactions while the game overlay is active
        if (gameModeActiveRef.current) return;

        const posGizmo = gizmoManager.gizmos.positionGizmo;
        if (posGizmo?.isHovered) return;

        const pick = scene.pick(evt.offsetX, evt.offsetY);

        if (placementSystem.isPlacing) {
          if (pick.pickedMesh === ground) {
            void placementSystem.placeHouse();
          }
          return;
        }

        if (!pick.hit || pick.pickedMesh === null) {
          selectionSystem.select(null);
          return;
        }

        if (pick.pickedMesh === ground) {
          const selected = selectionSystem.getSelected();
          if (selected && pick.pickedPoint) {
            transformSystem.moveHouse(selected, pick.pickedPoint);
          } else {
            selectionSystem.select(null);
          }
          return;
        }

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
    });

    // ── Keyboard events ──
    const handleKeyDown = (e: KeyboardEvent) => {
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

    window.addEventListener('keydown', handleKeyDown);

    // ── Render loop ──
    engine.runRenderLoop(() => {
      scene.render();
    });

    // ── Resize ──
    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    // ── Cleanup ──
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      engine.dispose();
      sceneRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    startPlacement,
    cancelPlacement,
    isPlacing,
    houseCount,
    exportLayout,
    importLayout,
    status,
    isPickerOpen,
    openPicker,
    closePicker,
    pickerCallback,
    gizmoMode,
    setGizmoMode,
    toggleInspector,
    isInspectorOpen,
    getScene: () => sceneRef.current?.scene ?? null,
  };
}
