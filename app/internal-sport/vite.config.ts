import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(() => {
  // Use remote approuter: VITE_PROXY_TARGET=https://approuter-url.cfapps...
  // Default: local CDS server at http://localhost:4004
  const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:4004'
  const isRemote = proxyTarget.startsWith('https')

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: true,
          ...(isRemote ? {} : {
            headers: {
              Authorization: 'Basic ' + Buffer.from('admin:admin').toString('base64')
            }
          })
        }
      }
    }
  }
})
