import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  base: '/portfolio/',
  plugins: [react()],
  resolve: {
    alias: { '@': resolvePath('./src') },
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
