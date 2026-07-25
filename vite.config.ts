import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Deployed as a project page at https://projects.ahmadjalil.com/colorpicker/,
// so production assets need the repo name as a base. Dev serves from the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/colorpicker/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}))
