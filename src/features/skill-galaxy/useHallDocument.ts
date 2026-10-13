import { useEffect } from 'react';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';

export const HALL_OPEN_CLASS = 'hall-open';
const HISTORY_MARKER = 'skillHall';
const HOLD_MS = 500;
const USER_SCROLL = ['wheel', 'touchstart', 'keydown'] as const;

function ownsTopHistoryEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && HISTORY_MARKER in state;
}

/**
 * «Назад»: браузер восстанавливает позицию прежней записи уже ПОСЛЕ popstate
 * (наблюдалось: 2725 → 1703), и до или после нашего scrollTo — зависит от
 * нагрузки. Поэтому короткое время возвращаем позицию на каждом кадре, пока
 * посетитель сам не начал прокручивать.
 */
function holdScroll(y: number): void {
  const until = performance.now() + HOLD_MS;
  const stop = () => {
    done = true;
    for (const type of USER_SCROLL) window.removeEventListener(type, stop);
  };
  let done = false;
  for (const type of USER_SCROLL) window.addEventListener(type, stop, { passive: true });
  const tick = () => {
    if (done) return;
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
    if (performance.now() < until) window.requestAnimationFrame(tick);
    else stop();
  };
  window.requestAnimationFrame(tick);
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

    // history.back() при закрытии заставил бы браузер «восстановить» позицию
    // записи, и она расходится с сохранённой (наблюдалось: 2725 → 1703).
    // Позицию возвращаем сами, поэтому восстановление браузера на это время выключено.
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
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
      if (ownsTopHistoryEntry()) {
        window.addEventListener(
          'popstate',
          () => window.setTimeout(() => (window.history.scrollRestoration = restoration), 0),
          { once: true },
        );
        window.history.back();
      } else {
        window.history.scrollRestoration = restoration;
        holdScroll(scrollY);
      }
    };
  }, [exploring]);
}
