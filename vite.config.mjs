// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tagger from "@dhiwise/component-tagger";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname en ESM:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    // ⚠️ Si despliegas en Vercel y NO cambiaste el "Output Directory",
    // déjalo en "dist" (valor por defecto que Vercel espera).
    // Si prefieres "build", recuerda ajustar el Output Directory en Vercel.
    outDir: "dist",
    chunkSizeWarningLimit: 2000,
  },

  // Alias '@/...' -> 'src'
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  plugins: [tsconfigPaths(), react(), tagger()],

  server: {
    port: 4028,
    host: "0.0.0.0",
    strictPort: true,
    // Usa RegExp si quieres permitir subdominios:
    allowedHosts: [/\.amazonaws\.com$/, /\.builtwithrocket\.new$/],
  },
});
