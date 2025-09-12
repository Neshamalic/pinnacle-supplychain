// vite.config.mjs
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  },
  build: {
    outDir: "dist",                 // <-- que coincida con vercel.json
    chunkSizeWarningLimit: 2000
  }
});
