import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Роняет сборку, если в бандл попало больше одного экземпляра three.
 * Проверка идёт по графу модулей, а не по тексту чанков: в проекте одна
 * граница ленивой загрузки, поэтому второй экземпляр оказался бы в том же
 * чанке, что и первый, и текстовый маркер его бы не заметил.
 */
function singleThreeInstance(): Plugin {
  return {
    name: 'single-three-instance',
    apply: 'build',
    generateBundle(_options, bundle) {
      const roots = new Set<string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        for (const id of Object.keys(output.modules)) {
          const match = id.match(/^(.*[\\/]node_modules[\\/]three)[\\/]/);
          if (match?.[1]) roots.add(match[1]);
        }
      }
      if (roots.size > 1) {
        this.error(
          `В сборку попало ${roots.size} экземпляра three:\n${[...roots].join('\n')}`,
        );
      }
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  base: '/portfolio/',
  plugins: [react(), singleThreeInstance()],
  resolve: {
    alias: { '@': resolvePath('./src') },
    // Один экземпляр three на всё приложение. drei тянет stats-gl со своим
    // вложенным three; два экземпляра ломают instanceof и материалы — это
    // проявится в фазе 2, когда появятся кастомные материалы и инстансинг.
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
