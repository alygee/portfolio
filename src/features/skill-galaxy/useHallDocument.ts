import { useEffect } from 'react';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';

export const HALL_OPEN_CLASS = 'hall-open';
const HISTORY_MARKER = 'skillHall';

// Отложенный сброс режима восстановления прокрутки. Зал могут открыть снова
// раньше, чем он сработает: тогда его надо отменить, а исходный режим —
// унаследовать, иначе manual остался бы у посетителя навсегда.
let pendingReset: { timer: number; value: ScrollRestoration } | null = null;

function scheduleRestoration(value: ScrollRestoration): void {
  pendingReset = {
    value,
    timer: window.setTimeout(() => {
      pendingReset = null;
      window.history.scrollRestoration = value;
    }, 0),
  };
}

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

    // history.back() при закрытии заставил бы браузер «восстановить» позицию
    // записи, и она расходится с сохранённой (наблюдалось: 2725 → 1703).
    // Позицию возвращаем сами, поэтому восстановление браузера на это время выключено.
    let restoration = window.history.scrollRestoration;
    if (pendingReset !== null) {
      window.clearTimeout(pendingReset.timer);
      restoration = pendingReset.value;
      pendingReset = null;
    }
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
          () => scheduleRestoration(restoration),
          { once: true },
        );
        window.history.back();
      } else {
        // «Назад»: режим сбрасываем не внутри popstate, а позже. Браузер
        // восстанавливает позицию прежней записи уже после обработчиков, и при
        // сброшенном в 'auto' режиме она перебивала нашу (2725 → 1703).
        // Измерено e2e: с отложенным сбросом holdScroll-подобная страховка не нужна.
        scheduleRestoration(restoration);
      }
    };
  }, [exploring]);
}
