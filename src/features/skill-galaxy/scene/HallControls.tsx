import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useSceneState } from '@/entities/scene-mode/sceneStore';
import { dragSpin } from './spin';
import { spinStore } from './spinStore';

/**
 * Перетаскивание по канвасу вращает зал (спека зала, §5.4). Нажатие ловится
 * на канвасе, движение и отпускание — на окне: указатель может уйти с канваса
 * на оверлей, а захват указателя (setPointerCapture) спорил бы с событиями R3F.
 */
export function HallControls() {
  const element = useThree((state) => state.gl.domElement);
  const exploring = useSceneState((state) => state.mode === 'exploring');

  useEffect(() => {
    if (!exploring) return;
    let last: { x: number; y: number; time: number } | null = null;

    const onDown = (event: PointerEvent) => {
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
      spinStore.setState({ dragging: true });
    };
    const onMove = (event: PointerEvent) => {
      if (last === null) return;
      const dt = (event.timeStamp - last.time) / 1000;
      spinStore.setState({
        spin: dragSpin(spinStore.getState().spin, event.clientX - last.x, event.clientY - last.y, dt),
      });
      last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };
    const onUp = () => {
      last = null;
      spinStore.setState({ dragging: false });
    };

    element.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      spinStore.setState({ dragging: false });
    };
  }, [element, exploring]);

  return null;
}
