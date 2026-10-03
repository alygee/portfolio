import { fbm2D, hash2, valueNoise2D } from './noise';

const grid = (step: number, size: number) =>
  Array.from({ length: size * size }, (_, i) => [(i % size) * step, Math.floor(i / size) * step] as const);

describe('hash2', () => {
  it('детерминирован и лежит в [0, 1)', () => {
    for (const [x, z] of grid(1, 20)) {
      const value = hash2(x, z, 0);
      expect(value).toBe(hash2(x, z, 0));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('соседние клетки получают разные значения', () => {
    const values = new Set(grid(1, 10).map(([x, z]) => hash2(x, z, 0)));
    expect(values.size).toBeGreaterThan(95);
  });

  it('зерно меняет узор', () => {
    expect(hash2(3, 7, 0)).not.toBe(hash2(3, 7, 1));
  });
});

describe('valueNoise2D', () => {
  it('в узлах решётки равен хэшу узла', () => {
    expect(valueNoise2D(4, -2)).toBe(hash2(4, -2, 0));
  });

  it('лежит в [0, 1]', () => {
    for (const [x, z] of grid(0.37, 30)) {
      const value = valueNoise2D(x - 5, z - 5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('непрерывен: малый шаг даёт малое изменение, в том числе через границу клетки', () => {
    // Регулярная сетка с шагом 0.23 почти не попадает к целым координатам,
    // поэтому к ней добавлены точки в 5e-4 от границы клетки по каждой оси:
    // шаг 1e-3 из них обязательно пересекает границу.
    const nearBoundary = Array.from({ length: 9 }, (_, i) => i - 4 - 5e-4);
    const points = [
      ...grid(0.23, 30),
      ...nearBoundary.flatMap((b) => [[b, 0.37 * b + 0.5] as const, [0.37 * b + 0.5, b] as const]),
    ];
    for (const [x, z] of points) {
      expect(Math.abs(valueNoise2D(x + 1e-3, z) - valueNoise2D(x, z))).toBeLessThan(0.01);
      expect(Math.abs(valueNoise2D(x, z + 1e-3) - valueNoise2D(x, z))).toBeLessThan(0.01);
    }
  });

  it('не вырождается в константу', () => {
    const values = grid(0.5, 20).map(([x, z]) => valueNoise2D(x, z));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    expect(Math.sqrt(variance)).toBeGreaterThan(0.05);
  });
});

describe('fbm2D', () => {
  it('с одной октавой совпадает с valueNoise2D', () => {
    expect(fbm2D(1.3, 2.7, { octaves: 1, seed: 5 })).toBe(valueNoise2D(1.3, 2.7, 5));
  });

  it('лежит в [0, 1] при любом числе октав', () => {
    for (const octaves of [1, 3, 6]) {
      for (const [x, z] of grid(0.41, 15)) {
        const value = fbm2D(x, z, { octaves });
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('добавляет мелкие детали: отличается от одной октавы', () => {
    expect(fbm2D(1.3, 2.7, { octaves: 4 })).not.toBe(fbm2D(1.3, 2.7, { octaves: 1 }));
  });
});
