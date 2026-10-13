import { ARC_LIFT, ARC_SEGMENTS, arcPoint, arcPositions, segmentPositions } from './hallGeometry';

const positions = new Map([
  ['a', { x: -6, y: 0, z: 0 }],
  ['b', { x: 6, y: 2, z: 0 }],
]);
const edge = { from: 'a', to: 'b', kind: 'bridge' as const };

describe('hallGeometry', () => {
  it('отрезок ребра — две вершины из раскладки', () => {
    expect([...segmentPositions([edge], positions)]).toEqual([-6, 0, 0, 6, 2, 0]);
  });

  it('дуга моста начинается и кончается в узлах', () => {
    expect(arcPoint(positions.get('a')!, positions.get('b')!, 0)).toEqual({ x: -6, y: 0, z: 0 });
    expect(arcPoint(positions.get('a')!, positions.get('b')!, 1)).toEqual({ x: 6, y: 2, z: 0 });
  });

  it('дуга поднимается над разрывом', () => {
    const middle = arcPoint(positions.get('a')!, positions.get('b')!, 0.5);
    expect(middle.y).toBeCloseTo(1 + ARC_LIFT / 2, 10);
  });

  it('дуга — ARC_SEGMENTS отрезков, концы соседних совпадают', () => {
    const array = arcPositions([edge], positions);
    expect(array).toHaveLength(ARC_SEGMENTS * 6);
    expect([...array.slice(3, 6)]).toEqual([...array.slice(6, 9)]);
  });
});
