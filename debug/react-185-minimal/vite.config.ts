import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: new URL('../..', import.meta.url).pathname,
  plugins: [react()],
  server: { port: 5277, host: '127.0.0.1', strictPort: true },
})
