import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/book-appointment': 'http://localhost:3001',
      '/api/pipeline': 'http://localhost:3001',
      '/api/gx-stats': 'http://localhost:3001',
      '/api/gx-sync': 'http://localhost:3001',
      '/api/run-skill': 'http://localhost:3001',
      '/api/skills': 'http://localhost:3001',
      '/api/recruit-pipeline': 'http://localhost:3001',
      '/api/recruit-step3': 'http://localhost:3001',
      '/api/daily-report': 'http://localhost:3001',
      '/api/licensing': 'http://localhost:3001',
      '/api/gx-leaderboard': 'http://localhost:3001',
      '/api/recognition': 'http://localhost:3001',
      '/api/convention': 'http://localhost:3001',
      '/api/followups': 'http://localhost:3001',
    }
  }
})
