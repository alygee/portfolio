import { HALL_CENTER } from '@/entities/route/anchors';
import { HallEdges } from './HallEdges';
import { hallGraph, hallPositions, hubNodes, skillNodes } from './hallData';
import { NodeInstances } from './NodeInstances';

export const NODE_RADIUS = 0.32;
export const HUB_RADIUS = 0.6;

/**
 * Зал навыков — 4 draw call (спека зала, §5.2). Внешняя группа ставит зал в
 * мир, внутренняя (`skill-hall-spin`) в Task 9 начнёт вращаться.
 */
export function SkillHall() {
  return (
    <group name="skill-hall" position={[HALL_CENTER.x, HALL_CENTER.y, HALL_CENTER.z]}>
      <group name="skill-hall-spin">
        <NodeInstances nodes={skillNodes} positions={hallPositions} radius={NODE_RADIUS} shape="icosahedron" name="hall-skills" />
        <NodeInstances nodes={hubNodes} positions={hallPositions} radius={HUB_RADIUS} shape="octahedron" name="hall-hubs" />
        <HallEdges edges={hallGraph.edges} positions={hallPositions} />
      </group>
    </group>
  );
}
