import { INITIAL_SPIN, SPIN, dragSpin, stepSpin } from './spin';

describe('stepSpin', () => {
  it('в полёте зал неподвижен', () => {
    expect(stepSpin(INITIAL_SPIN, 0.1, 'travelling', false)).toBe(INITIAL_SPIN);
  });

  it('в стыковке медленно вращается по yaw', () => {
    expect(stepSpin(INITIAL_SPIN, 1, 'docked', false).yaw).toBeCloseTo(SPIN.idleSpeed, 10);
  });

  it('пока указатель тянет, шаг кадра углы не трогает', () => {
    const dragged = { ...INITIAL_SPIN, yawVelocity: 2 };
    expect(stepSpin(dragged, 0.1, 'exploring', true)).toBe(dragged);
  });

  it('в исследовании после отпускания — инерция с затуханием', () => {
    const released = { ...INITIAL_SPIN, yawVelocity: 2 };
    const next = stepSpin(released, 0.1, 'exploring', false);
    expect(next.yaw).toBeCloseTo(0.2, 10);
    expect(next.yawVelocity).toBeLessThan(2);
    expect(next.yawVelocity).toBeGreaterThan(0);
  });

  it('наклон ограничен', () => {
    const spinning = { ...INITIAL_SPIN, pitch: SPIN.maxPitch, pitchVelocity: 3 };
    expect(stepSpin(spinning, 0.5, 'exploring', false).pitch).toBe(SPIN.maxPitch);
  });
});

describe('dragSpin', () => {
  it('смещение указателя поворачивает зал и задаёт скорость', () => {
    const next = dragSpin(INITIAL_SPIN, 100, 0, 0.2);
    expect(next.yaw).toBeCloseTo(100 * SPIN.dragGain, 10);
    expect(next.yawVelocity).toBeCloseTo((100 * SPIN.dragGain) / 0.2, 10);
  });

  it('скорость ограничена, нулевой интервал не даёт бесконечность', () => {
    expect(dragSpin(INITIAL_SPIN, 5000, 0, 0.001).yawVelocity).toBe(SPIN.maxVelocity);
    expect(dragSpin(INITIAL_SPIN, 10, 0, 0).yawVelocity).toBe(0);
  });

  it('наклон не выходит за предел', () => {
    expect(dragSpin(INITIAL_SPIN, 0, 10_000, 0.1).pitch).toBe(SPIN.maxPitch);
  });
});
