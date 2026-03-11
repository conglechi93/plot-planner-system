import { Scene, Color4, GizmoManager, Mesh, ShadowGenerator } from '@babylonjs/core';
import { Engine } from '@babylonjs/core';
import { createEngine } from '../core/engine';
import { createCamera } from '../core/camera';
import { setupLighting } from '../core/lighting';
import { createGround } from '../meshCreators/ground';
import { SelectionSystem } from '../interactions/selectionSystem';
import { TransformSystem } from '../interactions/transformSystem';
import { PlacementSystem } from '../interactions/placementSystem';

export interface SceneSetup {
  engine: Engine;
  scene: Scene;
  ground: Mesh;
  shadowGen: ShadowGenerator;
  selectionSystem: SelectionSystem;
  transformSystem: TransformSystem;
  placementSystem: PlacementSystem;
  gizmoManager: GizmoManager;
}

/**
 * Wires all scene components together and returns typed handles.
 * Called once on mount from usePlanner hook.
 */
export function createSceneSetup(canvas: HTMLCanvasElement): SceneSetup {
  const engine = createEngine(canvas);
  const scene = new Scene(engine);

  // Sky blue background
  scene.clearColor = new Color4(0.44, 0.70, 0.92, 1.0);

  createCamera(scene, canvas);
  const { shadowGen } = setupLighting(scene);
  const ground = createGround(scene);

  const selectionSystem = new SelectionSystem(scene);
  const transformSystem = new TransformSystem();
  const placementSystem = new PlacementSystem(scene, ground);

  // GizmoManager – position arrows only; rotation handled by R key
  const gizmoManager = new GizmoManager(scene);
  gizmoManager.positionGizmoEnabled = true;
  gizmoManager.rotationGizmoEnabled = false;
  gizmoManager.scaleGizmoEnabled = false;
  gizmoManager.boundingBoxGizmoEnabled = false;
  gizmoManager.usePointerToAttachGizmos = false;

  return {
    engine,
    scene,
    ground,
    shadowGen,
    selectionSystem,
    transformSystem,
    placementSystem,
    gizmoManager,
  };
}
