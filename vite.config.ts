import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Plugin tự động quét thư mục public/models/ và sinh ra manifest.json.
 * Manifest có dạng: { "house": ["/models/house/foo.glb", ...], ... }
 * Chạy lúc khởi động dev server và mỗi khi thư mục thay đổi.
 *
 * Dùng process.cwd() thay __dirname vì project có "type": "module" (ESM).
 */
function modelsManifestPlugin(): Plugin {
  // process.cwd() = thư mục gốc project, không phụ thuộc __dirname / ESM
  const modelsDir = path.resolve(process.cwd(), 'public/models');

  function generate() {
    try {
      if (!fs.existsSync(modelsDir)) return;

      const manifest: Record<string, string[]> = {};
      const entries = fs.readdirSync(modelsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(modelsDir, entry.name);
        const files = fs
          .readdirSync(dir)
          .filter((f: string) => /\.(glb|gltf)$/i.test(f))
          .sort()
          .map((f: string) => `/models/${entry.name}/${f}`);
        manifest[entry.name] = files;
      }

      fs.writeFileSync(
        path.join(modelsDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      console.log('[models-manifest] Generated:', Object.keys(manifest).join(', ') || '(empty)');
    } catch (err) {
      console.error('[models-manifest] Error:', err);
    }
  }

  return {
    name: 'models-manifest',
    buildStart: generate,
    configureServer(server) {
      generate();
      server.watcher.add(modelsDir);
      server.watcher.on('all', (_event: string, filePath: string) => {
        if (
          filePath.startsWith(modelsDir) &&
          !filePath.endsWith('manifest.json') &&
          !filePath.includes('.DS_Store')
        ) {
          generate();
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), modelsManifestPlugin()],
  server: {
    open: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          babylonjs: ['@babylonjs/core', '@babylonjs/loaders'],
        },
      },
    },
  },
});
