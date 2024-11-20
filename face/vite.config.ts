import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const envs = {
  API_BASE: process.env.API_BASE || 'https://bb.antonshmanton.com/ui',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': envs,
  },
})
