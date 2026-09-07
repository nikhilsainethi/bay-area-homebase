import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/bay-area-homebase/',
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  define: { 'import.meta.env.VITE_STATIC_MODE': JSON.stringify('true') },
  build: { outDir: 'dist-pages', emptyOutDir: true },
});
