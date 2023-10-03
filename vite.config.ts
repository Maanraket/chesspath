import { defineConfig } from "vite";

export default defineConfig({
  plugins: [],

  build: {
    // old browsers
    target: "es2015", 
    outDir: "dist",
    assetsDir: "assets",
    manifest: true,
    rollupOptions: {
      input: {
        index: "index.html",
      },
    },
    assetsInlineLimit: 0,
  }
});