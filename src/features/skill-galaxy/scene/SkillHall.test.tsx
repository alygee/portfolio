import ReactThreeTestRenderer from '@react-three/test-renderer';
import {
  Color,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type LineSegments,
  type Mesh,
  type Object3D,
} from 'three';
import { HALL_CENTER } from '@/entities/route/anchors';
import { ARC_SEGMENTS } from './hallGeometry';
import { hallGraph, hallPositions, hubNodes, skillNodes } from './hallData';
import { SkillHall } from './SkillHall';

async function renderHall() {
  const renderer = await ReactThreeTestRenderer.create(<SkillHall />);
  const hall = renderer.scene.children[0]!.instance as Object3D;
  const byName = <T extends Object3D>(name: string) => hall.getObjectByName(name) as T;
  return { renderer, hall, byName };
}

function instancePosition(mesh: InstancedMesh, index: number): Vector3 {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  const position = new Vector3();
  matrix.decompose(position, new Quaternion(), new Vector3());
  return position;
}

describe('SkillHall', () => {
  it('зал добавляет ровно 4 draw call: два InstancedMesh и два LineSegments', async () => {
    const { hall } = await renderHall();
    let instanced = 0;
    let lines = 0;
    let other = 0;
    hall.traverse((object) => {
      if ((object as InstancedMesh).isInstancedMesh) instanced += 1;
      else if ((object as LineSegments).isLineSegments) lines += 1;
      else if ((object as Mesh).isMesh) other += 1;
    });
    expect({ instanced, lines, other }).toEqual({ instanced: 2, lines: 2, other: 0 });
  });

  it('стоит в центре зала из геометрии маршрута', async () => {
    const { hall } = await renderHall();
    expect(hall.position.toArray()).toEqual([HALL_CENTER.x, HALL_CENTER.y, HALL_CENTER.z]);
  });

  it('инстансов столько же, сколько узлов каждого вида', async () => {
    const { byName } = await renderHall();
    expect(byName<InstancedMesh>('hall-skills').count).toBe(skillNodes.length);
    expect(byName<InstancedMesh>('hall-hubs').count).toBe(hubNodes.length);
  });

  it('инстанс с индексом i — это узел i и стоит в его позиции раскладки', async () => {
    const { byName } = await renderHall();
    const mesh = byName<InstancedMesh>('hall-skills');
    skillNodes.forEach((node, index) => {
      const expected = hallPositions.get(node.id)!;
      expect(instancePosition(mesh, index).distanceTo(new Vector3(expected.x, expected.y, expected.z))).toBeLessThan(1e-5);
    });
  });

  it('ограничивающая сфера охватывает все узлы — иначе отсечение спрячет зал', async () => {
    const { byName } = await renderHall();
    for (const name of ['hall-skills', 'hall-hubs']) {
      const mesh = byName<InstancedMesh>(name);
      expect(mesh.boundingSphere).not.toBeNull();
      for (let index = 0; index < mesh.count; index += 1) {
        expect(mesh.boundingSphere!.containsPoint(instancePosition(mesh, index))).toBe(true);
      }
    }
  });

  it('узел «в плане» темнее изучаемого того же домена', async () => {
    const { byName } = await renderHall();
    const mesh = byName<InstancedMesh>('hall-skills');
    const lightness = (id: string) => {
      const color = new Color();
      mesh.getColorAt(skillNodes.findIndex((node) => node.id === id), color);
      return color.getHSL({ h: 0, s: 0, l: 0 }).l;
    };
    expect(lightness('onnx')).toBeLessThan(lightness('python'));
  });

  it('вершин рёбер: по паре на ребро applied и 2·ARC_SEGMENTS на мост', async () => {
    const { byName } = await renderHall();
    const count = (name: string) =>
      (byName<LineSegments>(name).geometry as BufferGeometry).getAttribute('position').count;
    const applied = hallGraph.edges.filter((edge) => edge.kind === 'applied').length;
    const bridges = hallGraph.edges.filter((edge) => edge.kind === 'bridge').length;
    expect(count('hall-applied-edges')).toBe(applied * 2);
    expect(count('hall-bridges')).toBe(bridges * ARC_SEGMENTS * 2);
  });
});
