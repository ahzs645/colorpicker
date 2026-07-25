import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Deployed to https://ahzs645.github.io/colorpicker/, so production assets need
// the repo name as a base. Dev keeps serving from the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/colorpicker/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
