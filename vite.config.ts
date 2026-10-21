import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1', // 强制 IPv4，避免与本机其他项目的 IPv6:5173 冲突
    port: 5188,
    strictPort: true,
  },
});
