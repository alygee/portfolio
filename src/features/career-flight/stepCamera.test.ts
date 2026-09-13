import { Vector3 } from 'three';
import { smoothingFactor, stepCamera } from './stepCamera';

describe('smoothingFactor', () => {
  it('при нулевом кадре не двигается вовсе', () => {
    expect(smoothingFactor(0)).toBe(0);
  });

  it('растёт с длительностью кадра, не превышая единицу', () => {
    expect(smoothingFactor(0.016)).toBeGreaterThan(0);
    expect(smoothingFactor(0.016)).toBeLessThan(smoothingFactor(0.1));
    expect(smoothingFactor(100)).toBeLessThanOrEqual(1);
  });
});

describe('stepCamera', () => {
  const from = () => new Vector3(0, 0, 0);
  const to = new Vector3(10, 0, 0);

  it('приближается к цели, но не достигает её за один короткий кадр', () => {
    const next = stepCamera(from(), to, 0.016);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(10);
  });

  it('не перелетает цель даже при огромном кадре', () => {
    const next = stepCamera(from(), to, 10);
    expect(next.x).toBeLessThanOrEqual(10);
    expect(next.x).toBeCloseTo(10, 3);
  });

  it('за много кадров сходится к цели', () => {
    let current = from();
    for (let i = 0; i < 240; i += 1) current = stepCamera(current, to, 0.016);
    expect(current.distanceTo(to)).toBeLessThan(0.01);
  });

  it('не мутирует переданные векторы', () => {
    const current = from();
    const desired = to.clone();
    stepCamera(current, desired, 0.5);
    expect(current.toArray()).toEqual([0, 0, 0]);
    expect(desired.toArray()).toEqual([10, 0, 0]);
  });
});
