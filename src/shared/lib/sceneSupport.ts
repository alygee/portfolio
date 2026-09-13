export type SceneSupport = {
  prefersReducedMotion: boolean;
  hasWebGL: boolean;
  /** null — класс GPU ещё не определён. */
  gpuTier: number | null;
};

/** Минимальный класс GPU, на котором сцена допускается. */
const MIN_GPU_TIER = 2;

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
