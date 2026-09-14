import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { collectThreeRoots } from './src/shared/lib/threeRoots';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Роняет сборку, если в бандл попало больше одного экземпляра three, или
 * если плагин вообще не видит three в клиентской сборке (признак ослепшей проверки).
 *
 * Сегодня stats-gl в compiled коде не импортирует three, поэтому дубликата нет.
 * dedupe и этот плагин — страховка от любой будущей зависимости, которая
 * принесёт собственную копию three.
 */
function singleThreeInstance({ requireThree }: { requireThree: boolean }): Plugin {
  return {
    name: 'single-three-instance',
    apply: 'build',
    generateBundle(_options, bundle) {
      const moduleIds = Object.values(bundle).flatMap((output) =>
        output.type === 'chunk' ? Object.keys(output.modules) : [],
      );
      const roots = collectThreeRoots(moduleIds);
      if (roots.size > 1) {
        this.error(
          `В сборку попало ${roots.size} экземпляра three:\n${[...roots].join('\n')}`,
        );
      }
      if (requireThree && roots.size === 0) {
        this.error(
          'В клиентской сборке не найден ни один модуль three: проверка экземпляров ослепла ' +
            '(сломан поиск корней) или сцена выпала из сборки.',
        );
      }
    },
  };
}

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
