import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Garante que o build funcione tanto local quanto no Vercel
  base: process.env.VERCEL ? "/" : "./",
  
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 3000,
    host: true,
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
