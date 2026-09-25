import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

if (process.env.VERCEL_ENV && (!process.env.VITE_ACCESS_CODE || !process.env.VITE_OPENAI_API_KEY)) {
  throw new Error('Vercel needs VITE_ACCESS_CODE and VITE_OPENAI_API_KEY before deployment. Set both in Project Settings → Environment Variables, then redeploy.')
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The new studio uses plain CSS. Preserve legacy PostCSS/Tailwind configs on disk.
  css: { postcss: { plugins: [] } },
  server: {
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
})
