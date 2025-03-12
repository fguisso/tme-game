import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  base: '/tme-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
})
