import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // bind 0.0.0.0 so the sandbox preview is reachable
    port: 5173,
    allowedHosts: true, // accept the e2b preview host
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 620,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
