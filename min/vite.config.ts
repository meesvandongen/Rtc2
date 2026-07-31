import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ root: '/home/user/Rtc2', plugins: [react()], server: { port: 5277, host: '127.0.0.1', strictPort: true } })
