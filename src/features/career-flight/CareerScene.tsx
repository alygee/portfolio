import { CameraRig } from './CameraRig';
import { route } from './route';

export function CareerScene() {
  const end = route.getPointAt(1);

  return (
    <>
      <color attach="background" args={['#0d0f14']} />
      <fog attach="fog" args={['#0d0f14', 30, 160]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[12, 20, 8]} intensity={1.2} />
      <CameraRig />
      {/* Опорная сетка: на фазе 1 она делает движение камеры читаемым.
          Заменяется настоящим окружением на фазе 2. */}
      <gridHelper
        args={[400, 80, '#1d2430', '#141920']}
        position={[0, -2, end.z / 2]}
      />
    </>
  );
}
