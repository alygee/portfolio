import { distance, length } from './vec3';

describe('vec3', () => {
  it('distance — евклидово расстояние', () => {
    expect(distance({ x: 1, y: 2, z: 3 }, { x: 4, y: 6, z: 3 })).toBe(5);
  });

  it('length — длина вектора', () => {
    expect(length({ x: 0, y: 3, z: 4 })).toBe(5);
  });
});
