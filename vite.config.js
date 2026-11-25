import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // Kåringen har egne sider: /stem/, /admin/ og /skjerm/
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        stem: resolve(import.meta.dirname, 'stem/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        skjerm: resolve(import.meta.dirname, 'skjerm/index.html'),
      },
    },
  },
})
