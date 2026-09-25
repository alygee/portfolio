import { Html } from '@react-three/drei';
import type { Job } from '@/content';
import { stationPosition } from './route';

export function StationMarker({ job, index }: { job: Job; index: number }) {
  const position = stationPosition(index);

  return (
    // `name` — идентификатор работы: делает станцию опознаваемой в графе сцены
    // (отладка, picking на следующих фазах) и позволяет тесту композиции
    // проверить, что порядок станций совпадает с порядком секций документа.
    <group name={job.id} position={position}>
      {/* Примитив-заглушка: на фазе 2 заменяется настоящей геометрией. */}
      <mesh>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#7dd3c0" roughness={0.35} metalness={0.1} />
      </mesh>
      <Html center distanceFactor={18} position={[0, 2.6, 0]}>
        <span className="station-label">{job.company}</span>
      </Html>
    </group>
  );
}
