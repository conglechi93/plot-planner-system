import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  DirectionalLight,
  Color3,
  Color4,
  SceneLoader,
  AbstractMesh,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

// path → data URL (persists for the whole session)
const cache   = new Map<string, string>();
// path → in-flight promise (prevents duplicate loads)
const pending = new Map<string, Promise<string>>();

// ── Concurrency limiter ──────────────────────────────────────────────────────
// At most 2 Babylon engines run simultaneously to avoid thrashing the GPU.
const MAX_CONCURRENT = 2;
let running = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => { running++; resolve(); });
  });
}

function releaseSlot(): void {
  running--;
  if (waitQueue.length > 0) waitQueue.shift()!();
}

/** Returns cached thumbnail data URL instantly, or null if not generated yet. */
export function getCachedThumbnail(path: string): string | null {
  return cache.get(path) ?? null;
}

/**
 * Returns a promise that resolves to a PNG data URL for the given GLB path.
 * Loads the model once, renders a few frames, captures the canvas, then
 * disposes the engine — subsequent calls for the same path return immediately
 * from cache.
 */
export function getThumbnail(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit) return Promise.resolve(hit);

  const inFlight = pending.get(path);
  if (inFlight) return inFlight;

  const promise = generateThumbnail(path)
    .then((dataUrl) => {
      cache.set(path, dataUrl);
      pending.delete(path);
      return dataUrl;
    })
    .catch((err) => {
      pending.delete(path);
      throw err;
    });

  pending.set(path, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────

async function generateThumbnail(path: string): Promise<string> {
  // Create a tiny hidden canvas – not appended to DOM so no layout impact
  const canvas = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 256;

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: false,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.09, 0.10, 0.17, 1);
  // Ambient color ensures PBR materials are never fully black even without IBL
  scene.ambientColor = new Color3(0.25, 0.25, 0.25);

  const camera = new ArcRotateCamera(
    'thumbCam',
    -Math.PI / 3,
    Math.PI / 3.2,
    6,
    Vector3.Zero(),
    scene,
  );

  // Hemisphere (sky + ground bounce) gives overall fill
  const hemi = new HemisphericLight('thumbHemi', new Vector3(0, 1, 0.4), scene);
  hemi.intensity    = 1.1;
  hemi.groundColor  = new Color3(0.4, 0.4, 0.4); // soften dark underside

  // Directional key-light from upper-front-left for shape definition
  const dir = new DirectionalLight('thumbDir', new Vector3(-1, -2, -1).normalize(), scene);
  dir.intensity = 0.7;

  try {
    await acquireSlot();
    // Scene tạm → load trực tiếp, không cần cache container
    const container = await SceneLoader.LoadAssetContainerAsync(path, '', scene);
    const entries   = container.instantiateModelsToScene();
    const root      = entries.rootNodes[0] as AbstractMesh;

    // Slight rotation for a 3/4 view
    root.rotation.y = -Math.PI / 6;

    // Center & auto-fit camera to model bounds
    const bounds = root.getHierarchyBoundingVectors(true);
    const center = bounds.min.add(bounds.max).scale(0.5);
    root.position.subtractInPlace(center);
    root.position.y -= bounds.min.y; // sit on ground

    const size = bounds.max.subtract(bounds.min).length();
    camera.radius = Math.max(size * 0.85, 1.5);
    camera.target = Vector3.Zero();

    // Wait until ALL textures and shaders are compiled before capturing.
    // This is the key fix for black/missing-texture thumbnails.
    await scene.whenReadyAsync();

    // A couple of extra frames to let the GPU finish uploading textures
    scene.render();
    scene.render();

    return canvas.toDataURL('image/png');
  } finally {
    releaseSlot();
    scene.dispose();
    engine.dispose();
  }
}
