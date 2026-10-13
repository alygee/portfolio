import { HALL_CENTER, HALL_DOCK } from '@/entities/route/anchors';
import { HALL_RADIUS } from '@/entities/route/geometry';
import { distance } from '@/shared/lib/vec3';
import { DEFAULT_SCENE_CONFIG } from './sceneConfig';
import { TERRAIN } from './terrain/layout';
import { terrainColumns } from './terrain/terrainData';

describe('зал в мире', () => {
  it('висит над рельефом: нижняя точка выше любого столбика под ним', () => {
    const bottom = HALL_CENTER.y - HALL_RADIUS;
    const below = terrainColumns.filter(
      (column) => Math.hypot(column.x - HALL_CENTER.x, column.z - HALL_CENTER.z) < HALL_RADIUS + TERRAIN.cell,
    );
    expect(below.length).toBeGreaterThan(0);
    for (const column of below) {
      expect(TERRAIN.groundY + column.height).toBeLessThan(bottom);
    }
  });

  it('дальний край зала из точки стыковки не тонет в тумане', () => {
    // Узлы на дальней стороне сферы зала дальше всего от камеры. Туман
    // линейный от near до far; к середине интервала узел теряет половину
    // контраста — дальше «в плане» (уже смешанный с фоном) пропадёт совсем.
    const { near, far } = DEFAULT_SCENE_CONFIG.fog;
    const farthest = distance(HALL_DOCK, HALL_CENTER) + HALL_RADIUS;
    expect(farthest).toBeLessThan(near + (far - near) / 2);
  });
});
