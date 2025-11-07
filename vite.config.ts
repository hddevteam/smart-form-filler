import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
      '@/types': resolve(process.cwd(), './src/types'),
      '@/utils': resolve(process.cwd(), './src/utils'),
      '@/config': resolve(process.cwd(), './src/config'),
      '@/services': resolve(process.cwd(), './src/services'),
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), 'public/popup.html'),
        background: resolve(process.cwd(), 'src/background/index.ts'),
        content: resolve(process.cwd(), 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
  },
});
