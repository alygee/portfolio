import { DOCK_EPS, INITIAL_SCENE_STATE, reduceScene, type SceneState } from './sceneMode';

const state = (patch: Partial<SceneState>): SceneState => ({ ...INITIAL_SCENE_STATE, ...patch });

describe('reduceScene: прогресс', () => {
  it('в конце маршрута — стыковка', () => {
    expect(reduceScene(state({}), { type: 'progress', value: 1 }).mode).toBe('docked');
    expect(reduceScene(state({}), { type: 'progress', value: 1 - DOCK_EPS }).mode).toBe('docked');
  });

  it('до порога — полёт', () => {
    const before = state({});
    expect(reduceScene(before, { type: 'progress', value: 0.98 })).toBe(before);
  });

  it('гистерезис: из стыковки уходит только ниже 1 − 2·EPS', () => {
    const docked = state({ mode: 'docked' });
    expect(reduceScene(docked, { type: 'progress', value: 1 - 1.5 * DOCK_EPS })).toBe(docked);
    expect(reduceScene(docked, { type: 'progress', value: 1 - 2.5 * DOCK_EPS }).mode).toBe('travelling');
  });

  it('уход из стыковки снимает подсветку', () => {
    const docked = state({ mode: 'docked', highlightedId: 'react' });
    expect(reduceScene(docked, { type: 'progress', value: 0 }).highlightedId).toBeNull();
  });

  it('в исследовании прогресс игнорируется', () => {
    const exploring = state({ mode: 'exploring', sceneReady: true });
    expect(reduceScene(exploring, { type: 'progress', value: 0 })).toBe(exploring);
  });
});

describe('reduceScene: зал', () => {
  it('открывается только из стыковки и только при готовой сцене', () => {
    expect(reduceScene(state({ mode: 'docked', sceneReady: true }), { type: 'openHall' }).mode).toBe('exploring');
    const notReady = state({ mode: 'docked' });
    expect(reduceScene(notReady, { type: 'openHall' })).toBe(notReady);
    const travelling = state({ sceneReady: true });
    expect(reduceScene(travelling, { type: 'openHall' })).toBe(travelling);
  });

  it('открытие снимает подсветку, закрытие — выбор', () => {
    const opened = reduceScene(state({ mode: 'docked', sceneReady: true, highlightedId: 'react' }), {
      type: 'openHall',
    });
    expect(opened.highlightedId).toBeNull();
    const closed = reduceScene({ ...opened, selectedId: 'react' }, { type: 'closeHall' });
    expect(closed).toMatchObject({ mode: 'docked', selectedId: null });
  });

  it('закрытие вне исследования ничего не меняет', () => {
    const docked = state({ mode: 'docked' });
    expect(reduceScene(docked, { type: 'closeHall' })).toBe(docked);
  });

  it('подсветка — только в стыковке, выбор — только в исследовании', () => {
    const travelling = state({});
    expect(reduceScene(travelling, { type: 'highlight', id: 'react' })).toBe(travelling);
    expect(reduceScene(state({ mode: 'docked' }), { type: 'highlight', id: 'react' }).highlightedId).toBe('react');
    const docked = state({ mode: 'docked' });
    expect(reduceScene(docked, { type: 'select', id: 'react' })).toBe(docked);
    expect(
      reduceScene(state({ mode: 'exploring', sceneReady: true }), { type: 'select', id: 'react' }).selectedId,
    ).toBe('react');
  });

  it('повтор того же значения не создаёт новое состояние', () => {
    const docked = state({ mode: 'docked', highlightedId: 'react' });
    expect(reduceScene(docked, { type: 'highlight', id: 'react' })).toBe(docked);
  });
});

describe('reduceScene: готовность сцены', () => {
  it('ставится и снимается', () => {
    const ready = reduceScene(state({}), { type: 'sceneReady', ready: true });
    expect(ready.sceneReady).toBe(true);
    expect(reduceScene(ready, { type: 'sceneReady', ready: false }).sceneReady).toBe(false);
  });

  it('пропавшая сцена выводит из исследования — документ обязан вернуться', () => {
    const exploring = state({ mode: 'exploring', sceneReady: true, selectedId: 'react' });
    expect(reduceScene(exploring, { type: 'sceneReady', ready: false })).toEqual(
      state({ mode: 'docked', sceneReady: false, selectedId: null }),
    );
  });
});
