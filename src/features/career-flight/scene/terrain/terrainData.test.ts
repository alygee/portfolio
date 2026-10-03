import { DEFAULT_SCENE_CONFIG } from '../sceneConfig';
import { STATION_SIZE, route, stationPosition } from '../route';
import { displayJobs } from '@/content';
import { MAX_TERRAIN_INSTANCES, TERRAIN, footprintDistance } from './layout';
import { terrainColumns } from './terrainData';

// Плотная выборка, независимая от той, по которой строилась раскладка (200
// точек): так ловится выгиб кривой между точками исходной выборки.
const dense = Array.from({ length: 1001 }, (_, i) => route.getPointAt(i / 1000));
const top = (height: number) => TERRAIN.groundY + height;

describe('рельеф настоящего маршрута', () => {
  it('укладывается в бюджет экземпляров', () => {
    expect(terrainColumns.length).toBeGreaterThan(0);
    expect(terrainColumns.length).toBeLessThanOrEqual(MAX_TERRAIN_INSTANCES);
  });

  it('камера нигде не задевает столбики', () => {
    for (const column of terrainColumns) {
      for (const point of dense) {
        if (footprintDistance(point, column, TERRAIN.cell) < 2) {
          expect(top(column.height)).toBeLessThanOrEqual(point.y - 2);
        }
      }
    }
  });

  it('станции не закопаны в рельеф', () => {
    displayJobs.forEach((_, index) => {
      const station = stationPosition(index);
      const floorY = station.y - STATION_SIZE / 2;
      for (const column of terrainColumns) {
        if (footprintDistance(station, column, TERRAIN.cell) < STATION_SIZE / 2) {
          expect(top(column.height)).toBeLessThanOrEqual(floorY);
        }
      }
    });
  });

  it('край поля скрыт туманом из любой точки маршрута', () => {
    const half = TERRAIN.cell / 2;
    const minX = Math.min(...terrainColumns.map((c) => c.x)) - half;
    const maxX = Math.max(...terrainColumns.map((c) => c.x)) + half;
    const minZ = Math.min(...terrainColumns.map((c) => c.z)) - half;
    const maxZ = Math.max(...terrainColumns.map((c) => c.z)) + half;
    for (const point of dense) {
      const toEdge = Math.min(point.x - minX, maxX - point.x, point.z - minZ, maxZ - point.z);
      expect(toEdge).toBeGreaterThanOrEqual(DEFAULT_SCENE_CONFIG.fog.far);
    }
  });

  it('рельеф выразителен: есть холмы заметной высоты', () => {
    expect(Math.max(...terrainColumns.map((c) => c.height))).toBeGreaterThan(6);
  });
});
