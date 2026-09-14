import { CatmullRomCurve3, Vector3 } from 'three';
import { displayJobs } from '@/content';
import { clamp01 } from '@/shared/lib/math';
import { activeStationIndex, stationProgress } from './routeProgress';

// Реэкспорт: сама математика прогресса живёт в `routeProgress.ts`, у неё нет
// зависимости на `three` — это важно для кода в главном чанке (см. комментарий
// там). Здесь только ре-экспорт, чтобы импортёры `./route` не заметили разницы.
export { activeStationIndex, stationProgress };

/** Насколько далеко вперёд по маршруту смотрит камера. */
export const LOOK_AHEAD = 8;

const STATION_SPACING = 22;
const STATION_RISE = 2.5;
const STATION_SIDE_OFFSET = 6;

/** Точка маршрута, с которой видна станция с этим индексом. */
export function cameraWaypoint(index: number): Vector3 {
  return new Vector3(
    Math.sin(index * 0.9) * 3,
    index * STATION_RISE,
    -index * STATION_SPACING,
  );
}

/** Сама станция стоит сбоку от маршрута, чтобы камера пролетала мимо, а не сквозь. */
export function stationPosition(index: number): Vector3 {
  const side = index % 2 === 0 ? 1 : -1;
  return cameraWaypoint(index).add(new Vector3(side * STATION_SIDE_OFFSET, 0, 0));
}

export function buildRoute(stationCount: number): CatmullRomCurve3 {
  const points = Array.from({ length: stationCount }, (_, i) => cameraWaypoint(i));
  return new CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

/**
 * Маршрут камеры, общий для всего приложения. Это модульный синглтон:
 * `CatmullRomCurve3` хранит мутируемые публичные поля (`points`, `closed`,
 * `curveType`), но их нельзя менять — код, который дёргает камеру в цикле
 * рендера, рассчитывает на одну и ту же кривую. Нужна другая геометрия —
 * вызывай `buildRoute` и работай со своим экземпляром, а не правь этот.
 */
export const route = buildRoute(displayJobs.length);

export function progressToCamera(t: number): { position: Vector3; target: Vector3 } {
  const clamped = clamp01(t);
  const position = route.getPointAt(clamped);
  // Цель задаётся касательной, а не точкой «t + шаг»: так конец маршрута
  // не становится краевым случаем с нулевым направлением взгляда.
  const tangent = route.getTangentAt(clamped).multiplyScalar(LOOK_AHEAD);
  return { position, target: position.clone().add(tangent) };
}
