import type { SceneMode } from '@/entities/scene-mode/sceneMode';

/**
 * Вращение зала. Вращается галактика, а не камера: камера у зала не покидает
 * точку стыковки, и поле рельефа не приходится расширять (спека зала, §5.1).
 */
export type Spin = { yaw: number; pitch: number; yawVelocity: number; pitchVelocity: number };

export const SPIN = {
  /** Собственное вращение в стыковке, рад/с. */
  idleSpeed: 0.12,
  /** Затухание инерции после отпускания, 1/с. */
  damping: 3,
  /** Предел наклона, рад. */
  maxPitch: 0.6,
  /** Радиан на пиксель перетаскивания. */
  dragGain: 0.006,
  /** Предел скорости инерции, рад/с. */
  maxVelocity: 4,
} as const;

export const INITIAL_SPIN: Spin = { yaw: 0, pitch: 0, yawVelocity: 0, pitchVelocity: 0 };

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

export function stepSpin(spin: Spin, delta: number, mode: SceneMode, dragging: boolean): Spin {
  // В полёте зал неподвижен: кадр у маршрута стабилен (на этом держатся
  // пиксельные e2e), а GPU не тратится на далёкую анимацию.
  if (mode === 'travelling' || dragging) return spin;
  if (mode === 'docked') {
    return { ...spin, yaw: spin.yaw + SPIN.idleSpeed * delta, yawVelocity: 0, pitchVelocity: 0 };
  }
  const decay = Math.exp(-SPIN.damping * delta);
  return {
    yaw: spin.yaw + spin.yawVelocity * delta,
    pitch: clamp(spin.pitch + spin.pitchVelocity * delta, SPIN.maxPitch),
    yawVelocity: spin.yawVelocity * decay,
    pitchVelocity: spin.pitchVelocity * decay,
  };
}

/** Смещение указателя за `dt` секунд → углы и скорость для инерции. */
export function dragSpin(spin: Spin, dx: number, dy: number, dt: number): Spin {
  const yawStep = dx * SPIN.dragGain;
  const pitchStep = dy * SPIN.dragGain;
  const velocity = (step: number) => (dt > 0 ? clamp(step / dt, SPIN.maxVelocity) : 0);
  return {
    yaw: spin.yaw + yawStep,
    pitch: clamp(spin.pitch + pitchStep, SPIN.maxPitch),
    yawVelocity: velocity(yawStep),
    pitchVelocity: velocity(pitchStep),
  };
}
