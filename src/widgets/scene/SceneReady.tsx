import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { dispatchScene } from '@/entities/scene-mode/sceneStore';

/**
 * «Сцена готова» = канвас отрисовал первый кадр, а не просто смонтирован:
 * кнопка «Открыть зал» не должна появиться раньше, чем зал можно увидеть.
 * Снятие при размонтировании выводит из режима исследования (редьюсер).
 */
export function SceneReady() {
  const reported = useRef(false);

  useFrame(() => {
    if (reported.current) return;
    reported.current = true;
    dispatchScene({ type: 'sceneReady', ready: true });
  });

  useEffect(() => () => dispatchScene({ type: 'sceneReady', ready: false }), []);

  return null;
}
