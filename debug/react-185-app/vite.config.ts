import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves the harness from the repo root so it imports `src/` directly — the
 * same code the library ships, with no Storybook in the way.
 *
 * `PORT` and `VITE_CACHE` are honoured so two arms of an A/B can each get their
 * own server and their own dependency cache. Sharing either one silently serves
 * a stale bundle, which invalidated three comparisons before this was added.
 */
export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  plugins: [react()],
  cacheDir: process.env.VITE_CACHE || undefined,
  server: { port: Number(process.env.PORT ?? 5255), host: '127.0.0.1', strictPort: true },
})
