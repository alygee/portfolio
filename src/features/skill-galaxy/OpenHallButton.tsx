import { useEffect, useRef } from 'react';
import { dispatchScene, useSceneState } from '@/entities/scene-mode/sceneStore';

/**
 * Вход в режим исследования (спека зала, §5.5). Без готовой сцены кнопки нет:
 * без WebGL, при reduced-motion или упавшем чанке она открывала бы пустоту.
 * В исследовании кнопка остаётся в DOM под скрытым `main` — чтобы вернуть на
 * неё фокус, когда зал закроют любым путём.
 */
export function OpenHallButton() {
  const mode = useSceneState((state) => state.mode);
  const ready = useSceneState((state) => state.sceneReady);
  const button = useRef<HTMLButtonElement>(null);
  const previous = useRef(mode);

  useEffect(() => {
    if (previous.current === 'exploring' && mode === 'docked') button.current?.focus();
    previous.current = mode;
  }, [mode]);

  if (!ready || mode === 'travelling') return null;

  return (
    <button
      ref={button}
      type="button"
      className="open-hall"
      onClick={() => dispatchScene({ type: 'openHall' })}
    >
      Открыть зал навыков
    </button>
  );
}
