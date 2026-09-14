import { stationProgress } from '@/features/career-flight/routeProgress';
import { sectionsToProgress } from './scrollProgress';

/**
 * Прогресс маршрута считается от фактических позиций секций работ, а не от
 * полной высоты документа: шапка, «Навыки» и «Образование» станциями не
 * являются. Инвариант: когда N-я секция работы стоит в точке обзора, прогресс
 * равен `stationProgress(N)` — то есть обе системы координат это одна система.
 */
const FOUR = { offsets: [400, 1400, 2400, 3400], scrollLimit: 5000 };

describe('sectionsToProgress', () => {
  it('на первой секции работ даёт 0, на последней — 1', () => {
    expect(sectionsToProgress({ ...FOUR, viewOffset: 400 })).toBe(0);
    expect(sectionsToProgress({ ...FOUR, viewOffset: 3400 })).toBe(1);
  });

  it('на каждой секции даёт в точности прогресс её станции', () => {
    FOUR.offsets.forEach((offset, index) => {
      expect(sectionsToProgress({ ...FOUR, viewOffset: offset })).toBeCloseTo(
        stationProgress(index, FOUR.offsets.length),
        10,
      );
    });
  });

  it('ровно посередине между соседними секциями даёт ровно середину их прогрессов', () => {
    const middle = sectionsToProgress({ ...FOUR, viewOffset: 1900 });
    const between = (stationProgress(1, 4) + stationProgress(2, 4)) / 2;
    expect(middle).toBeCloseTo(between, 10);
  });

  it('не зависит от высоты документа за последней секцией', () => {
    // Тот же прогресс при вдвое более длинном хвосте страницы: «Навыки» и
    // «Образование» не сдвигают станции.
    const short = sectionsToProgress({ ...FOUR, viewOffset: 1900, scrollLimit: 4200 });
    const long = sectionsToProgress({ ...FOUR, viewOffset: 1900, scrollLimit: 9000 });
    expect(short).toBe(long);
  });

  it('секция за пределом скролла всё равно достигается в конце документа', () => {
    // Если хвоста страницы не хватает, чтобы докрутить последнюю секцию до
    // точки обзора, её позиция поджимается к предельной позиции скролла —
    // иначе прогресс 1 был бы недостижим.
    const input = { offsets: [0, 1000, 5000], scrollLimit: 1200 };
    expect(sectionsToProgress({ ...input, viewOffset: 1200 })).toBe(1);
  });

  it('в документе без секций работ даёт 0, а не NaN', () => {
    expect(sectionsToProgress({ offsets: [], viewOffset: 900, scrollLimit: 5000 })).toBe(0);
    expect(sectionsToProgress({ offsets: [400], viewOffset: 900, scrollLimit: 5000 })).toBe(0);
  });

  it('на нескроллируемом документе даёт 0, а не NaN', () => {
    expect(sectionsToProgress({ offsets: [400, 1400], viewOffset: 0, scrollLimit: 0 })).toBe(0);
    expect(
      sectionsToProgress({ offsets: [400, 1400], viewOffset: 0, scrollLimit: -200 }),
    ).toBe(0);
  });

  it('клампит инерционный перескролл за границы', () => {
    expect(sectionsToProgress({ ...FOUR, viewOffset: -300 })).toBe(0);
    expect(sectionsToProgress({ ...FOUR, viewOffset: 99_000 })).toBe(1);
  });
});
