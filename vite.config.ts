import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // `public/` holds MSW's worker for Storybook only; it must not land in the
  // published package.
  publicDir: false,
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    // React and TanStack stay external so consumers keep a single copy.
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@tanstack/react-table',
        '@tanstack/table-core',
        '@tanstack/react-virtual',
        '@tanstack/react-store',
        '@tanstack/store',
      ],
      output: {
        // Must match the `./styles.css` entry in package.json `exports`.
        assetFileNames: (asset) =>
          asset.names?.some((name) => name.endsWith('.css')) ? 'styles.css' : '[name][extname]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    emptyOutDir: true,
  },
})
