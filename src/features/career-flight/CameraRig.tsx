import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import { progressStore } from '@/features/scroll-bridge/progressStore';
import { progressToCamera } from './route';
import { stepCamera } from './stepCamera';

/**
 * Единственный владелец камеры. Прогресс читается напрямую из vanilla-стора:
 * React в этом цикле не участвует и не ре-рендерится.
 */
export function CameraRig() {
  const lookAt = useRef(new Vector3());
  const initialized = useRef(false);

  useFrame(({ camera }, delta) => {
    const { progress } = progressStore.getState();
    const { position, target } = progressToCamera(progress);

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
