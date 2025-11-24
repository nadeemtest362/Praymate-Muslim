import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// Custom proxy plugin for video/image URLs
function proxyPlugin() {
  return {
    name: 'proxy-plugin',
    configureServer(server) {
      // Handle both video and image proxying
      server.middlewares.use(async (req, res, next) => {
        // Handle Gemini proxy
        if (req.url.startsWith('/api/gemini-proxy')) {
          const { default: handler } = await import('./api/gemini-proxy.js')
          return handler(req, res)
        }

        if (
          !req.url.startsWith('/api/proxy-video') &&
          !req.url.startsWith('/api/proxy-image')
        ) {
          return next()
        }
        const url = new URL(req.url, 'http://localhost')
        const targetUrl = url.searchParams.get('url')

        if (!targetUrl) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'URL parameter required' }))
          return
        }

        try {
          const response = await fetch(targetUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Referer: 'https://www.tiktok.com/',
            },
          })

          // Set response headers
          res.setHeader(
            'Content-Type',
            response.headers.get('content-type') || 'video/mp4'
          )
          res.setHeader('Access-Control-Allow-Origin', '*')

          // Stream the response
          const buffer = await response.arrayBuffer()
          res.end(Buffer.from(buffer))
        } catch (error) {
          console.error('Proxy error:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Proxy failed' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    proxyPlugin(), // Add our custom proxy plugin
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@personal-prayers': path.resolve(__dirname, '../../src'),

      // fix loading all icon chunks in dev mode
      // https://github.com/tabler/tabler-icons/issues/1233
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  esbuild: {
    loader: 'tsx',
    include: /\.[jt]sx?$/,
    exclude: [],
  },
})
