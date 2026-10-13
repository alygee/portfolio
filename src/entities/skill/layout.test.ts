import { HALL_RADIUS } from '@/entities/route/geometry';
import { distance, length } from '@/shared/lib/vec3';
import { LAYOUT, clusterRadius, fibonacciSphere, layoutGraph } from './layout';
import { skillGraph, type SkillGraph } from './graph';

const positions = layoutGraph(skillGraph);
const at = (id: string) => positions.get(id)!;

describe('fibonacciSphere', () => {
  it('один узел — в центре кластера', () => {
    expect(fibonacciSphere(1, 2)).toEqual([{ x: 0, y: 0, z: 0 }]);
  });

  it('точки лежат на сфере заданного радиуса', () => {
    for (const point of fibonacciSphere(7, 1.5)) expect(length(point)).toBeCloseTo(1.5, 10);
  });
});

describe('clusterRadius', () => {
  it('растёт с числом узлов', () => {
    expect(clusterRadius(1)).toBe(0);
    expect(clusterRadius(6)).toBeGreaterThan(clusterRadius(3));
  });
});

describe('раскладка настоящего графа', () => {
  it('у каждого узла есть позиция', () => {
    expect(positions.size).toBe(skillGraph.nodes.length);
  });

  it('Л1: любые два узла не ближе minDist', () => {
    const ids = [...positions.keys()];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        expect(distance(at(ids[i]!), at(ids[j]!)), `${ids[i]} ↔ ${ids[j]}`).toBeGreaterThanOrEqual(
          LAYOUT.minDist,
        );
      }
    }
  });

  it('Л2: каждый узел строго в своей половине, за краем разрыва', () => {
    for (const node of skillGraph.nodes) {
      const x = at(node.id).x;
      if (node.domain === 'web') expect(x, node.id).toBeLessThan(-LAYOUT.gap / 2);
      else expect(x, node.id).toBeGreaterThan(LAYOUT.gap / 2);
    }
  });

  it('Л3: каждый мост пересекает плоскость x = 0', () => {
    const bridges = skillGraph.edges.filter((e) => e.kind === 'bridge');
    expect(bridges.length).toBeGreaterThan(0);
    for (const edge of bridges) {
      expect(Math.sign(at(edge.from).x) * Math.sign(at(edge.to).x), `${edge.from}→${edge.to}`).toBe(-1);
    }
  });

  it('Л4: все узлы внутри сферы зала', () => {
    for (const [id, point] of positions) expect(length(point), id).toBeLessThan(HALL_RADIUS);
  });

  it('Л5: детерминизм', () => {
    expect(layoutGraph(skillGraph)).toEqual(positions);
  });
});

describe('раскладка на синтетике', () => {
  it('хаб без навыков и единственный кластер получают позиции', () => {
    const graph: SkillGraph = {
      nodes: [
        { id: 'a', kind: 'skill', label: 'A', category: 'mlops', domain: 'ml', status: 'planned' },
        { id: 'h', kind: 'project', label: 'H', domain: 'ml', href: 'https://example.com' },
      ],
      edges: [],
    };
    const result = layoutGraph(graph);
    expect(result.size).toBe(2);
    expect(result.get('a')!.x).toBeGreaterThan(LAYOUT.gap / 2);
    expect(distance(result.get('a')!, result.get('h')!)).toBeGreaterThanOrEqual(LAYOUT.minDist);
  });
});
