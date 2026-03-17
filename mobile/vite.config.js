import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const sharedRoot = resolve(__dirname, '../src/renderer/src')
const desktopApiFile = resolve(__dirname, '../src/renderer/src/api/index.js')
const mobileApiFile = resolve(__dirname, 'src/api/index.js')

// Intercepta o arquivo api/index.js do desktop e substitui pelo mobile
function mobileApiOverride() {
  const normalizedDesktopApi = desktopApiFile.replace(/\\/g, '/')
  return {
    name: 'mobile-api-override',
    load(id) {
      if (id.replace(/\\/g, '/') === normalizedDesktopApi) {
        return `export { default } from '${mobileApiFile.replace(/\\/g, '/')}'`
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), mobileApiOverride()],
  resolve: {
    alias: {
      '@shared': sharedRoot,
      '@api': resolve(__dirname, 'src/api'),
    }
  },
  build: {
    outDir: 'dist'
  }
})
