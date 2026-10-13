import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { INITIAL_SCENE_STATE, reduceScene, type SceneEvent, type SceneState } from './sceneMode';

/**
 * Стор режимов — в главном чанке: в него пишут кнопка «Открыть зал» и
 * HTML-список навыков, а читает его и ленивая сцена (в `useFrame` — через
 * `getState()`, без React). На сервере `useStore` отдаёт начальное
 * состояние: кнопки зала в предрендере нет, гидрация не расходится.
 */
export const sceneStore = createStore<SceneState>(() => INITIAL_SCENE_STATE);

export function dispatchScene(event: SceneEvent): void {
  const current = sceneStore.getState();
  const next = reduceScene(current, event);
  if (next !== current) sceneStore.setState(next, true);
}

export function useSceneState<T>(selector: (state: SceneState) => T): T {
  return useStore(sceneStore, selector);
}

type ProgressSource = {
  getState(): { progress: number };
  subscribe(listener: (state: { progress: number }) => void): () => void;
};

/**
 * Прогресс маршрута → режим сцены. Источник передаётся параметром, а не
 * импортируется: так `entities/scene-mode` не зависит от `entities/route`.
 * Подключается в `App` (`bindProgress(progressStore)`).
 */
export function bindProgress(source: ProgressSource): () => void {
  dispatchScene({ type: 'progress', value: source.getState().progress });
  return source.subscribe((state) => dispatchScene({ type: 'progress', value: state.progress }));
}
