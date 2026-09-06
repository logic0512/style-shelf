import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { loadLocalEnv } from './scripts/load-env.mjs'

const root = dirname(fileURLToPath(import.meta.url))
await loadLocalEnv(root)

export default defineConfig({
  preview: {
    proxy: {
      '/api': `http://127.0.0.1:${process.env.STYLE_SHELF_PORT || 4317}`,
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        v2: resolve(root, 'v2.html'),
      },
    },
  },
})
