import { CatmullRomCurve3, Vector3 } from 'three';
import { HALL_CENTER, HALL_DOCK, ROUTE_WAYPOINTS } from '@/entities/route/anchors';
import { stationWaypoint } from '@/entities/route/geometry';
import type { Vec3 } from '@/shared/lib/vec3';
import { clamp01 } from '@/shared/lib/math';

/** Насколько далеко вперёд по маршруту смотрит камера. */
export const LOOK_AHEAD = 8;

const STATION_SIDE_OFFSET = 6;
/** Ребро куба станции. Рельеф (terrain/) держит площадку под станцией ниже её основания. */
export const STATION_SIZE = 3;

const toVector = (point: Vec3) => new Vector3(point.x, point.y, point.z);

/** Точка маршрута, с которой видна станция с этим индексом. */
export function cameraWaypoint(index: number): Vector3 {
  return toVector(stationWaypoint(index));
}

/** Сама станция стоит сбоку от маршрута, чтобы камера пролетала мимо, а не сквозь. */
export function stationPosition(index: number): Vector3 {
  const side = index % 2 === 0 ? 1 : -1;
  return cameraWaypoint(index).add(new Vector3(side * STATION_SIDE_OFFSET, 0, 0));
}

export function buildRoute(points: readonly Vec3[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(points.map(toVector), false, 'catmullrom', 0.5);
}

/**
 * Маршрут камеры, общий для всего приложения. Это модульный синглтон:
 * `CatmullRomCurve3` хранит мутируемые публичные поля (`points`, `closed`,
 * `curveType`), но их нельзя менять — код, который дёргает камеру в цикле
 * рендера, рассчитывает на одну и ту же кривую. Нужна другая геометрия —
 * вызывай `buildRoute` и работай со своим экземпляром, а не правь этот.
 */
export const route = buildRoute(ROUTE_WAYPOINTS);

/** Стыковка зала — конец маршрута; камера в `docked`/`exploring` стоит здесь. */
export const HALL_DOCK_POINT = toVector(HALL_DOCK);
/** Центр зала — точка, на которую смотрит камера в `docked`/`exploring`. */
export const HALL_CENTER_POINT = toVector(HALL_CENTER);

export function progressToCamera(t: number): { position: Vector3; target: Vector3 } {
  const clamped = clamp01(t);
  const position = route.getPointAt(clamped);
  // Цель задаётся касательной, а не точкой «t + шаг»: так конец маршрута
  // не становится краевым случаем с нулевым направлением взгляда.
  const tangent = route.getTangentAt(clamped).multiplyScalar(LOOK_AHEAD);
  return { position, target: position.clone().add(tangent) };
}
