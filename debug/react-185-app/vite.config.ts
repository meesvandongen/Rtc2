import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves the harness from the repo root so it imports `src/` directly — the
 * same code the library ships, with no Storybook in the way.
 */
export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  plugins: [react()],
  server: { port: 5255, host: '127.0.0.1', strictPort: true },
})
