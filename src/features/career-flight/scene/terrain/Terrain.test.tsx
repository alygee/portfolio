import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { TERRAIN, type TerrainColumn } from './layout';
import { MIN_COLUMN_HEIGHT, Terrain } from './Terrain';

const columns: TerrainColumn[] = [
  { x: 0, z: 0, height: 4 },
  { x: 5, z: -5, height: 0 },
  { x: -40, z: -90, height: 12 },
];

async function renderTerrain() {
  const renderer = await ReactThreeTestRenderer.create(<Terrain columns={columns} />);
  return renderer.scene.children[0]!.instance as InstancedMesh;
}

function instanceTransform(mesh: InstancedMesh, index: number) {
  const matrix = new Matrix4();
  mesh.getMatrixAt(index, matrix);
  const position = new Vector3();
  const scale = new Vector3();
  matrix.decompose(position, new Quaternion(), scale);
  return { position, scale };
}

describe('Terrain', () => {
  it('рисует все столбики одним InstancedMesh', async () => {
    const mesh = await renderTerrain();
    expect(mesh.isInstancedMesh).toBe(true);
    expect(mesh.count).toBe(columns.length);
  });

  it('столбик стоит на земле и имеет свою высоту', async () => {
    const { position, scale } = instanceTransform(await renderTerrain(), 0);
    expect(scale.y).toBeCloseTo(4);
    expect(position.toArray()).toEqual([0, TERRAIN.groundY + 2, 0]);
  });

  it('нулевая высота не даёт вырожденную матрицу', async () => {
    const { scale } = instanceTransform(await renderTerrain(), 1);
    expect(scale.y).toBeCloseTo(MIN_COLUMN_HEIGHT);
  });

  it('высокий столбик светлее низкого', async () => {
    const mesh = await renderTerrain();
    const lightness = (index: number) => {
      const color = new Color();
      mesh.getColorAt(index, color);
      return color.getHSL({ h: 0, s: 0, l: 0 }).l;
    };
    expect(lightness(1)).toBeLessThan(lightness(2));
  });

  it('ограничивающая сфера охватывает все столбики — иначе отсечение спрячет рельеф', async () => {
    const mesh = await renderTerrain();
    expect(mesh.boundingSphere).not.toBeNull();
    for (let index = 0; index < columns.length; index += 1) {
      const { position } = instanceTransform(mesh, index);
      expect(mesh.boundingSphere!.containsPoint(position)).toBe(true);
    }
  });
});
