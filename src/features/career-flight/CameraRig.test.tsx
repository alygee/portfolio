import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';
import { CameraRig } from './CameraRig';
import { progressToCamera } from './route';

function CameraSpy({ onCamera }: { onCamera: (camera: Camera) => void }) {
  const camera = useThree((state) => state.camera);
  onCamera(camera);
  return null;
}

async function mount() {
  let camera: Camera | undefined;
  const renderer = await ReactThreeTestRenderer.create(
    <>
      <CameraRig />
      <CameraSpy onCamera={(value) => (camera = value)} />
    </>,
  );
  return { renderer, getCamera: () => camera! };
}

describe('CameraRig', () => {
  beforeEach(() => {
    progressStore.setState({ progress: 0, mode: 'travelling' });
  });

  it('ставит камеру в начало маршрута на первом кадре', async () => {
    const { renderer, getCamera } = await mount();
    await renderer.advanceFrames(1, 0.016);
    const expected = progressToCamera(0).position;
    expect(getCamera().position.distanceTo(expected)).toBeLessThan(0.01);
  });

  it('доводит камеру до конца маршрута при прогрессе 1', async () => {
    const { renderer, getCamera } = await mount();
    setProgress(1);
    await renderer.advanceFrames(240, 0.016);
    const expected = progressToCamera(1).position;
    expect(getCamera().position.distanceTo(expected)).toBeLessThan(0.5);
  });

  it('на середине маршрута находится между концами', async () => {
    const { renderer, getCamera } = await mount();
    setProgress(0.5);
    await renderer.advanceFrames(240, 0.016);
    const middle = progressToCamera(0.5).position;
    expect(getCamera().position.distanceTo(middle)).toBeLessThan(0.5);
  });

  it('не вызывает ре-рендер React на изменение прогресса', async () => {
    let renders = 0;
    function CountingRig() {
      renders += 1;
      return <CameraRig />;
    }
    const renderer = await ReactThreeTestRenderer.create(<CountingRig />);
    const before = renders;
    setProgress(0.3);
    setProgress(0.6);
    await renderer.advanceFrames(10, 0.016);
    expect(renders).toBe(before);
  });
});
