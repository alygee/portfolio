import type { GraphEdge } from '@/entities/skill/graph';
import type { Vec3 } from '@/shared/lib/vec3';

/** Отрезков в дуге моста. */
export const ARC_SEGMENTS = 16;
/** Подъём контрольной точки дуги над серединой моста. */
export const ARC_LIFT = 3;

type Positions = ReadonlyMap<string, Vec3>;

/** Вершины `LineSegments`: по паре на ребро. */
export function segmentPositions(edges: readonly GraphEdge[], positions: Positions): Float32Array {
  const array = new Float32Array(edges.length * 6);
  edges.forEach((edge, index) => {
    const a = positions.get(edge.from)!;
    const b = positions.get(edge.to)!;
    array.set([a.x, a.y, a.z, b.x, b.y, b.z], index * 6);
  });
  return array;
}

/** Квадратичная кривая Безье от a к b через точку над их серединой. */
export function arcPoint(a: Vec3, b: Vec3, t: number): Vec3 {
  const control = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + ARC_LIFT, z: (a.z + b.z) / 2 };
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
    z: u * u * a.z + 2 * u * t * control.z + t * t * b.z,
  };
}

/** Вершины `LineSegments` для дуг мостов: `ARC_SEGMENTS` отрезков на мост. */
export function arcPositions(edges: readonly GraphEdge[], positions: Positions): Float32Array {
  const array = new Float32Array(edges.length * ARC_SEGMENTS * 6);
  let offset = 0;
  for (const edge of edges) {
    const a = positions.get(edge.from)!;
    const b = positions.get(edge.to)!;
    for (let s = 0; s < ARC_SEGMENTS; s += 1) {
      const p = arcPoint(a, b, s / ARC_SEGMENTS);
      const q = arcPoint(a, b, (s + 1) / ARC_SEGMENTS);
      array.set([p.x, p.y, p.z, q.x, q.y, q.z], offset);
      offset += 6;
    }
  }
  return array;
}
