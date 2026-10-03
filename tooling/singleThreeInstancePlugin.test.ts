import { singleThreeInstance } from './singleThreeInstancePlugin';

/**
 * Плагин типизирован через `vite`, которая переэкспортирует типы Rollup из
 * собственного бандла, а не из отдельно устанавливаемого пакета `rollup` —
 * `import type ... from 'rollup'` в проекте не резолвится. Тесту нужна лишь
 * структурная форма bundle (`{ type, modules }`) и контекста (`error`), а не
 * точные типы Rollup, поэтому здесь минимальные локальные типы вместо них.
 */
type FakeChunk = { type: 'chunk'; modules: Record<string, unknown> };
type FakeBundle = Record<string, FakeChunk>;
type FakeContext = { error(message: string): never };

/**
 * `generateBundle` не принимает произвольный `this` по типу — в реальной
 * сборке Rollup подставляет полноценный `PluginContext`. Тесту нужен только
 * `error`, поэтому остальное подделывается кастом: поведение хука от этого
 * не меняется, меняется только то, чем мы готовы пожертвовать в типизации
 * тестового дубля.
 */
function fakePluginContext() {
  const errors: string[] = [];
  const context: FakeContext = {
    error(message: string): never {
      errors.push(message);
      throw new Error(message);
    },
  };
  return { context, errors };
}

function chunkWithModules(moduleIds: string[]): FakeChunk {
  return {
    type: 'chunk',
    modules: Object.fromEntries(moduleIds.map((id) => [id, {}])),
  };
}

function bundleFromChunks(chunks: string[][]): FakeBundle {
  return Object.fromEntries(
    chunks.map((moduleIds, index) => [`chunk-${index}.js`, chunkWithModules(moduleIds)]),
  );
}

/** Вызывает `generateBundle` плагина напрямую, минуя настоящую сборку Rollup. */
function runGenerateBundle(bundle: FakeBundle, requireThree = true) {
  const plugin = singleThreeInstance({ requireThree });
  const hook = plugin.generateBundle;
  if (typeof hook !== 'function') {
    throw new Error('generateBundle должен быть функцией, а не объектом-обработчиком');
  }
  const { context, errors } = fakePluginContext();
  const boundHook = hook as unknown as (
    this: FakeContext,
    options: Record<string, never>,
    bundle: FakeBundle,
    isWrite: boolean,
  ) => void;
  const run = () => boundHook.call(context, {}, bundle, true);
  return { run, errors };
}

describe('singleThreeInstance: generateBundle', () => {
  it('сообщает об ошибке, если в бандле два разных корня three', () => {
    // Красный при поломке: если проверка «больше одного корня» перестанет
    // вызывать this.error (например, условие потеряется при рефакторинге),
    // сборка с двумя экземплярами three молча пройдёт — ровно тот сценарий,
    // который ломает instanceof и материалы в рантайме.
    const bundle = bundleFromChunks([
      ['/app/node_modules/three/build/three.module.js'],
      ['/app/node_modules/stats-gl/node_modules/three/build/three.module.js'],
    ]);

    const { run, errors } = runGenerateBundle(bundle);

    expect(run).toThrow();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/попало 2 экземпляра three/);
    expect(errors[0]).toContain('/app/node_modules/three');
    expect(errors[0]).toContain('/app/node_modules/stats-gl/node_modules/three');
  });

  it('не падает, если в бандле ровно один корень three', () => {
    const bundle = bundleFromChunks([
      ['/app/node_modules/three/build/three.module.js'],
      ['/app/src/main.tsx'],
    ]);

    const { run, errors } = runGenerateBundle(bundle);

    expect(run).not.toThrow();
    expect(errors).toHaveLength(0);
  });

  it('сообщает об ошибке, если three требуется, но не найден ни один корень', () => {
    // Обратная защита (доказана мутацией при добавлении в фазе 1.5, см.
    // vite.config.ts / cc87acb): проверка не должна молча пропускать сборку,
    // из которой сцена выпала целиком.
    const bundle = bundleFromChunks([['/app/src/main.tsx']]);

    const { run, errors } = runGenerateBundle(bundle, true);

    expect(run).toThrow();
    expect(errors[0]).toMatch(/не найден ни один модуль three/);
  });

  it('не требует three в SSR-сборке (requireThree: false)', () => {
    const bundle = bundleFromChunks([['/app/src/entry-server.tsx']]);

    const { run, errors } = runGenerateBundle(bundle, false);

    expect(run).not.toThrow();
    expect(errors).toHaveLength(0);
  });
});
