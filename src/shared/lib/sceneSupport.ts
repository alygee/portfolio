export type SceneSupport = {
  prefersReducedMotion: boolean;
  hasWebGL: boolean;
};

/**
 * Решение о монтировании 3D-слоя. Оба условия проверяются синхронно.
 *
 * Класс видеокарты сознательно не участвует. Прежде здесь работал detect-gpu с
 * порогом tier >= 2, и он отсекал исправные машины: Intel Alder Lake GT2 под
 * Mesa библиотека сопоставляла с Coffee Lake Iris Plus 655 и оценивала в 26 fps.
 * Её шкала описывает тяжёлую эталонную сцену, а не нашу, плюс она требовала
 * запроса к внешнему CDN в рантайме. За качеством картинки следит
 * PerformanceMonitor в сцене — по фактическим кадрам, а не по названию GPU.
 * Случай «WebGL есть, но сцена падает» закрывает ErrorBoundary вокруг слоя.
 */
export function shouldEnableScene(support: SceneSupport): boolean {
  if (support.prefersReducedMotion) return false;
  return support.hasWebGL;
}

export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null;
  } catch {
    return false;
  }
}
