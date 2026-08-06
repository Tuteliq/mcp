import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Widgets report their version to the MCP host. Reading it from package.json at
// build time keeps that in step with the server, which reads the same field at
// runtime — the two had already drifted eighteen minor versions apart.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

// vite-plugin-singlefile requires single-entry builds.
// The build script runs vite build once per widget using WIDGET env var.
const widget = process.env.WIDGET || 'detection-result';

export default defineConfig({
  define: {
    __TUTELIQ_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react(), viteSingleFile()],
  root: resolve(__dirname, 'ui/widgets'),
  build: {
    outDir: resolve(__dirname, 'dist-ui'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'ui/widgets', `${widget}.html`),
    },
  },
  resolve: {
    alias: {
      '@ui': resolve(__dirname, 'ui/src'),
    },
  },
});
