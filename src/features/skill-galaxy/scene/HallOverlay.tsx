import { useEffect, useRef, type MouseEvent } from 'react';
import { useStore } from 'zustand';
import { dispatchScene, sceneStore, useSceneState } from '@/entities/scene-mode/sceneStore';
import { hallGraph } from './hallData';
import { hoverStore } from './hallInteraction';
import { describeNode } from './nodeDetails';

const ORDER = hallGraph.nodes.map((node) => node.id);
const LABELS = new Map(hallGraph.nodes.map((node) => [node.id, node.label]));

function goToStation(event: MouseEvent<HTMLAnchorElement>, id: string) {
  event.preventDefault();
  // Закрытие зала снимает свою запись истории (history.back в useHallDocument),
  // и на popstate браузер восстанавливает позицию прокрутки. Прокрутка к
  // станции — после этого, иначе восстановление перебьёт её.
  window.addEventListener(
    'popstate',
    () => window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 0),
    { once: true },
  );
  dispatchScene({ type: 'closeHall' });
}

/**
 * DOM-интерфейс режима исследования: диалог с подсказкой, кнопкой «Закрыть»,
 * карточкой выбранного узла и подсказкой при наведении. Лежит вне
 * `.scene-layer` (`aria-hidden`), иначе диалог был бы скрыт от скринридеров.
 * Сам диалог прозрачен для указателя — вращать зал можно сквозь него; панели
 * указатель получают.
 */
export function HallOverlay() {
  const exploring = useSceneState((state) => state.mode === 'exploring');
  const selectedId = useSceneState((state) => state.selectedId);
  const hover = useStore(hoverStore, (state) => state.hover);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (exploring) closeButton.current?.focus();
  }, [exploring]);

  // Стрелки слушает окно, а не диалог: после щелчка по канвасу фокус уходит
  // на body, и обработчик на диалоге их бы не получил. Исключение — поля
  // ввода, где стрелки двигают курсор.
  useEffect(() => {
    if (!exploring) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }
      const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (direction === 0) return;
      event.preventDefault();
      const { selectedId: current } = sceneStore.getState();
      const index = current === null ? (direction === 1 ? -1 : 0) : ORDER.indexOf(current);
      dispatchScene({
        type: 'select',
        id: ORDER[(index + direction + ORDER.length) % ORDER.length]!,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [exploring]);

  if (!exploring) return null;

  const details = selectedId === null ? null : describeNode(selectedId);

  return (
    <div className="hall-overlay" role="dialog" aria-modal="true" aria-labelledby="hall-title">
      <header className="hall-overlay__panel">
        <h2 id="hall-title">Skill hall</h2>
        <p className="hall-overlay__hint">
          Drag to rotate. ← → to cycle nodes. Esc to exit.
        </p>
        <button ref={closeButton} type="button" onClick={() => dispatchScene({ type: 'closeHall' })}>
          Close
        </button>
      </header>

      <section className="hall-overlay__panel hall-card" aria-label="Selected node" aria-live="polite">
        {details === null ? (
          <p>Select a node by clicking or with the arrow keys.</p>
        ) : (
          <>
            <h3>{details.title}</h3>
            <p className="hall-card__meta">{details.meta}</p>
            {details.links.length > 0 && (
              <>
                <h4>{details.linksTitle}</h4>
                <ul>
                  {details.links.map((link) => (
                    <li key={link.id}>
                      {link.kind === 'job' && link.href !== null && (
                        <a href={link.href} onClick={(event) => goToStation(event, link.id)}>
                          {link.label}
                        </a>
                      )}
                      {link.kind === 'project' && link.href !== null && (
                        <a href={link.href} target="_blank" rel="noopener noreferrer">
                          {link.label}
                        </a>
                      )}
                      {link.kind === 'skill' && link.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {details.bridges.length > 0 && (
              <>
                <h4>What carries over to ML</h4>
                <ul>
                  {details.bridges.map((bridge) => (
                    <li key={bridge.pair}>
                      <span className="bridge__pair">{bridge.pair}</span> — {bridge.why}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </section>

      {hover !== null && (
        <div className="hall-tooltip" aria-hidden="true" style={{ left: hover.x, top: hover.y }}>
          {LABELS.get(hover.id)}
        </div>
      )}
    </div>
  );
}
