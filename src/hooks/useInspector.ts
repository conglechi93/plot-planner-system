import { useState, useCallback } from 'react';
import type { Scene } from '@babylonjs/core';

export function useInspector(getScene: () => Scene | null) {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const toggleInspector = useCallback(() => {
    const scene = getScene();
    if (!scene) return;
    import('@babylonjs/inspector').then(() => {
      if (scene.debugLayer.isVisible()) {
        scene.debugLayer.hide();
        setIsInspectorOpen(false);
      } else {
        const host = document.getElementById('inspector-host') ?? document.body;
        void scene.debugLayer.show({ embedMode: true, globalRoot: host });
        setIsInspectorOpen(true);
      }
    });
  }, [getScene]);

  return { toggleInspector, isInspectorOpen };
}
