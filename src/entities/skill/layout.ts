import type { Vec3 } from '@/shared/lib/vec3';
import { CATEGORY_ORDER, type Domain } from './categories';
import type { SkillGraph, SkillNode } from './graph';

/**
 * Аналитическая раскладка зала (спека зала, §4). Половина домена — ось
 * `x = ±xOffset`; центры кластеров (категорий) — на кольце радиуса
 * `clusterRing` вокруг этой оси в плоскости yz; хабы — на внутреннем кольце
 * `hubRing`, поэтому рёбра «хаб → навык» расходятся спицами. Между половинами
 * — разрыв шириной `gap`, его пересекают только мосты.
 *
 * Детерминированная: без случайности и итераций — инварианты Л1–Л5
 * проверяются тестами, а не надеждой на сходимость.
 */
export const LAYOUT = {
  xOffset: 6,
  clusterRing: 6,
  hubRing: 2,
  gap: 6,
  minDist: 0.9,
} as const;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Радиус кластера: одиночный узел — в центре, дальше растёт как √n. */
export function clusterRadius(count: number): number {
  return count <= 1 ? 0 : 0.6 + 0.35 * Math.sqrt(count);
}

/** Почти равномерные точки на сфере (спираль Фибоначчи). */
export function fibonacciSphere(count: number, radius: number): Vec3[] {
  if (count === 1) return [{ x: 0, y: 0, z: 0 }];
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const theta = i * GOLDEN_ANGLE;
    return { x: Math.cos(theta) * ring * radius, y: y * radius, z: Math.sin(theta) * ring * radius };
  });
}

function ringPoint(sign: number, radius: number, index: number, count: number, phase: number): Vec3 {
  const angle = (2 * Math.PI * index) / count + phase;
  return { x: sign * LAYOUT.xOffset, y: Math.sin(angle) * radius, z: Math.cos(angle) * radius };
}

const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

export function layoutGraph(graph: SkillGraph): Map<string, Vec3> {
  const positions = new Map<string, Vec3>();

  for (const domain of ['web', 'ml'] as const satisfies readonly Domain[]) {
    const sign = domain === 'web' ? -1 : 1;
    const skills = graph.nodes.filter(
      (node): node is SkillNode => node.kind === 'skill' && node.domain === domain,
    );
    const categories = CATEGORY_ORDER.filter((category) =>
      skills.some((skill) => skill.category === category),
    );

    categories.forEach((category, index) => {
      const members = skills.filter((skill) => skill.category === category);
      const center = ringPoint(sign, LAYOUT.clusterRing, index, categories.length, 0);
      fibonacciSphere(members.length, clusterRadius(members.length)).forEach((offset, i) => {
        positions.set(members[i]!.id, add(center, offset));
      });
    });

    // Фаза π/4 разводит хабы с направлениями на центры кластеров: спица не
    // проходит сквозь соседний хаб.
    const hubs = graph.nodes.filter((node) => node.kind !== 'skill' && node.domain === domain);
    hubs.forEach((hub, index) => {
      positions.set(hub.id, ringPoint(sign, LAYOUT.hubRing, index, hubs.length, Math.PI / 4));
    });
  }

  return positions;
}
