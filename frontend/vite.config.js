import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/users': 'http://localhost:5000',
      '/entrepreneurs': 'http://localhost:5000',
      '/categories': 'http://localhost:5000',
      '/skills': 'http://localhost:5000',
      '/services': 'http://localhost:5000',
      '/products': 'http://localhost:5000',
      '/availability': 'http://localhost:5000',
      '/service-requests': 'http://localhost:5000',
      '/orders': 'http://localhost:5000',
      '/payments': 'http://localhost:5000',
      '/reviews': 'http://localhost:5000',
      '/favorites': 'http://localhost:5000',
      '/notifications': 'http://localhost:5000',
      '/complaints': 'http://localhost:5000',
      '/admin': 'http://localhost:5000',
      '/health': 'http://localhost:5000'
    }
  }
})
