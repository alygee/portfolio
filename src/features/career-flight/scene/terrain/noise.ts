/**
 * Шум значений (value noise): в каждом целочисленном узле решётки — случайное,
 * но детерминированное значение (хэш координат), между узлами — гладкая
 * интерполяция. На фазе 4 эта же функция переписывается на GLSL, поэтому
 * здесь нет ничего, чего нельзя выразить в шейдере: только целочисленная
 * арифметика хэша и смешивание.
 */
export function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed + 1, 1597334677);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Кривая сглаживания 3t² − 2t³: нулевая производная в узлах убирает «швы» между клетками. */
function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x: number, z: number, seed = 0): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fz = fade(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const near = a + (b - a) * fx;
  const far = c + (d - c) * fx;
  return near + (far - near) * fz;
}

/**
 * Фрактальный шум: сумма октав, каждая вдвое мельче по размеру и вдвое слабее.
 * Результат нормирован суммой амплитуд, поэтому остаётся в [0, 1].
 */
export function fbm2D(x: number, z: number, { octaves = 4, seed = 0 } = {}): number {
  let sum = 0;
  let norm = 0;
  let amplitude = 1;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise2D(x * frequency, z * frequency, seed + octave) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}
