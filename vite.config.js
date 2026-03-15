import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // When built for embedding in the backend binary, set VITE_BASE_PATH=/app/
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PINCER_BASE || 'http://10.0.1.10:8080',
        changeOrigin: true,
      },
    },
  },
})
