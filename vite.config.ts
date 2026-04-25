import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'SimpleQuad',
      fileName: (format) => `simplequad.${format === 'es' ? 'esm' : format}.js`,
      formats: ['es', 'umd'],
    },
  },
  test: {
    testTimeout: 120000,
  },
});
