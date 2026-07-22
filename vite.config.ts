import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Electron loads the built app over file://, so assets must be referenced
  // relatively. Harmless when the same build is served over http.
  base: './',
  plugins: [react()],
})
