import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          syntax: ['react-syntax-highlighter'],
          icons: ['lucide-react'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
