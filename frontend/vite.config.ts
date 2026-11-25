/// <reference types="vitest" />
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const localCertificatePath = fileURLToPath(new URL('./certs/localhost.pem', import.meta.url))
const localKeyPath = fileURLToPath(new URL('./certs/localhost-key.pem', import.meta.url))
const localHttps = existsSync(localCertificatePath) && existsSync(localKeyPath)
  ? {
      cert: readFileSync(localCertificatePath),
      key: readFileSync(localKeyPath),
    }
  : undefined

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    https: localHttps,
    proxy: {
      '/api/auth': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/api/scan': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/scan/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})

