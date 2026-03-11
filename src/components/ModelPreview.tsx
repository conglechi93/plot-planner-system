import { useEffect, useRef, useState } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Color4,
  AbstractMesh,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

interface Props {
  path: string | null;
}

export function ModelPreview({ path }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<Engine | null>(null);
  const sceneRef   = useRef<Scene | null>(null);
  const meshRef    = useRef<AbstractMesh | null>(null);
  const cameraRef  = useRef<ArcRotateCamera | null>(null);
  const loadingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  // ── Init engine once on mount ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: false });
    engineRef.current = engine;

    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.09, 0.10, 0.17, 1);
    sceneRef.current = scene;

    const camera = new ArcRotateCamera('pvCam', -Math.PI / 3, Math.PI / 3.2, 6, Vector3.Zero(), scene);
    camera.lowerRadiusLimit = 0.5;
    cameraRef.current = camera;

    const light = new HemisphericLight('pvLight', new Vector3(0, 1, 0.4), scene);
    light.intensity = 1.4;

    engine.runRenderLoop(() => {
      // Auto-rotate model
      if (meshRef.current) meshRef.current.rotation.y += 0.012;
      scene.render();
    });

    return () => {
      scene.dispose();
      engine.dispose();
      engineRef.current = null;
      sceneRef.current  = null;
    };
  }, []);

  // ── Load / swap model when path changes ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Dispose previous mesh
    if (meshRef.current) {
      meshRef.current.getChildMeshes().forEach((m) => { m.material?.dispose(); m.dispose(); });
      meshRef.current.material?.dispose();
      meshRef.current.dispose();
      meshRef.current = null;
    }

    if (!path) {
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);
    loadingRef.current = true;

    SceneLoader.ImportMeshAsync('', path, '', scene)
      .then((result) => {
        if (!loadingRef.current) {
          result.meshes.forEach((m) => { m.material?.dispose(); m.dispose(); });
          return;
        }

        const root = result.meshes[0];
        root.rotation.y = 0;

        // Center & auto-fit camera
        const bounds = root.getHierarchyBoundingVectors(true);
        const center = bounds.min.add(bounds.max).scale(0.5);
        root.position.subtractInPlace(center);
        root.position.y -= bounds.min.y; // sit on ground

        const size = bounds.max.subtract(bounds.min).length();
        if (cameraRef.current) {
          cameraRef.current.radius = Math.max(size * 0.85, 1.5);
          cameraRef.current.target = Vector3.Zero();
        }

        meshRef.current = root;
      })
      .catch(() => setError(true))
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });

    return () => {
      loadingRef.current = false;
    };
  }, [path]);

  return (
    <div className="mp-preview-pane">
      <canvas ref={canvasRef} className="mp-preview-canvas" />
      {loading && (
        <div className="mp-preview-overlay">
          <span className="mp-preview-spinner">⏳ Loading…</span>
        </div>
      )}
      {!path && !loading && (
        <div className="mp-preview-overlay">
          <span className="mp-preview-hint">Hover a card<br/>to preview</span>
        </div>
      )}
      {error && !loading && (
        <div className="mp-preview-overlay">
          <span className="mp-preview-hint">⚠️ Preview<br/>unavailable</span>
        </div>
      )}
    </div>
  );
}
