import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "idb-refined": path.resolve(__dirname, "../dist/index.js"),
    },
  },
  server: {
    open: true,
  },
});
