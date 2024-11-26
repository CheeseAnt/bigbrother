import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envs = {
  API_BASE: process.env.API_BASE || 'http://localhost:8000/ui',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': envs,
  },
})
