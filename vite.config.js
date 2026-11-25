import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      // The voting has its own pages: /vote/, /admin/ and /screen/
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        vote: resolve(import.meta.dirname, 'vote/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        screen: resolve(import.meta.dirname, 'screen/index.html'),
      },
    },
  },
})
