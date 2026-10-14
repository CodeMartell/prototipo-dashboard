import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: mode === 'homologacao' ? 15173 : 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: mode === 'homologacao' ? 'http://127.0.0.1:15001' : 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
}))
