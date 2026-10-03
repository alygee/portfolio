import { displayJobs } from '@/content';
import { STATION_SIZE, route, stationPosition } from '../route';
import { DEFAULT_SCENE_CONFIG } from '../sceneConfig';
import { TERRAIN, buildTerrain, terrainBounds, type Point3 } from './layout';

const ROUTE_SAMPLES = 200;

export const routeSamples: readonly Point3[] = Array.from({ length: ROUTE_SAMPLES + 1 }, (_, i) =>
  route.getPointAt(i / ROUTE_SAMPLES),
);

const stationFloors: readonly Point3[] = displayJobs.map((_, index) => {
  const station = stationPosition(index);
  return { x: station.x, y: station.y - STATION_SIZE / 2, z: station.z };
});

/**
 * Рельеф маршрута — модульный синглтон, как и `route`: считается один раз при
 * загрузке ленивого чанка. Поле шире маршрута на дальность тумана — край мира
 * растворяется раньше, чем становится виден. Лишняя клетка запаса покрывает
 * выгиб кривой между точками выборки. Панель leva может увеличить туман в
 * разработке, и тогда край проступит; дефолт это исключает (тест).
 */
export const terrainColumns = buildTerrain({
  samples: routeSamples,
  stations: stationFloors,
  bounds: terrainBounds(routeSamples, DEFAULT_SCENE_CONFIG.fog.far + TERRAIN.cell),
});
