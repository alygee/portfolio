import type { Plugin } from 'vite';
import { collectThreeRoots } from './threeRoots';

/**
 * Роняет сборку, если в бандл попало больше одного экземпляра three, или
 * если плагин вообще не видит three в клиентской сборке (признак ослепшей проверки).
 *
 * Сегодня stats-gl в compiled коде не импортирует three, поэтому дубликата нет.
 * dedupe и этот плагин — страховка от любой будущей зависимости, которая
 * принесёт собственную копию three.
 *
 * Вынесен из `vite.config.ts` в отдельный модуль, чтобы `generateBundle` можно
 * было вызвать напрямую из юнит-теста (см. `singleThreeInstancePlugin.test.ts`)
 * с синтетическим bundle, без настоящей сборки Rollup. Поведение не менялось.
 */
export function singleThreeInstance({ requireThree }: { requireThree: boolean }): Plugin {
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
