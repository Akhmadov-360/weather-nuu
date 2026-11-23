import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { imagetools } from 'vite-imagetools';

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
  plugins: [react(), tailwindcss(), imagetools()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries that rarely change go into their own files: after a deploy a returning visitor downloads only
        // the application code again, the rest stays in the browser cache. The groups follow what loads together.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[/]node_modules[/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[/]/.test(id)) return 'vendor-react';
          if (/[/]node_modules[/](motion|motion-dom|motion-utils|framer-motion|@animate-ui|@number-flow|number-flow)[/]/.test(id)) return 'vendor-motion';
          if (/[/]node_modules[/](i18next|react-i18next)[/]/.test(id)) return 'vendor-i18n';
          if (/[/]node_modules[/](@tanstack|axios|zod)[/]/.test(id)) return 'vendor-data';
          return undefined;
        },
      },
    },
  },
  server: { proxy },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
