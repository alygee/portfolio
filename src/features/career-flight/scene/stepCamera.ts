import type { Vector3 } from 'three';

const DEFAULT_SMOOTHING = 4;

/**
 * Доля пути до цели, проходимая за кадр. Экспоненциальная форма делает
 * сглаживание независимым от частоты кадров: на 30 и 144 fps движение
 * выглядит одинаково.
 */
export function smoothingFactor(delta: number, smoothing = DEFAULT_SMOOTHING): number {
  return 1 - Math.exp(-smoothing * delta);
}

export function stepCamera(
  current: Vector3,
  desired: Vector3,
  delta: number,
  smoothing = DEFAULT_SMOOTHING,
): Vector3 {
  return current.clone().lerp(desired, smoothingFactor(delta, smoothing));
}
