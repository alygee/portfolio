import { act, renderHook, waitFor } from '@testing-library/react';
import { useSceneEnabled } from './useSceneEnabled';

/**
 * Даёт осесть промисам, которые уже поставлены в очередь микротасков (в т.ч.
 * промис динамического импорта `detect-gpu`, если бы он произошёл). В отличие
 * от `waitFor` с отрицательным утверждением, это ждёт реального времени, а не
 * резолвится по первому же (немедленному) проходу проверки.
 */
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const getGPUTier = vi.hoisted(() => vi.fn());
vi.mock('detect-gpu', () => ({ getGPUTier }));

/**
 * Мок различает медиа-запросы по аргументу и падает на неожидаемом. Вариант
 * «любой запрос отдаёт одно и то же» — заряженная ловушка: стоит хуку начать
 * спрашивать про второй запрос, и тест молча завяжется на то же `matches`.
 */
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      throw new Error(`неожиданный запрос matchMedia в тесте: ${query}`);
    }),
  );
}

describe('useSceneEnabled', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getGPUTier.mockResolvedValue({ tier: 3 });
    mockMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
  });

  it('включается на интегрированной графике, которую detect-gpu оценил как tier 1', async () => {
    getGPUTier.mockResolvedValue({ tier: 1 });
    const { result } = renderHook(() => useSceneEnabled());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('сначала выключено, затем включается после определения GPU', async () => {
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('остаётся выключенным при prefers-reduced-motion и не трогает GPU', async () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSceneEnabled());
    await flushMicrotasks();
    expect(getGPUTier).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным на GPU tier 0 (WebGL не работает или заблокирован)', async () => {
    getGPUTier.mockResolvedValue({ tier: 0 });
    const { result } = renderHook(() => useSceneEnabled());
    await waitFor(() => expect(getGPUTier).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным без WebGL', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { result } = renderHook(() => useSceneEnabled());
    await flushMicrotasks();
    expect(getGPUTier).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным, когда детектор GPU падает, и предупреждает в консоль', async () => {
    // detect-gpu по умолчанию тянет бенчмарки с внешнего CDN: без сети (или при
    // любой другой ошибке детектора) необработанное отклонение промиса оставляло
    // решение о сцене неопределённым. Красный при поломке: если убрать
    // try/catch, тест падает на необработанном отклонении, а без записи в
    // консоль — на последнем expect.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getGPUTier.mockRejectedValue(new Error('бенчмарки недоступны'));

    const { result } = renderHook(() => useSceneEnabled());
    await waitFor(() => expect(getGPUTier).toHaveBeenCalled());
    await flushMicrotasks();

    expect(result.current).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('не монтируется'),
      expect.any(Error),
    );
  });
});
