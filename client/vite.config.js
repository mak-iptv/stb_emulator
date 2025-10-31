import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,
    proxy: {
      '/mag-proxy': {
        target: 'http://localhost:10000', // porta e backend-it Express gjatë zhvillimit
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mag-proxy/, '/mag-proxy')
      }
    }
  }
})
