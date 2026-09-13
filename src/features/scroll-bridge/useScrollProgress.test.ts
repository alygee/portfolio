import { act, renderHook } from '@testing-library/react';
import { progressStore } from './progressStore';
import { useScrollProgress } from './useScrollProgress';

/**
 * Даёт осесть промисам, которые уже поставлены в очередь микротасков (в т.ч.
 * промис динамического импорта `lenis`, если бы он произошёл). В отличие
 * от `waitFor` с отрицательным утверждением, это ждёт реального времени, а не
 * резолвится по первому же (немедленному) проходу проверки — см. тот же
 * приём в `useSceneEnabled.test.tsx`.
 */
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const LenisCtor = vi.hoisted(() => vi.fn());
vi.mock('lenis', () => ({ default: LenisCtor }));

/**
 * `useScrollProgress` опрашивает `matchMedia` по двум разным медиа-запросам
 * (`pointer: coarse` и `prefers-reduced-motion: reduce`), поэтому мок должен
 * различать их по аргументу, а не отдавать одно и то же значение на любой
 * запрос — иначе тест на Lenis-ветку незаметно завязался бы на то же
 * `matches`, что и тест на reduced-motion.
 */
function mockMatchMedia({
  coarse = false,
  reducedMotion = false,
}: {
  coarse?: boolean;
  reducedMotion?: boolean;
}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      if (query === '(pointer: coarse)') {
        return { matches: coarse, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      if (query === '(prefers-reduced-motion: reduce)') {
        return { matches: reducedMotion, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      throw new Error(`неожиданный запрос matchMedia в тесте: ${query}`);
    }),
  );
}

function setScrollMetrics(metrics: {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
}) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: metrics.scrollHeight,
    configurable: true,
  });
  vi.stubGlobal('innerHeight', metrics.viewportHeight);
  vi.stubGlobal('scrollY', metrics.scrollTop);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  LenisCtor.mockReset();
  // Обычная функция, а не стрелочная: конструктор вызывается через `new`,
  // а стрелочные функции для этого не годятся.
  LenisCtor.mockImplementation(function LenisMock() {
    return { on: vi.fn(), raf: vi.fn(), destroy: vi.fn() };
  });
  progressStore.setState({ progress: 0, mode: 'travelling' });
  setScrollMetrics({ scrollTop: 0, scrollHeight: 4000, viewportHeight: 800 });
});

describe('useScrollProgress', () => {
  it('на тач-устройстве Lenis не загружается вообще', async () => {
    // Красный при поломке: если убрать ветвление по `pointer: coarse` (или
    // перепутать условие), Lenis начнёт грузиться и на тач — конструктор
    // будет вызван, expect провалится. Проверено экспериментом: см. отчёт.
    mockMatchMedia({ coarse: true, reducedMotion: false });

    renderHook(() => useScrollProgress());
    await flushMicrotasks();

    expect(LenisCtor).not.toHaveBeenCalled();
  });

  it('на тач-устройстве прогресс обновляется нативным событием скролла', () => {
    // Красный при поломке: если на тач-ветке не навесить слушатель `scroll`
    // на window (или не пересчитывать прогресс в нём), progress останется
    // равным начальному значению (0) после события скролла.
    mockMatchMedia({ coarse: true, reducedMotion: false });

    renderHook(() => useScrollProgress());

    setScrollMetrics({ scrollTop: 1600, scrollHeight: 4000, viewportHeight: 800 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(progressStore.getState().progress).toBe(0.5);
  });

  it('на указателе точной наводки Lenis загружается', async () => {
    // Красный при поломке: если ветвление всегда уходит в тач-путь (или
    // условие перевёрнуто), Lenis не будет запрошен и конструктор не
    // вызовется. Явно указан reducedMotion: false — иначе с учётом фикса
    // на prefers-reduced-motion этот тест стал бы ложным.
    mockMatchMedia({ coarse: false, reducedMotion: false });

    renderHook(() => useScrollProgress());
    await flushMicrotasks();

    expect(LenisCtor).toHaveBeenCalled();
  });

  it('при prefers-reduced-motion на точной наводке Lenis не загружается, прогресс идёт нативным скроллом', async () => {
    // Красный при поломке: если убрать проверку prefers-reduced-motion (или
    // объединить условие неверно), при точной наводке и запрошенном
    // уменьшении движения Lenis всё равно будет запрошен — первый expect
    // провалится. Проверено экспериментом: см. отчёт (Fix round 1).
    mockMatchMedia({ coarse: false, reducedMotion: true });

    renderHook(() => useScrollProgress());
    await flushMicrotasks();

    expect(LenisCtor).not.toHaveBeenCalled();

    setScrollMetrics({ scrollTop: 1600, scrollHeight: 4000, viewportHeight: 800 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(progressStore.getState().progress).toBe(0.5);
  });
});
