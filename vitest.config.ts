import { defineConfig } from 'vitest/config';

// vite.config.ts is the widget build and sets `root` to ui/widgets, which
// made `vitest run` look for tests there and find none. Unit tests for the
// server live next to the source they cover.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
