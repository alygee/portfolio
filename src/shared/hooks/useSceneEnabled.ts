import { useEffect, useState } from 'react';
import { detectWebGL, shouldEnableScene } from '@/shared/lib/sceneSupport';

/**
 * Решает, монтировать ли 3D-слой. Решение синхронное и принимается один раз:
 * оба условия доступны сразу, ждать нечего.
 *
 * Начальное значение `false`, а не результат проверки, потому что на сервере
 * при предрендере нет ни `window`, ни canvas: разметка обязана совпасть с
 * клиентской при гидрации, а сцена появляется первым же эффектом.
 */
export function useSceneEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    // Намеренно: значение зависит от window/WebGL, которых нет на сервере при
    // предрендере, поэтому его нельзя вычислить во время рендера без
    // расхождения с SSR-разметкой. Начальное состояние совпадает с сервером
    // (false), эффект обновляет его один раз после монтирования — стандартный
    // паттерн для гидратации.
    // oxlint-disable-next-line react/set-state-in-effect
    setEnabled(shouldEnableScene({ prefersReducedMotion, hasWebGL: detectWebGL() }));
  }, []);

  return enabled;
}
