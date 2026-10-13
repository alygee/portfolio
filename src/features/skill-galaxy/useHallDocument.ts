import { useEffect } from 'react';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';

export const HALL_OPEN_CLASS = 'hall-open';
const HISTORY_MARKER = 'skillHall';

function ownsTopHistoryEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && HISTORY_MARKER in state;
}

/**
 * Документ на время режима исследования: гаснет (`html.hall-open`, CSS),
 * не прокручивается, Esc и «назад» закрывают зал. Все пути закрытия — Esc,
 * кнопка, «назад», ссылка на станцию, падение сцены — сводятся к выходу из
 * `exploring`, а уборка живёт в одном месте: в сбросе этого эффекта. Так ни
 * один путь не оставит документ заблокированным.
 */
export function useHallDocument(): void {
  const exploring = useSceneState((state) => state.mode === 'exploring');

  useEffect(() => {
    if (!exploring) return;
    const root = document.documentElement;
    const scrollY = window.scrollY;
    const close = () => dispatchScene({ type: 'closeHall' });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    root.classList.add(HALL_OPEN_CLASS);
    window.history.pushState({ [HISTORY_MARKER]: true }, '');
    window.addEventListener('popstate', close);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', close);
      window.removeEventListener('keydown', onKeyDown);
      root.classList.remove(HALL_OPEN_CLASS);
      window.scrollTo(0, scrollY);
      // Закрыли не «назад» — своя запись осталась сверху; убираем её, иначе
      // следующее «назад» посетителя ничего видимого не сделает.
      if (ownsTopHistoryEntry()) window.history.back();
    };
  }, [exploring]);
}
