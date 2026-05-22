import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/check': 'http://localhost:5000',
      '/history': 'http://localhost:5000',
      '/metrics': 'http://localhost:5000',
    },
  },
})
