import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Куда проксировать запросы /api в режиме разработки. По умолчанию — локальный
// бэкенд из docker-compose.dev.yml (репозиторий weather-backend).
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8002';

const toV1 = (p: string) => p.replace(/^\/api/, '');

// Повторяет правила nginx на боевом сервере: старые адреса /api/room/* и
// /api/street/* переписываются на /v1/sensors/*, а /api/v1/* уходит в /v1/*.
// Порядок важен — более конкретные правила выше.
const proxy = {
  '^/api/(room|street)/latest': {
    target,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/(room|street)\/latest/, '/v1/sensors/$1/latest'),
  },
  '^/api/(room|street)/all': {
    target,
    changeOrigin: true,
    rewrite: (p: string) => p.replace(/^\/api\/(room|street)\/all/, '/v1/sensors/$1/history'),
  },
  '/api/v1/ws': { target, changeOrigin: true, ws: true, rewrite: toV1 },
  '/api/v1': { target, changeOrigin: true, rewrite: toV1 },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { proxy },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
