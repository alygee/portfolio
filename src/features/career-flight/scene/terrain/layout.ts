import { fbm2D } from './noise';

export type Point3 = { readonly x: number; readonly y: number; readonly z: number };
export type TerrainBounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type TerrainColumn = { x: number; z: number; height: number };

export const TERRAIN = {
  /** Шаг сетки и ширина основания столбика. */
  cell: 2.5,
  /** Уровень земли: основание всех столбиков. */
  groundY: -4,
  /** Наибольшая высота столбика вдали от маршрута. */
  amplitude: 14,
  /** Масштаб шума: чем меньше, тем шире холмы. */
  noiseScale: 0.045,
  /** В пределах этого расстояния от маршрута действует потолок под камерой. */
  corridorRadius: 7,
  /** На этой ширине за коридором долина поднимается до полной высоты. */
  valleyWidth: 18,
  /** Насколько вершина столбика в коридоре ниже камеры. */
  cameraClearance: 3,
  /** Радиус площадки под станцией. */
  stationRadius: 5,
  /** Зазор между площадкой и основанием станции. */
  stationClearance: 0.5,
} as const;

/** Потолок числа экземпляров: бюджет кадра на мобильных (спека §7). */
export const MAX_TERRAIN_INSTANCES = 6000;

export function terrainBounds(samples: readonly Point3[], margin: number): TerrainBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const { x, z } of samples) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX: minX - margin, maxX: maxX + margin, minZ: minZ - margin, maxZ: maxZ + margin };
}

/**
 * Расстояние в плоскости XZ от точки до квадратного основания столбика, а не
 * до его центра. Столбик шириной в клетку, считанный от центра, задевал бы
 * камеру углом.
 */
export function footprintDistance(
  point: Point3,
  column: { x: number; z: number },
  cell: number,
): number {
  const dx = Math.max(Math.abs(point.x - column.x) - cell / 2, 0);
  const dz = Math.max(Math.abs(point.z - column.z) - cell / 2, 0);
  return Math.hypot(dx, dz);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Сетка столбиков над прямоугольником bounds. Высота — fBm-шум, прижатый
 * долиной к маршруту и ограниченный двумя потолками: под камерой в коридоре
 * маршрута и под основаниями станций.
 */
export function buildTerrain({
  samples,
  stations,
  bounds,
}: {
  samples: readonly Point3[];
  stations: readonly Point3[];
  bounds: TerrainBounds;
}): TerrainColumn[] {
  const t = TERRAIN;
  const columns: TerrainColumn[] = [];
  const nx = Math.ceil((bounds.maxX - bounds.minX) / t.cell);
  const nz = Math.ceil((bounds.maxZ - bounds.minZ) / t.cell);

  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < nz; j += 1) {
      const column = { x: bounds.minX + (i + 0.5) * t.cell, z: bounds.minZ + (j + 0.5) * t.cell };
      let ceiling = Infinity;
      let nearest = Infinity;
      for (const sample of samples) {
        const distance = footprintDistance(sample, column, t.cell);
        nearest = Math.min(nearest, distance);
        if (distance < t.corridorRadius) {
          ceiling = Math.min(ceiling, sample.y - t.cameraClearance - t.groundY);
        }
      }
      for (const floor of stations) {
        if (footprintDistance(floor, column, t.cell) < t.stationRadius) {
          ceiling = Math.min(ceiling, floor.y - t.stationClearance - t.groundY);
        }
      }
      const valley = smoothstep(t.corridorRadius, t.corridorRadius + t.valleyWidth, nearest);
      const raw =
        fbm2D(column.x * t.noiseScale, column.z * t.noiseScale) * t.amplitude * (0.15 + 0.85 * valley);
      columns.push({ ...column, height: Math.max(0, Math.min(raw, ceiling)) });
    }
  }
  return columns;
}
