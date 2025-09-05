// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  // Output en "build" (como ya lo tenías)
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 2000,
  },

  // ✅ Alias para imports absolutos: '@/...' apunta a 'src'
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  plugins: [tsconfigPaths(), react(), tagger()],

  server: {
    port: "4028",
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: [".amazonaws.com", ".builtwithrocket.new"],
  },
});
