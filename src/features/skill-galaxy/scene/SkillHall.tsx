import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { HALL_CENTER } from '@/entities/route/anchors';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { HallEdges } from './HallEdges';
import { hallGraph, hallPositions, hubNodes, skillNodes } from './hallData';
import { NodeInstances } from './NodeInstances';
import { spinStore } from './spinStore';
import { stepSpin } from './spin';

export const NODE_RADIUS = 0.32;
export const HUB_RADIUS = 0.6;

function SpinningGroup({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const { mode } = sceneStore.getState();
    const { spin, dragging } = spinStore.getState();
    const next = stepSpin(spin, delta, mode, dragging);
    if (next !== spin) spinStore.setState({ spin: next });
    // Порядок Эйлера XYZ: сначала yaw вокруг вертикали, затем наклон —
    // как глобус, который крутят и наклоняют к себе.
    group.current!.rotation.set(next.pitch, next.yaw, 0);
  });

  return (
    <group ref={group} name="skill-hall-spin">
      {children}
    </group>
  );
}

/**
 * Зал навыков — 4 draw call (спека зала, §5.2). Внешняя группа ставит зал в
 * мир, внутренняя (`skill-hall-spin`) вращается (spin.ts).
 */
export function SkillHall() {
  return (
    <group name="skill-hall" position={[HALL_CENTER.x, HALL_CENTER.y, HALL_CENTER.z]}>
      <SpinningGroup>
        <NodeInstances nodes={skillNodes} positions={hallPositions} radius={NODE_RADIUS} shape="icosahedron" name="hall-skills" />
        <NodeInstances nodes={hubNodes} positions={hallPositions} radius={HUB_RADIUS} shape="octahedron" name="hall-hubs" />
        <HallEdges edges={hallGraph.edges} positions={hallPositions} />
      </SpinningGroup>
    </group>
  );
}
