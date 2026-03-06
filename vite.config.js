import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  // Garante compatibilidade no Vercel e localmente
  base: process.env.VERCEL ? "/" : "./",

  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    port: 3000,
    host: true,
    strictPort: false, // ✅ permite mudar automaticamente se a porta 3000 estiver em uso
  },

  preview: {
    port: 3000,
    host: true,
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
