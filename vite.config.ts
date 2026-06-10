import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: () => '/api/interpreter',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            let rawBody = ''
            req.on('data', (chunk: Buffer) => { rawBody += chunk.toString() })
            req.on('end', () => {
              try {
                const { query } = JSON.parse(rawBody) as { query: string }
                const encoded = `data=${encodeURIComponent(query)}`
                proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded')
                proxyReq.setHeader('Content-Length', Buffer.byteLength(encoded))
                proxyReq.write(encoded)
                proxyReq.end()
              } catch {
                proxyReq.end()
              }
            })
          })
        },
      },
    },
  },
})
