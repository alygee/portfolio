import { useLayoutEffect, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import { useSceneConfig } from '../sceneConfig';
import { heightToColor } from './heightColor';
import { TERRAIN, type TerrainColumn } from './layout';
import { terrainColumns } from './terrainData';

/** Столбик нулевой высоты — тонкая плитка, а не вырожденная (сингулярная) матрица. */
export const MIN_COLUMN_HEIGHT = 0.05;
/** Основание чуть уже клетки: зазоры между столбиками дают топографический рисунок. */
const FOOTPRINT = TERRAIN.cell * 0.92;

export function Terrain({ columns = terrainColumns }: { columns?: readonly TerrainColumn[] }) {
  const mesh = useRef<InstancedMesh>(null);
  const { lowColor, highColor, roughness } = useSceneConfig((config) => config.terrain);

  useLayoutEffect(() => {
    const instanced = mesh.current!;
    const matrix = new Matrix4();
    const color = new Color();
    const low = new Color(lowColor);
    const high = new Color(highColor);

    columns.forEach((column, index) => {
      const height = Math.max(column.height, MIN_COLUMN_HEIGHT);
      matrix
        .makeScale(FOOTPRINT, height, FOOTPRINT)
        .setPosition(column.x, TERRAIN.groundY + height / 2, column.z);
      instanced.setMatrixAt(index, matrix);
      instanced.setColorAt(index, heightToColor(column.height, TERRAIN.amplitude, low, high, color));
    });

    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    // Сфера считается лениво один раз. Посчитанная до записи матриц, она
    // описывает единичный куб в начале координат, и отсечение по пирамиде
    // видимости спрятало бы весь рельеф, как только начало координат уйдёт из кадра.
    instanced.computeBoundingSphere();
  }, [columns, lowColor, highColor]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, columns.length]} name="terrain">
      <boxGeometry />
      <meshStandardMaterial roughness={roughness} metalness={0} />
    </instancedMesh>
  );
}
