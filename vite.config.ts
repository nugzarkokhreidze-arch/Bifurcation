import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },

  server: {
    port: 5173,
    host: '0.0.0.0',
  },

  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
});
