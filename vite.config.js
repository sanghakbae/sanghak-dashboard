import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// 매 프로덕션 빌드의 서비스 워커 내용이 달라져 업데이트 알림이 확실히 발생한다.
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    closeBundle() {
      const swPath = resolve('dist/sw.js')
      const source = readFileSync(swPath, 'utf8')
      writeFileSync(swPath, source.replace('__BUILD_VERSION__', Date.now().toString(36)))
    },
  }
}

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  server: {
    // 프리뷰 도구가 할당하는 PORT를 사용 (없으면 5173)
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
