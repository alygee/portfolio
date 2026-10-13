import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import { dispatchScene, sceneStore, useSceneState } from '@/entities/scene-mode/sceneStore';
import type { GraphNode } from '@/entities/skill/graph';
import type { Vec3 } from '@/shared/lib/vec3';
import { instanceScale } from './hallScale';
import { nodeColor } from './hallColors';
import { CLICK_SLOP, hoverStore } from './hallInteraction';

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
  // Масштаб, записанный в матрицу инстанса в прошлый раз: матрица
  // переписывается только у изменившихся узлов (обычно — 1–3 за кадр).
  const scales = useRef<number[]>([]);
  // Время пульсации копится из delta кадра, а не из clock: тест с
  // advanceFrames шагает delta детерминированно, а clock идёт по часам.
  const time = useRef(0);

  const exploring = useSceneState((state) => state.mode === 'exploring');

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // delta — путь указателя от нажатия до отпускания: после вращения зала
    // отпускание над узлом не должно его выбирать.
    if (event.delta > CLICK_SLOP || event.instanceId === undefined) return;
    dispatchScene({ type: 'select', id: nodes[event.instanceId]!.id });
  };
  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId === undefined) return;
    hoverStore.setState({
      hover: { id: nodes[event.instanceId]!.id, x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
    });
  };
  const onPointerOut = () => hoverStore.setState({ hover: null });
  // Вне исследования обработчиков нет вовсе: R3F не бросает лучи в объекты
  // без обработчиков, а канвас там и так не получает указатель.
  const handlers = exploring ? { onClick, onPointerMove, onPointerOut } : {};

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
    scales.current = nodes.map(() => 1);
  }, [nodes, positions, radius]);

  useFrame((_, delta) => {
    time.current += delta;
    const instanced = mesh.current;
    if (!instanced) return;
    const state = sceneStore.getState();
    const matrix = new Matrix4();
    let changed = false;
    nodes.forEach((node, index) => {
      const scale = instanceScale(node, state, time.current);
      if (scale === scales.current[index]) return;
      scales.current[index] = scale;
      changed = true;
      const p = positions.get(node.id)!;
      const size = radius * scale;
      matrix.makeScale(size, size, size).setPosition(p.x, p.y, p.z);
      instanced.setMatrixAt(index, matrix);
    });
    if (changed) instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, nodes.length]} name={name} {...handlers}>
      {shape === 'icosahedron' ? <icosahedronGeometry args={[1, 1]} /> : <octahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial roughness={0.4} metalness={0.1} />
    </instancedMesh>
  );
}
