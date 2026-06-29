import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';

/** Vite plugin: copy static extension assets (icons, manifest) into outDir after build */
function copyExtensionAssets(): import('vite').Plugin {
  return {
    name: 'copy-extension-assets',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'extension/dist');
      const iconsOut = resolve(outDir, 'icons');
      mkdirSync(iconsOut, { recursive: true });
      const iconsDir = resolve(process.cwd(), 'extension/icons');
      for (const file of readdirSync(iconsDir)) {
        if (file.endsWith('.png')) {
          copyFileSync(resolve(iconsDir, file), resolve(iconsOut, file));
        }
      }
    },
  };
}

export default defineConfig({
  // Use relative asset paths for Chrome/Edge extension pages
  base: './',
  plugins: [copyExtensionAssets()],

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
