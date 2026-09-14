export type SceneSupport = {
  prefersReducedMotion: boolean;
  hasWebGL: boolean;
  /** null — класс GPU ещё не определён. */
  gpuTier: number | null;
};

/**
 * Минимальный класс GPU, на котором сцена допускается.
 *
 * Отсекается только tier 0 — это WEBGL_UNSUPPORTED и BLOCKLISTED, то есть
 * случаи, когда WebGL нерабочий или заведомо глючный. Всё остальное монтируется,
 * а за качеством следит PerformanceMonitor в сцене: он снижает разрешение по
 * фактическим кадрам, а не по догадке о названии видеокарты.
 *
 * Порог был tier >= 2 и отсекал реальные рабочие машины. Шкала detect-gpu
 * описывает его собственную тяжёлую эталонную сцену: Intel Alder Lake GT2 под
 * Mesa он сопоставляет с Coffee Lake Iris Plus 655 и оценивает в 26 fps, что даёт
 * tier 1 при границе tier 2 в 30 fps. Наша сцена — четыре примитива, сетка и
 * туман, она несопоставимо легче, поэтому чужая шкала к ней неприменима.
 */
export const MIN_GPU_TIER = 1;

export function shouldEnableScene(support: SceneSupport): boolean {
  if (support.prefersReducedMotion) return false;
  if (!support.hasWebGL) return false;
  if (support.gpuTier === null) return false;
  return support.gpuTier >= MIN_GPU_TIER;
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}
