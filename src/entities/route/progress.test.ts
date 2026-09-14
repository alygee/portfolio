import { activeStationIndex, stationProgress } from './progress';

describe('stationProgress', () => {
  it('первая станция в начале, последняя в конце маршрута', () => {
    expect(stationProgress(0, 4)).toBe(0);
    expect(stationProgress(3, 4)).toBe(1);
  });

  it('распределяет станции равномерно', () => {
    expect(stationProgress(1, 4)).toBeCloseTo(1 / 3, 5);
    expect(stationProgress(2, 4)).toBeCloseTo(2 / 3, 5);
  });

  it('не делится на ноль при единственной станции', () => {
    expect(stationProgress(0, 1)).toBe(0);
  });
});

describe('activeStationIndex', () => {
  it('выбирает ближайшую станцию', () => {
    expect(activeStationIndex(0, 4)).toBe(0);
    expect(activeStationIndex(1, 4)).toBe(3);
    expect(activeStationIndex(0.34, 4)).toBe(1);
    expect(activeStationIndex(0.6, 4)).toBe(2);
  });

  it('клампит прогресс за границами', () => {
    expect(activeStationIndex(-5, 4)).toBe(0);
    expect(activeStationIndex(9, 4)).toBe(3);
  });

  it('не делится на ноль при единственной станции', () => {
    expect(activeStationIndex(0.5, 1)).toBe(0);
  });
});
