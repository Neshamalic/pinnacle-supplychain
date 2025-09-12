// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import path from "node:path";

export default defineConfig({
  build: {
    outDir: "dist",              // <- importante: dist
    chunkSizeWarningLimit: 2000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  plugins: [tsconfigPaths(), react(), tagger()],
  server: {
    port: "4028",
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: [".amazonaws.com", ".builtwithrocket.new"],
  },
});
