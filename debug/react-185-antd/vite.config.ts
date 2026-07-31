import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  plugins: [react()],
  cacheDir: process.env.VITE_CACHE || undefined,
  server: { port: Number(process.env.PORT ?? 5288), host: '127.0.0.1', strictPort: true },
})
