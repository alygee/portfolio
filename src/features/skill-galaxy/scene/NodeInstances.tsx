import { useLayoutEffect, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import type { GraphNode } from '@/entities/skill/graph';
import type { Vec3 } from '@/shared/lib/vec3';
import { nodeColor } from './hallColors';

type Props = {
  nodes: readonly GraphNode[];
  positions: ReadonlyMap<string, Vec3>;
  radius: number;
  shape: 'icosahedron' | 'octahedron';
  name: string;
};

/**
 * Узлы одного вида одним `InstancedMesh`. Индекс инстанса = индекс в `nodes`:
 * это и есть таблица «instanceId → id узла» для выбора лучом.
 */
export function NodeInstances({ nodes, positions, radius, shape, name }: Props) {
  const mesh = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const instanced = mesh.current!;
    const matrix = new Matrix4();
    const color = new Color();
    nodes.forEach((node, index) => {
      const p = positions.get(node.id)!;
      matrix.makeScale(radius, radius, radius).setPosition(p.x, p.y, p.z);
      instanced.setMatrixAt(index, matrix);
      instanced.setColorAt(index, nodeColor(node, color));
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    // Как у рельефа: сфера, посчитанная до записи матриц, описывает единичную
    // геометрию в начале координат, и отсечение прятало бы весь зал.
    instanced.computeBoundingSphere();
  }, [nodes, positions, radius]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]} name={name}>
      {shape === 'icosahedron' ? <icosahedronGeometry args={[1, 1]} /> : <octahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial roughness={0.4} metalness={0.1} />
    </instancedMesh>
  );
}
