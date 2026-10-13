import { useMemo } from 'react';
import type { GraphEdge } from '@/entities/skill/graph';
import { palette } from '@/shared/config/palette';
import type { Vec3 } from '@/shared/lib/vec3';
import { arcPositions, segmentPositions } from './hallGeometry';

type Props = { edges: readonly GraphEdge[]; positions: ReadonlyMap<string, Vec3> };

/** Два draw call на все рёбра: «применён здесь» — приглушённо, мосты — акцентом. */
export function HallEdges({ edges, positions }: Props) {
  const applied = useMemo(
    () => segmentPositions(edges.filter((edge) => edge.kind === 'applied'), positions),
    [edges, positions],
  );
  const arcs = useMemo(
    () => arcPositions(edges.filter((edge) => edge.kind === 'bridge'), positions),
    [edges, positions],
  );

  return (
    <>
      <lineSegments name="hall-applied-edges">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[applied, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.muted} transparent opacity={0.35} />
      </lineSegments>
      <lineSegments name="hall-bridges">
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[arcs, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.accent} />
      </lineSegments>
    </>
  );
}
