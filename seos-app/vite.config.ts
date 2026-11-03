import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy backend API calls directly to FastAPI backend
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy Anthropic API calls to bypass CORS in development
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        headers: {
          Origin: 'https://api.anthropic.com',
        },
      },
      // Proxy Groq API calls
      '/api/groq': {
        target: 'https://api.groq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/groq/, ''),
        headers: {
          Origin: 'https://api.groq.com',
        },
      },
      // Proxy NVIDIA NIM API calls
      '/api/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nvidia/, ''),
        headers: {
          Origin: 'https://integrate.api.nvidia.com',
        },
      },
    },
  },
})
