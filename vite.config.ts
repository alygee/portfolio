import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { singleThreeInstance } from './src/shared/lib/singleThreeInstancePlugin';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  base: '/portfolio/',
  plugins: [react(), singleThreeInstance({ requireThree: !isSsrBuild })],
  resolve: {
    alias: { '@': resolvePath('./src') },
    // Один экземпляр three на всё приложение. Сегодня stats-gl в compiled коде
    // три не импортирует, но три на диске в его node_modules. Это страховка
    // от любой будущей зависимости, которая принесёт собственную копию three.
    // Два экземпляра ломают instanceof и материалы.
    dedupe: ['three'],
  },
  build: isSsrBuild
    ? {
        // Два входа только для SSR-сборки: разметка и утилита инъекции,
        // которую импортирует scripts/prerender.mjs.
        rollupOptions: {
          input: {
            'entry-server': resolvePath('./src/entry-server.tsx'),
            injectAppHtml: resolvePath('./src/shared/lib/injectAppHtml.ts'),
          },
          output: { entryFileNames: '[name].js', format: 'esm' },
        },
      }
    : {},
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/test/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
}));
