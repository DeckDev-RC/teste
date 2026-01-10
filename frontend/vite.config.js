import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Disable HMR for network clients (prevents WebSocket errors)
    // For development from localhost, HMR still works
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      },
      // Proxy para Supabase em desenvolvimento (evita Mixed Content)
      '/supabase': {
        target: 'http://31.97.164.208:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
