import { defineConfig } from "vite";
// import { resolve } from 'pathx';

// Resolves 'simplequad' directly to the local TypeScript source so the
// 3.1.0 extractor API is available without a prior build step.
// To test against the published npm package instead, remove this alias
// and add "simplequad": "^3.0.0" (or "file:../../simplequad-3.0.0.tgz")
// to package.json dependencies.
export default defineConfig({
  base: "./",
  // resolve: {
  //     alias: {
  //         simplequad: resolve(__dirname, '../../src/index.ts'),
  //     },
  // },
});
