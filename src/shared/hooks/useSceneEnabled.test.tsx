import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { useSceneEnabled as UseSceneEnabled } from './useSceneEnabled';

/**
 * Мок `matchMedia`, который умеет эмулировать системное переключение
 * `prefers-reduced-motion` без перемонтирования: `change(...)` вызывает
 * тот же слушатель, который получил `addEventListener` внутри хука — так же,
 * как это сделал бы реальный браузер.
 */
function mockMatchMedia(reducedMotion: boolean) {
  let listener: ((event: { matches: boolean }) => void) | null = null;
  let matches = reducedMotion;

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      if (query !== '(prefers-reduced-motion: reduce)') {
        throw new Error(`Неожиданный медиа-запрос в тесте: ${query}`);
      }
      return {
        get matches() {
          return matches;
        },
        addEventListener: vi.fn((type: string, cb: (event: { matches: boolean }) => void) => {
          if (type === 'change') listener = cb;
        }),
        removeEventListener: vi.fn(),
      };
    }),
  );

  return {
    change(next: boolean) {
      matches = next;
      listener?.({ matches: next });
    },
  };
}

describe('useSceneEnabled', () => {
  // Внутри хука detectWebGL() кешируется на уровне модуля (осознанно — canvas
  // дорог, а поддержка WebGL не меняется в рамках сессии). Для тестов это
  // означает, что модуль нужно переимпортировать заново перед каждым кейсом,
  // иначе результат одного теста (например, "WebGL есть") просочится в
  // следующий через кеш.
  let useSceneEnabled: typeof UseSceneEnabled;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    mockMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );
    ({ useSceneEnabled } = await import('./useSceneEnabled'));
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

  it('реагирует на изменение prefers-reduced-motion без перемонтирования', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useSceneEnabled());
    expect(result.current).toBe(true);

    act(() => {
      media.change(true);
    });

    expect(result.current).toBe(false);
  });

  it('на сервере (SSR) отдаёт false и не трогает window', () => {
    const matchMediaSpy = vi.fn();
    vi.stubGlobal('matchMedia', matchMediaSpy);

    function Probe() {
      return <>{String(useSceneEnabled())}</>;
    }

    const html = renderToString(<Probe />);

    expect(html).toBe('false');
    expect(matchMediaSpy).not.toHaveBeenCalled();
  });

  it('не обращается к сети при принятии решения', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderHook(() => useSceneEnabled());
    // Макротаска, а не просто Promise.resolve(): гейт не обязан быть
    // синхронным по контракту теста, поэтому нужно дать осесть всей цепочке
    // промисов (в т.ч. многошаговой — await import(...), затем await fetch(...)),
    // а не только одному микротаск-переходу.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
