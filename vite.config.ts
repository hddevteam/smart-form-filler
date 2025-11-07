import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  // Use relative asset paths for Chrome/Edge extension pages
  base: './',
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
    // Build into extension/dist so manifest can reference built files
    outDir: resolve(process.cwd(), 'extension/dist'),
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: resolve(process.cwd(), 'extension/popup_ts.html'),
        background: resolve(process.cwd(), 'src/extension/background.ts'),
        content: resolve(process.cwd(), 'src/extension/content.ts'),
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
