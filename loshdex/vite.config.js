import { defineConfig } from "vite";

export default defineConfig({
  base: "./", // important if you deploy under a subpath
  build: {
    outDir: "dist", // default
  },
});
