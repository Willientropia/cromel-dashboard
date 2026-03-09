import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_MOCK_API': JSON.stringify('true')
  },
  server: {
    host: '0.0.0.0',
    port: 3000
  }
})
