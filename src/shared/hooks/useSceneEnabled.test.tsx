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

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
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

  it('остаётся выключенным на слабом GPU', async () => {
    getGPUTier.mockResolvedValue({ tier: 1 });
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
});
