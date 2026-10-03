import { Html } from '@react-three/drei';
import type { Job } from '@/content';
import { STATION_SIZE, stationPosition } from './route';
import { useSceneConfig } from './sceneConfig';

export function StationMarker({ job, index }: { job: Job; index: number }) {
  const position = stationPosition(index);
  const material = useSceneConfig((config) => config.station);

  return (
    // `name` — идентификатор работы: делает станцию опознаваемой в графе сцены
    // (отладка, picking на следующих фазах) и позволяет тесту композиции
    // проверить, что порядок станций совпадает с порядком секций документа.
    <group name={job.id} position={position}>
      {/* Примитив-заглушка: на фазе 2 заменяется настоящей геометрией. */}
      <mesh>
        <boxGeometry args={[STATION_SIZE, STATION_SIZE, STATION_SIZE]} />
        <meshStandardMaterial
          color={material.color}
          emissive={material.color}
          emissiveIntensity={material.emissiveIntensity}
          roughness={material.roughness}
          metalness={material.metalness}
        />
      </mesh>
      <Html center distanceFactor={18} position={[0, 2.6, 0]}>
        <span className="station-label">{job.company}</span>
      </Html>
    </group>
  );
}
