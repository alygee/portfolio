import { CatmullRomCurve3, Vector3 } from 'three';
import { jobs } from '@/content';
import { clamp01 } from '@/shared/lib/math';

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
export const route = buildRoute(jobs.length);

/**
 * Прогресс станции — приближение, равномерное по **индексу** станции
 * (`i / (count - 1)`), а не по длине дуги маршрута. Камера же движется по
 * `route.getPointAt(t)`, то есть по arc-length параметризации. Это разные
 * параметризации, и в общем случае они не совпадают: путевые точки лежат на
 * кривой неэквидистантно из-за синусоидального смещения по X в
 * `cameraWaypoint`.
 *
 * Расхождение остаётся малым, потому что это смещение (амплитуда 3) мало по
 * сравнению с шагом между станциями (`STATION_SPACING` = 22) — путевые точки
 * почти эквидистантны. Поэтому здесь используется простая формула по
 * индексу, а не arc-length инверсия: она дешевле и не привязывает эту
 * чистую функцию к конкретной кривой. Гарантия, что камера всё равно
 * останавливается достаточно близко к каждой станции, зафиксирована тестом
 * «камера останавливается рядом со станцией в её прогрессе» в
 * `route.test.ts`.
 */
export function stationProgress(index: number, count: number): number {
  if (count <= 1) return 0;
  return index / (count - 1);
}

export function activeStationIndex(t: number, count: number): number {
  if (count <= 1) return 0;
  return Math.round(clamp01(t) * (count - 1));
}

export function progressToCamera(t: number): { position: Vector3; target: Vector3 } {
  const clamped = clamp01(t);
  const position = route.getPointAt(clamped);
  // Цель задаётся касательной, а не точкой «t + шаг»: так конец маршрута
  // не становится краевым случаем с нулевым направлением взгляда.
  const tangent = route.getTangentAt(clamped).multiplyScalar(LOOK_AHEAD);
  return { position, target: position.clone().add(tangent) };
}
