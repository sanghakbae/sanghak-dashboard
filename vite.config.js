import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 프리뷰 도구가 할당하는 PORT를 사용 (없으면 5173)
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
