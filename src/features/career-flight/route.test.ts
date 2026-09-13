import { jobs } from '@/content';
import {
  activeStationIndex,
  cameraWaypoint,
  progressToCamera,
  route,
  stationPosition,
  stationProgress,
} from './route';

const COUNT = jobs.length;

describe('геометрия маршрута', () => {
  it('станции расставлены вдоль уходящей вдаль оси Z', () => {
    const zs = Array.from({ length: COUNT }, (_, i) => cameraWaypoint(i).z);
    expect([...zs].sort((a, b) => b - a)).toEqual(zs);
  });

  it('станции стоят в стороне от маршрута, а не на нём', () => {
    for (let i = 0; i < COUNT; i += 1) {
      expect(stationPosition(i).distanceTo(cameraWaypoint(i))).toBeGreaterThan(1);
    }
  });

  it('станции чередуют сторону маршрута', () => {
    const sides = Array.from({ length: COUNT }, (_, i) =>
      Math.sign(stationPosition(i).x - cameraWaypoint(i).x),
    );
    for (let i = 1; i < sides.length; i += 1) {
      expect(sides[i]).not.toBe(sides[i - 1]);
    }
  });
});

describe('stationProgress', () => {
  it('первая станция в начале, последняя в конце маршрута', () => {
    expect(stationProgress(0, COUNT)).toBe(0);
    expect(stationProgress(COUNT - 1, COUNT)).toBe(1);
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
});

describe('progressToCamera', () => {
  it('в начале маршрута стоит у первой путевой точки', () => {
    const { position } = progressToCamera(0);
    expect(position.distanceTo(route.getPointAt(0))).toBeLessThan(1e-6);
  });

  it('в конце маршрута стоит у последней путевой точки', () => {
    const { position } = progressToCamera(1);
    expect(position.distanceTo(route.getPointAt(1))).toBeLessThan(1e-6);
  });

  it('движется монотонно вперёд по маршруту', () => {
    const start = progressToCamera(0).position;
    const middle = progressToCamera(0.5).position;
    const end = progressToCamera(1).position;
    expect(start.distanceTo(middle)).toBeGreaterThan(0);
    expect(start.distanceTo(end)).toBeGreaterThan(start.distanceTo(middle));
  });

  it('смотрит вперёд по ходу движения, в том числе в самом конце', () => {
    for (const t of [0, 0.5, 1]) {
      const { position, target } = progressToCamera(t);
      const toTarget = target.clone().sub(position);
      expect(toTarget.length()).toBeGreaterThan(0.5);
      expect(toTarget.normalize().dot(route.getTangentAt(t === 1 ? 1 : t))).toBeGreaterThan(0.5);
    }
  });

  it('клампит прогресс за границами диапазона', () => {
    expect(progressToCamera(-2).position.distanceTo(progressToCamera(0).position)).toBe(0);
    expect(progressToCamera(4).position.distanceTo(progressToCamera(1).position)).toBe(0);
  });
});
