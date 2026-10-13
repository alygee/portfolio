import { createStore } from 'zustand/vanilla';
import { INITIAL_SCENE_STATE } from './sceneMode';
import { bindProgress, dispatchScene, sceneStore } from './sceneStore';

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('dispatchScene', () => {
  it('применяет редьюсер', () => {
    dispatchScene({ type: 'progress', value: 1 });
    expect(sceneStore.getState().mode).toBe('docked');
  });

  it('не оповещает подписчиков, если состояние не изменилось', () => {
    const listener = vi.fn();
    const unsubscribe = sceneStore.subscribe(listener);
    dispatchScene({ type: 'progress', value: 0.2 });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('bindProgress', () => {
  it('сразу передаёт текущий прогресс и дальше — каждое изменение', () => {
    const progress = createStore(() => ({ progress: 1 }));
    const unbind = bindProgress(progress);
    expect(sceneStore.getState().mode).toBe('docked');
    progress.setState({ progress: 0 });
    expect(sceneStore.getState().mode).toBe('travelling');
    unbind();
    progress.setState({ progress: 1 });
    expect(sceneStore.getState().mode).toBe('travelling');
  });
});
