import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { saveDefaultsPlugin } from './vite-plugin-save-defaults'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), saveDefaultsPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
