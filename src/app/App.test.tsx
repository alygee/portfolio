import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { ROUTE_ANCHOR_IDS } from '@/entities/route/anchors';
import { stationProgress } from '@/entities/route/progress';
import { progressStore, setProgress } from '@/entities/route/progressStore';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import App from './App';

beforeEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
  progressStore.setState({ progress: 0 });
  sceneStore.setState(INITIAL_SCENE_STATE, true);
});

describe('App', () => {
  it('показывает имя в единственном заголовке первого уровня', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Альберт Аллагулов');
  });

  it('вход по хэшу выигрывает у моста скролла: порядок хуков закреплён', () => {
    // Контракт порядка: `useScrollProgress` ставит прогресс по текущей позиции
    // документа, и только после него `useStationHash` может переопределить его
    // deep link'ом. Красный при поломке: если переставить эти два хука, мост
    // скролла затрёт прогресс станции нулём (в jsdom позиция скролла нулевая),
    // и вход по '#mplat' молча перестанет работать.
    window.location.hash = '#mplat';

    render(<App />);

    const expected = stationProgress(ROUTE_ANCHOR_IDS.indexOf('mplat'), ROUTE_ANCHOR_IDS.length);
    expect(expected).toBeGreaterThan(0);
    expect(progressStore.getState().progress).toBe(expected);
  });

  it('режим сцены следует за прогрессом маршрута', () => {
    render(<App />);
    act(() => setProgress(1));
    expect(sceneStore.getState().mode).toBe('docked');
    act(() => setProgress(0));
    expect(sceneStore.getState().mode).toBe('travelling');
  });

  it('кнопка зала появляется в стыковке при готовой сцене', () => {
    render(<App />);
    act(() => {
      setProgress(1);
      sceneStore.setState({ ...sceneStore.getState(), sceneReady: true });
    });
    expect(screen.getByRole('button', { name: 'Открыть зал навыков' })).toBeInTheDocument();
  });

  it('в предрендере кнопки зала нет, даже если на клиенте зал уже готов', () => {
    // Иначе гидрация разойдётся: сервер рендерит начальное состояние стора.
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true);
    const html = renderToString(<App />);
    expect(html).not.toContain('Открыть зал навыков');
    expect(html).toContain('id="skills"');
  });
});
