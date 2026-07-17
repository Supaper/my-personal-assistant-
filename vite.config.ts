import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages는 프로젝트 페이지의 경우 `/<repo>/` 하위 경로로 서빙되므로 base를 맞춰준다.
// 사용자 페이지(<user>.github.io)나 커스텀 도메인을 쓰면 VITE_BASE=/ 로 덮어쓰면 된다.
const base = process.env.VITE_BASE ?? '/my-personal-assistant-/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
