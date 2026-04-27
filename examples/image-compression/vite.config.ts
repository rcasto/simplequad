import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      simplequad: resolve(__dirname, "../../src/index.ts"),
    },
  },
});
