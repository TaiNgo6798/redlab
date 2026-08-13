import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import manifest from './manifest.json' with { type: 'json' }

export default defineConfig({
  plugins: [
    react(),
    crx({
      manifest,
      contentScripts: { injectCss: true },
    }),
  ],
  build: {
    emptyOutDir: true,
    // Chrome extensions reject chrome-extension:// modulepreload (cross-world).
    // Splitting React/antd also made a circular chunk and broke useLayoutEffect.
    modulePreload: false,
  },
})
