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
    setEnabled(shouldEnableScene({ prefersReducedMotion, hasWebGL: detectWebGL() }));
  }, []);

  return enabled;
}
