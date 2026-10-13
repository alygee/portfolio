import type { Vec3 } from '@/shared/lib/vec3';

/**
 * Путевые точки маршрута и положение зала — чистая математика без `three`.
 * Нужна двум фичам сразу: `career-flight` строит по ней кривую камеры,
 * `skill-galaxy` ставит зал в его центр. Импорт между фичами запрещён, а
 * `career-flight/scene/route.ts` тянет `three`, поэтому формулы живут здесь.
 */
export const STATION_SPACING = 22;
export const STATION_RISE = 2.5;

/** Угол подъёма от последней станции к стыковке, рад. */
export const HALL_CLIMB = 0.78;
/** От точки стыковки до центра зала. */
export const HALL_DOCK_DISTANCE = 26;
/** Все узлы зала лежат внутри сферы этого радиуса (инвариант раскладки). */
export const HALL_RADIUS = 11;

/** Точка маршрута, с которой видна станция с этим индексом. */
export function stationWaypoint(index: number): Vec3 {
  return { x: Math.sin(index * 0.9) * 3, y: index * STATION_RISE, z: -index * STATION_SPACING };
}

/**
 * Стыковка — последняя точка маршрута: шаг длиной `STATION_SPACING` вверх и
 * вперёд от последней станции. Длина шага та же, что между станциями: иначе
 * прогресс, равномерный по индексу, разошёлся бы с длиной дуги.
 */
export function hallDock(stationCount: number): Vec3 {
  const last = stationCount > 0 ? stationWaypoint(stationCount - 1) : { x: 0, y: 0, z: 0 };
  return {
    x: 0,
    y: last.y + STATION_SPACING * Math.sin(HALL_CLIMB),
    z: last.z - STATION_SPACING * Math.cos(HALL_CLIMB),
  };
}

/** Центр зала — прямо по курсу от стыковки, на её высоте. */
export function hallCenter(stationCount: number): Vec3 {
  const dock = hallDock(stationCount);
  return { x: dock.x, y: dock.y, z: dock.z - HALL_DOCK_DISTANCE };
}

/** Путевые точки маршрута: станции по порядку, затем стыковка. */
export function routeWaypoints(stationCount: number): Vec3[] {
  return [
    ...Array.from({ length: stationCount }, (_, index) => stationWaypoint(index)),
    hallDock(stationCount),
  ];
}
