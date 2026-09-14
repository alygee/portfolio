import { renderHook } from '@testing-library/react';
import { useSceneEnabled } from './useSceneEnabled';

function mockMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return { matches: reducedMotion, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      }
      throw new Error(`Неожиданный медиа-запрос в тесте: ${query}`);
    }),
  );
}

describe('useSceneEnabled', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
  });

  it('включается на окружении с рабочим WebGL', () => {
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(true);
  });

  it('остаётся выключенным при prefers-reduced-motion', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(false);
  });

  it('остаётся выключенным без WebGL', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(false);
  });

  it('не обращается к сети при принятии решения', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderHook(() => useSceneEnabled());
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
