import { useSyncExternalStore } from 'react';
import { detectWebGL, shouldEnableScene } from '@/shared/lib/sceneSupport';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// detectWebGL создаёт canvas ради getContext — дорогая операция, а
// getSnapshot React вызывает часто (на каждый коммит, при подписке и т.д.).
// Поддержка WebGL в рамках одной сессии не меняется, поэтому результат
// кешируется на уровне модуля, а не пересчитывается на каждый снимок.
let cachedHasWebGL: boolean | null = null;
function hasWebGL(): boolean {
  if (cachedHasWebGL === null) {
    cachedHasWebGL = detectWebGL();
  }
  return cachedHasWebGL;
}

function getSnapshot(): boolean {
  const prefersReducedMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  return shouldEnableScene({ prefersReducedMotion, hasWebGL: hasWebGL() });
}

// На сервере при предрендере нет ни `window`, ни canvas — тот же серверный
// дефолт, что и раньше. React использует этот снимок при гидрации, поэтому
// разметка не расходится, а затем сам вызывает getSnapshot и при
// необходимости перерисовывает.
function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

/**
 * Решает, монтировать ли 3D-слой. `prefers-reduced-motion` — системная
 * настройка, которую можно переключить без перезагрузки страницы, поэтому
 * значение читается через `useSyncExternalStore`, а не один раз в эффекте:
 * изменение настройки применяется сразу, без ремонта хука.
 */
export function useSceneEnabled(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
