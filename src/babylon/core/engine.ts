import { Engine } from '@babylonjs/core';

/**
 * Creates a Babylon Engine from a canvas element.
 * Enables stencil buffer (required for HighlightLayer) and antialiasing.
 */
export function createEngine(canvas: HTMLCanvasElement): Engine {
  return new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });
}
