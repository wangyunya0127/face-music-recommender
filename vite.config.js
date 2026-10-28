import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 使用相对 base, 使 dist 可直接以静态文件方式打开/部署
export default defineConfig({
  plugins: [vue()],
  base: './',
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', assetsInlineLimit: 0 }
})
