import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plain dev server for side-panel design sessions; CRXJS rewrites page scripts and breaks plain-tab loading.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, open: '/sidepanel/sidepanel.html' },
})
