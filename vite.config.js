import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // Allow embedding in ClickUp iframe
      'X-Frame-Options': 'ALLOWALL',
    }
  },
  build: {
    outDir: 'dist',
  }
})
