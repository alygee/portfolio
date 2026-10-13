import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { progressStore } from '@/entities/route/progressStore';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { HALL_CENTER_POINT, HALL_DOCK_POINT, progressToCamera } from './route';
import { stepCamera } from './stepCamera';

/**
 * Единственный владелец камеры. Прогресс читается напрямую из vanilla-стора:
 * React в этом цикле не участвует и не ре-рендерится. Режим сцены читается из
 * `sceneStore` так же, без React.
 */
export function CameraRig() {
  const lookAt = useRef(new Vector3());
  const initialized = useRef(false);

  useFrame(({ camera }, delta) => {
    // У зала камера стоит в точке стыковки и смотрит в его центр; вращается
    // сама галактика (spin.ts). Стыковка — конец маршрута, поэтому переход
    // из полёта — это только поворот взгляда, сглаженный stepCamera.
    const { mode } = sceneStore.getState();
    const { position, target } =
      mode === 'travelling'
        ? progressToCamera(progressStore.getState().progress)
        : { position: HALL_DOCK_POINT, target: HALL_CENTER_POINT };

    if (!initialized.current) {
      // Первый кадр — постановка без сглаживания, иначе камера летит из нуля.
      camera.position.copy(position);
      lookAt.current.copy(target);
      initialized.current = true;
    } else {
      camera.position.copy(stepCamera(camera.position, position, delta));
      lookAt.current.copy(stepCamera(lookAt.current, target, delta));
    }

    camera.lookAt(lookAt.current);
  });

  return null;
}
