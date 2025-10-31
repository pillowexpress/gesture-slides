import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/__log': 'http://localhost:5174',
      '/api': 'http://localhost:5174'
    }
  }
})
