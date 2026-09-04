import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.PORT || '4173'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // ba-story-player 以 file: 符号链接接入，其内部的 'vue' 默认会解析到
        // 包自身的 vue 拷贝，与宿主桥接用的 createApp 形成双实例——强制单例
        vue: resolve(__dirname, 'node_modules/vue'),
      },
    },
    server: { proxy: { '/api': `http://127.0.0.1:${apiPort}` } },
  }
})
