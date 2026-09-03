import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Destino do proxy de /api em desenvolvimento. Definir em
  // dashboard/.env.local para nao versionar endereco de maquina/rede.
  // Em producao (Vercel) nada disso e usado: o bundle chama VITE_API_URL.
  const apiTarget =
    env.VITE_API_PROXY_TARGET ||
    (mode === 'homologacao' ? 'http://127.0.0.1:15001' : 'http://localhost:5001')

  return {
    plugins: [react()],
    server: {
      // 0.0.0.0 permite abrir o dashboard de outra maquina da rede.
      host: env.VITE_DEV_HOST || '127.0.0.1',
      port: mode === 'homologacao' ? 15173 : 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
