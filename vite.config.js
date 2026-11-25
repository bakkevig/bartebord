import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The voting has its own pages: /vote/, /admin/ and /screen/
const pages = ['vote', 'admin', 'screen']

// GitHub Pages redirects /vote to /vote/, but Vite's dev server would serve the
// front page instead. Redirect the same way locally.
function trailingSlashRedirect() {
  const pattern = new RegExp(`^/(${pages.join('|')})(\\?.*)?$`)
  const middleware = (req, res, next) => {
    const match = req.url.match(pattern)
    if (!match) return next()
    res.statusCode = 301
    res.setHeader('Location', `/${match[1]}/${match[2] ?? ''}`)
    res.end()
  }
  return {
    name: 'trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), trailingSlashRedirect()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(pages.map((page) => [page, resolve(import.meta.dirname, `${page}/index.html`)])),
      },
    },
  },
})
