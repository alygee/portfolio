/**
 * Режимы сцены (спека зала, §5.3) — чистый редьюсер без `three` и React.
 * Возвращает тот же объект, если событие ничего не меняет: стор тогда не
 * оповещает подписчиков, и ни React, ни цикл кадра не делают лишней работы.
 */
export type SceneMode = 'travelling' | 'docked' | 'exploring';

export type SceneState = {
  mode: SceneMode;
  /** Канвас смонтирован и отрисовал кадр — без этого кнопки зала нет. */
  sceneReady: boolean;
  /** Подсветка из HTML-списка; живёт только в `docked`. */
  highlightedId: string | null;
  /** Выбранный узел; живёт только в `exploring`. */
  selectedId: string | null;
};

export type SceneEvent =
  | { type: 'progress'; value: number }
  | { type: 'openHall' }
  | { type: 'closeHall' }
  | { type: 'highlight'; id: string | null }
  | { type: 'select'; id: string | null }
  | { type: 'sceneReady'; ready: boolean };

/** Порог стыковки; уход — ниже `1 − 2·DOCK_EPS` (гистерезис против дребезга). */
export const DOCK_EPS = 0.01;

export const INITIAL_SCENE_STATE: SceneState = {
  mode: 'travelling',
  sceneReady: false,
  highlightedId: null,
  selectedId: null,
};

export function reduceScene(state: SceneState, event: SceneEvent): SceneState {
  switch (event.type) {
    case 'progress':
      if (state.mode === 'travelling' && event.value >= 1 - DOCK_EPS) {
        return { ...state, mode: 'docked' };
      }
      if (state.mode === 'docked' && event.value < 1 - 2 * DOCK_EPS) {
        return { ...state, mode: 'travelling', highlightedId: null };
      }
      return state;
    case 'openHall':
      return state.mode === 'docked' && state.sceneReady
        ? { ...state, mode: 'exploring', highlightedId: null }
        : state;
    case 'closeHall':
      return state.mode === 'exploring' ? { ...state, mode: 'docked', selectedId: null } : state;
    case 'highlight':
      return state.mode === 'docked' && state.highlightedId !== event.id
        ? { ...state, highlightedId: event.id }
        : state;
    case 'select':
      return state.mode === 'exploring' && state.selectedId !== event.id
        ? { ...state, selectedId: event.id }
        : state;
    case 'sceneReady':
      if (state.sceneReady === event.ready) return state;
      if (!event.ready && state.mode === 'exploring') {
        return { ...state, sceneReady: false, mode: 'docked', selectedId: null };
      }
      return { ...state, sceneReady: event.ready };
  }
}
