import { palette } from '@/shared/config/palette';
import { displayJobs } from '@/content';
import { CameraRig } from './CameraRig';
import { StationMarker } from './StationMarker';
import { route } from './route';
import { useSceneConfig } from './sceneConfig';

export function CareerScene() {
  const fog = useSceneConfig((config) => config.fog);
  const hemisphere = useSceneConfig((config) => config.hemisphere);
  const sun = useSceneConfig((config) => config.sun);
  const end = route.getPointAt(1);

  return (
    <>
      <color attach="background" args={[palette.background]} />
      {/* Цвет тумана = цвет фона: геометрия растворяется в фоне, а не в серой дымке. */}
      <fog attach="fog" args={[palette.background, fog.near, fog.far]} />
      <hemisphereLight args={[hemisphere.sky, hemisphere.ground, hemisphere.intensity]} />
      <directionalLight color={sun.color} intensity={sun.intensity} position={sun.position} />
      <CameraRig />
      {displayJobs.map((job, index) => (
        <StationMarker job={job} index={index} key={job.id} />
      ))}
      {/* Опорная сетка: до Task 9, где её заменяет рельеф. */}
      <gridHelper args={[400, 80, '#1d2430', '#141920']} position={[0, -2, end.z / 2]} />
    </>
  );
}
