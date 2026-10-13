import { act, renderHook } from '@testing-library/react';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { dispatchScene, sceneStore } from '@/entities/scene-mode/sceneStore';
import { HALL_OPEN_CLASS, useHallDocument } from './useHallDocument';

const root = document.documentElement;
const openHall = () =>
  act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true));
let scrollTo: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sceneStore.setState(INITIAL_SCENE_STATE, true);
  root.classList.remove(HALL_OPEN_CLASS);
  window.history.replaceState(null, '', '/');
  scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('scrollY', 1234);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useHallDocument', () => {
  it('открытый зал блокирует документ и кладёт запись в историю', () => {
    const push = vi.spyOn(window.history, 'pushState');
    renderHook(() => useHallDocument());
    openHall();
    expect(root).toHaveClass(HALL_OPEN_CLASS);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('Esc закрывает зал, снимает блокировку и возвращает позицию прокрутки', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(sceneStore.getState().mode).toBe('docked');
    expect(root).not.toHaveClass(HALL_OPEN_CLASS);
    expect(scrollTo).toHaveBeenCalledWith(0, 1234);
  });

  it('«назад» закрывает зал и не уходит ещё на шаг назад', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => {
      // Браузер при «назад» уже снял нашу запись: сверху — прежняя.
      window.history.replaceState(null, '');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(sceneStore.getState().mode).toBe('docked');
    expect(back).not.toHaveBeenCalled();
  });

  it('«назад»: позицию, которую браузер восстановил после popstate, возвращаем на место', () => {
    vi.useFakeTimers();
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => {
      window.history.replaceState(null, '');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    scrollTo.mockClear();
    vi.stubGlobal('scrollY', 1703); // браузер сдвинул позицию
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(scrollTo).toHaveBeenCalledWith(0, 1234);
    vi.useRealTimers();
  });

  it('закрытие кнопкой убирает свою запись истории', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => dispatchScene({ type: 'closeHall' }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('падение сцены в открытом зале снимает блокировку', () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
    renderHook(() => useHallDocument());
    openHall();
    act(() => dispatchScene({ type: 'sceneReady', ready: false }));
    expect(root).not.toHaveClass(HALL_OPEN_CLASS);
  });
});
