import { progressStore, setProgress, setSceneMode } from './progressStore';

describe('progressStore', () => {
  beforeEach(() => {
    progressStore.setState({ progress: 0, mode: 'travelling' });
  });

  it('стартует в начале маршрута в режиме путешествия', () => {
    expect(progressStore.getState()).toEqual({ progress: 0, mode: 'travelling' });
  });

  it('клампит прогресс в 0..1', () => {
    setProgress(2);
    expect(progressStore.getState().progress).toBe(1);
    setProgress(-1);
    expect(progressStore.getState().progress).toBe(0);
  });

  it('уведомляет подписчиков об изменении прогресса', () => {
    const seen: number[] = [];
    const unsubscribe = progressStore.subscribe((state) => seen.push(state.progress));
    setProgress(0.25);
    setProgress(0.5);
    unsubscribe();
    setProgress(0.75);
    expect(seen).toEqual([0.25, 0.5]);
  });

  it('переключает режим сцены', () => {
    setSceneMode('docked');
    expect(progressStore.getState().mode).toBe('docked');
  });
});
