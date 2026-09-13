import { clamp01 } from './math';

describe('clamp01', () => {
  it('оставляет значения внутри диапазона', () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(1)).toBe(1);
  });

  it('обрезает выходы за границы', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(1.7)).toBe(1);
  });

  it('NaN превращает в 0, чтобы кадр не ломался', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});
