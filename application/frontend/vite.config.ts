import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Allow imports from root src folder (if needed)
      '@root': path.resolve(__dirname, '../../src'),
      // Keep existing @ alias for frontend src
      '@': path.resolve(__dirname, './src'),
    },
  },
})
