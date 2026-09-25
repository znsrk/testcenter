import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The new studio uses plain CSS. Preserve legacy PostCSS/Tailwind configs on disk.
  css: { postcss: { plugins: [] } },
  server: {
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
