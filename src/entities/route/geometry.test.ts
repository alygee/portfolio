import { distance } from '@/shared/lib/vec3';
import {
  HALL_DOCK_DISTANCE,
  STATION_SPACING,
  hallCenter,
  hallDock,
  routeWaypoints,
  stationWaypoint,
} from './geometry';

describe('геометрия маршрута', () => {
  it('путевые точки станций — прежние: синус по X, подъём и шаг по Z', () => {
    // Значения фазы 1: перенос из route.ts не должен сдвинуть станции.
    expect(stationWaypoint(0)).toEqual({ x: 0, y: 0, z: -0 });
    const second = stationWaypoint(2);
    expect(second.x).toBeCloseTo(Math.sin(1.8) * 3, 10);
    expect(second.y).toBe(5);
    expect(second.z).toBe(-44);
  });

  it('шаг до стыковки равен шагу между станциями', () => {
    // stationProgress равномерен по индексу; длинный последний сегмент
    // развёл бы прогресс по индексу и по длине дуги, и камера перестала бы
    // останавливаться у станций (инвариант route.test.ts).
    const step = distance(stationWaypoint(3), hallDock(4));
    expect(step).toBeGreaterThan(STATION_SPACING - 0.5);
    expect(step).toBeLessThan(STATION_SPACING + 0.5);
  });

  it('стыковка выше и дальше последней станции', () => {
    const last = stationWaypoint(3);
    const dock = hallDock(4);
    expect(dock.y).toBeGreaterThan(last.y);
    expect(dock.z).toBeLessThan(last.z);
  });

  it('центр зала — на HALL_DOCK_DISTANCE дальше стыковки, на её высоте', () => {
    const dock = hallDock(4);
    const center = hallCenter(4);
    expect(center.y).toBe(dock.y);
    expect(dock.z - center.z).toBe(HALL_DOCK_DISTANCE);
    expect(distance(dock, center)).toBe(HALL_DOCK_DISTANCE);
  });

  it('путевые точки: станции, затем стыковка', () => {
    const points = routeWaypoints(4);
    expect(points).toHaveLength(5);
    expect(points[4]).toEqual(hallDock(4));
    expect(points[1]).toEqual(stationWaypoint(1));
  });

  it('без станций стыковка считается от начала координат, без NaN', () => {
    const dock = hallDock(0);
    expect(Number.isFinite(dock.x + dock.y + dock.z)).toBe(true);
  });
});
