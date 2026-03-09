import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
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
