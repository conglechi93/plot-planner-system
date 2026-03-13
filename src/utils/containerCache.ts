import { Scene, SceneLoader, AssetContainer } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
// Register the native .babylon loader (needed when loading from external URLs)
import '@babylonjs/loaders';

/**
 * Per-scene AssetContainer cache.
 *
 * WeakMap keyed by Scene so entries are automatically eligible for GC
 * when a scene is disposed — no manual cleanup needed.
 *
 * Storing Promise<AssetContainer> (not AssetContainer) prevents duplicate
 * in-flight requests for the same path.
 */
const cache = new WeakMap<Scene, Map<string, Promise<AssetContainer>>>();

/**
 * Returns a shared AssetContainer for the given (scene, path) pair.
 * The first call loads the GLB; subsequent calls return the same Promise.
 * On load failure the entry is evicted so the next call retries.
 */
export function getContainer(scene: Scene, path: string): Promise<AssetContainer> {
  let byScene = cache.get(scene);
  if (!byScene) {
    byScene = new Map();
    cache.set(scene, byScene);
  }

  const existing = byScene.get(path);
  if (existing) return existing;

  const promise = SceneLoader
    .LoadAssetContainerAsync(path, '', scene)
    .then((container) => {
      // Một số loader (đặc biệt .babylon format) có thể thêm mesh vào scene
      // trong quá trình parse trước khi trả về container.
      // removeAllFromScene() đảm bảo container ở trạng thái "chỉ trong bộ nhớ",
      // chưa xuất hiện trong scene cho đến khi ta gọi instantiateModelsToScene.
      container.removeAllFromScene();
      return container;
    })
    .catch((err) => {
      byScene!.delete(path); // evict so the next attempt can retry
      throw err;
    });

  byScene.set(path, promise);
  return promise;
}
