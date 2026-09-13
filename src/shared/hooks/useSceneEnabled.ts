import { useEffect, useState } from 'react';
import { detectWebGL, shouldEnableScene } from '@/shared/lib/sceneSupport';

/**
 * Решает, монтировать ли 3D-слой. Возвращает false до окончания проверки:
 * страница обязана быть полезной без сцены, поэтому «ещё не знаю» — это «нет».
 */
export function useSceneEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const hasWebGL = detectWebGL();

    // Ранний выход с заведомо проходным gpuTier: 2 (>= MIN_GPU_TIER). Смысл не в
    // самом значении, а в том, чтобы прогнать проверки движения и WebGL без учёта
    // GPU. Если они уже провалили сцену, детектор detect-gpu вообще не
    // импортируется — его вес не уходит в бандл впустую. Настоящий tier
    // подставится ниже, после реальной асинхронной проверки.
    if (!shouldEnableScene({ prefersReducedMotion, hasWebGL, gpuTier: 2 })) return;

    let cancelled = false;
    void (async () => {
      const { getGPUTier } = await import('detect-gpu');
      const { tier } = await getGPUTier();
      if (cancelled) return;
      setEnabled(shouldEnableScene({ prefersReducedMotion, hasWebGL, gpuTier: tier }));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
