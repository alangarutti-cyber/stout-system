import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuração otimizada para Vercel + React + Supabase
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
    host: true,
  },
});
