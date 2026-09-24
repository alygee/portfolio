import { act, renderHook } from '@testing-library/react';
import { displayJobs } from '@/content';
import { stationProgress } from '@/entities/route/progress';
import { progressStore } from './progressStore';
import { useScrollProgress } from './useScrollProgress';

const SECTION_IDS = displayJobs.map((job) => job.id);
const COUNT = SECTION_IDS.length;
// Секции работ по 1000 px, дальше хвост страницы: «Навыки» и «Образование».
const SECTION_OFFSETS = [400, 1400, 2400, 3400];
// По умолчанию тесты идут с смонтированной сценой: это ветка, где инерционный
// скролл вообще допустим.
const SCENE_MOUNTED = true;

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
 * Мост скролла опрашивает `matchMedia` только про тип указателя: решение о
 * пригодности окружения для сцены (WebGL, GPU, prefers-reduced-motion)
 * принимается в одном месте — `useSceneEnabled` — и приходит сюда параметром.
 * Мок различает запросы по аргументу и падает на неожидаемом, чтобы тест не
 * завязался на «любой запрос отдаёт одно и то же».
 */
function mockMatchMedia({ coarse = false }: { coarse?: boolean }) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      if (query === '(pointer: coarse)') {
        return { matches: coarse, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      throw new Error(`неожиданный запрос matchMedia в тесте: ${query}`);
    }),
  );
}

/**
 * Ставит в документ секции работ с заданными позициями в координатах скролла.
 * jsdom не раскладывает элементы, поэтому геометрия подменяется явно: `top`
 * отдаётся относительно окна, как настоящий `getBoundingClientRect`.
 */
function mountSections(offsets: readonly number[]) {
  document.body.innerHTML = '';
  SECTION_IDS.forEach((id, index) => {
    const section = document.createElement('section');
    section.id = id;
    section.getBoundingClientRect = () =>
      ({ top: (offsets[index] ?? 0) - window.scrollY }) as DOMRect;
    document.body.append(section);
  });
}

function setScrollMetrics(metrics: { scrollTop: number; scrollHeight: number; viewportHeight: number }) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: metrics.scrollHeight,
    configurable: true,
  });
  vi.stubGlobal('innerHeight', metrics.viewportHeight);
  vi.stubGlobal('scrollY', metrics.scrollTop);
}

function scrollTo(scrollTop: number) {
  vi.stubGlobal('scrollY', scrollTop);
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
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
  progressStore.setState({ progress: 0 });
  setScrollMetrics({ scrollTop: 0, scrollHeight: 6000, viewportHeight: 800 });
  mountSections(SECTION_OFFSETS);
});

describe('useScrollProgress', () => {
  it('на тач-устройстве Lenis не загружается вообще', async () => {
    // Красный при поломке: если убрать ветвление по `pointer: coarse` (или
    // перепутать условие), Lenis начнёт грузиться и на тач — конструктор
    // будет вызван, expect провалится. Проверено экспериментом: см. отчёт.
    mockMatchMedia({ coarse: true });

    renderHook(() => useScrollProgress(SCENE_MOUNTED));
    await flushMicrotasks();

    expect(LenisCtor).not.toHaveBeenCalled();
  });

  it('на тач-устройстве прогресс обновляется нативным событием скролла', () => {
    // Красный при поломке: если на тач-ветке не навесить слушатель `scroll`
    // на window (или не пересчитывать прогресс в нём), progress останется
    // равным начальному значению (0) после события скролла.
    mockMatchMedia({ coarse: true });

    renderHook(() => useScrollProgress(SCENE_MOUNTED));
    scrollTo(SECTION_OFFSETS[1]!);

    expect(progressStore.getState().progress).toBeCloseTo(stationProgress(1, COUNT), 10);
  });

  it('прогресс считается от позиций секций работ, а не от доли скролла документа', () => {
    // Красный при поломке: если вернуть расчёт по полной высоте документа,
    // на этой позиции получится 0.5 (половина прокручиваемой высоты), а не 1.
    // Точка обзора здесь уже ниже последней секции работ — камера обязана
    // стоять у последней станции, хотя до конца страницы ещё половина.
    mockMatchMedia({ coarse: true });
    setScrollMetrics({ scrollTop: 0, scrollHeight: 10_000, viewportHeight: 800 });

    renderHook(() => useScrollProgress(SCENE_MOUNTED));
    scrollTo(4600);

    expect(progressStore.getState().progress).toBe(1);
  });

  it('в точке обзора N-й секции прогресс равен прогрессу N-й станции', () => {
    // Красный при поломке: любое расхождение двух систем координат (другая
    // точка обзора, другая формула прогресса станции) сдвинет хотя бы одно из
    // значений. Это тот самый инвариант, из которого следует согласованность
    // deep link: браузер по хэшу ставит секцию в точку обзора.
    mockMatchMedia({ coarse: true });

    renderHook(() => useScrollProgress(SCENE_MOUNTED));

    SECTION_OFFSETS.forEach((offset, index) => {
      scrollTo(offset);
      expect(progressStore.getState().progress).toBeCloseTo(
        stationProgress(index, COUNT),
        10,
      );
    });
  });

  it('на указателе точной наводки Lenis загружается', async () => {
    // Красный при поломке: если ветвление всегда уходит в тач-путь (или
    // условие перевёрнуто), Lenis не будет запрошен и конструктор не
    // вызовется. Парный тест к «без смонтированной сцены»: без него проверка
    // «Lenis не грузится» была бы тривиально зелёной.
    mockMatchMedia({ coarse: false });

    renderHook(() => useScrollProgress(SCENE_MOUNTED));
    await flushMicrotasks();

    expect(LenisCtor).toHaveBeenCalled();
  });

  it('без смонтированной сцены инерционный скролл не подключается', async () => {
    // Красный при поломке: если Lenis перестанет зависеть от того, есть ли
    // сцена, на машине без WebGL (или с prefers-reduced-motion — класс
    // видеокарты в этом решении с фазы 1.5 не участвует, см. sceneSupport.ts)
    // чанк lenis всё равно скачается и нативная физика прокрутки будет
    // заменена rAF-циклом без единого визуального выигрыша.
    mockMatchMedia({ coarse: false });

    renderHook(() => useScrollProgress(false));
    await flushMicrotasks();

    expect(LenisCtor).not.toHaveBeenCalled();

    scrollTo(SECTION_OFFSETS[1]!);
    expect(progressStore.getState().progress).toBeCloseTo(stationProgress(1, COUNT), 10);
  });
});
