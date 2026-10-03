import { TERRAIN, buildTerrain, footprintDistance, terrainBounds, type Point3 } from './layout';

// Маршрут и площадка станции — низко над землёй: при высокой камере долина
// сама прижимает столбики, и тест не отличил бы раскладку без потолков.
const LOW = TERRAIN.groundY + 3;
const line: Point3[] = Array.from({ length: 101 }, (_, i) => ({ x: 0, y: LOW, z: -i }));
const top = (height: number) => TERRAIN.groundY + height;

describe('terrainBounds', () => {
  it('охватывает все выборки с запасом margin', () => {
    expect(terrainBounds(line, 10)).toEqual({ minX: -10, maxX: 10, minZ: -110, maxZ: 10 });
  });
});

describe('footprintDistance', () => {
  it('ноль, если точка над основанием столбика', () => {
    expect(footprintDistance({ x: 0.5, y: 9, z: -0.5 }, { x: 0, z: 0 }, 2)).toBe(0);
  });

  it('считает до края основания, а не до центра', () => {
    expect(footprintDistance({ x: 5, y: 0, z: 0 }, { x: 0, z: 0 }, 2)).toBe(4);
    expect(footprintDistance({ x: 4, y: 0, z: 4 }, { x: 0, z: 0 }, 2)).toBeCloseTo(Math.hypot(3, 3));
  });
});

describe('buildTerrain', () => {
  const bounds = terrainBounds(line, 40);
  const columns = buildTerrain({ samples: line, stations: [], bounds });

  it('покрывает прямоугольник сеткой клеток', () => {
    const nx = Math.ceil((bounds.maxX - bounds.minX) / TERRAIN.cell);
    const nz = Math.ceil((bounds.maxZ - bounds.minZ) / TERRAIN.cell);
    expect(columns).toHaveLength(nx * nz);
  });

  it('высоты неотрицательны', () => {
    expect(columns.every((c) => c.height >= 0)).toBe(true);
  });

  it('у маршрута столбики ниже камеры с запасом', () => {
    for (const column of columns) {
      for (const point of line) {
        if (footprintDistance(point, column, TERRAIN.cell) < 2) {
          expect(top(column.height)).toBeLessThanOrEqual(point.y - 2);
        }
      }
    }
  });

  it('вдали от маршрута есть рельеф', () => {
    const far = columns.filter((c) => Math.abs(c.x) > 25);
    expect(Math.max(...far.map((c) => c.height))).toBeGreaterThan(TERRAIN.amplitude * 0.3);
  });

  it('под станцией площадка ниже её основания', () => {
    const floor = { x: 25, y: TERRAIN.groundY + 1, z: -50 };
    const withStation = buildTerrain({ samples: line, stations: [floor], bounds });
    for (const column of withStation) {
      if (footprintDistance(floor, column, TERRAIN.cell) < 2) {
        expect(top(column.height)).toBeLessThanOrEqual(floor.y);
      }
    }
  });
});
