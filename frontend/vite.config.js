import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
      '/auth': 'http://localhost:8080',
      '/users': 'http://localhost:8080',
      '/entrepreneurs': 'http://localhost:8080',
      '/categories': 'http://localhost:8080',
      '/skills': 'http://localhost:8080',
      '/services': 'http://localhost:8080',
      '/products': 'http://localhost:8080',
      '/availability': 'http://localhost:8080',
      '/service-requests': 'http://localhost:8080',
      '/orders': 'http://localhost:8080',
      '/payments': 'http://localhost:8080',
      '/reviews': 'http://localhost:8080',
      '/favorites': 'http://localhost:8080',
      '/notifications': 'http://localhost:8080',
      '/complaints': 'http://localhost:8080',
      '/portfolio': 'http://localhost:8080',
      '/quotes': 'http://localhost:8080',
      '/messages': 'http://localhost:8080',
      '/admin': 'http://localhost:8080',
      '/health': 'http://localhost:8080'
    }
  }
})
