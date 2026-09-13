import ReactThreeTestRenderer from '@react-three/test-renderer';
import { useThree } from '@react-three/fiber';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
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

  it('читает прогресс императивно: не подписывается на progressStore', async () => {
    // Любой React-биндинг zustand (useStore и родственные хуки) вызывает
    // store.subscribe изнутри. Чтение через progressStore.getState() в
    // useFrame — нет. Считать ре-рендеры компонента-обёртки здесь не годится:
    // React не ре-рендерит родителя из-за подписки ребёнка, поэтому такая
    // проверка проходит даже при нарушении требования.
    const subscribeSpy = vi.spyOn(progressStore, 'subscribe');
    await ReactThreeTestRenderer.create(<CameraRig />);

    setProgress(0.3);
    setProgress(0.6);

    expect(subscribeSpy).not.toHaveBeenCalled();
  });

  it('не коммитится повторно в React на изменение прогресса', async () => {
    // Прямая проверка требования «нет ре-рендера»: Profiler считает коммиты
    // именно поддерева CameraRig, а не компонента-обёртки — так тест не
    // зависит от того, каким механизмом могла бы возникнуть подписка.
    let commits = 0;
    const onRender: ProfilerOnRenderCallback = () => {
      commits += 1;
    };
    const renderer = await ReactThreeTestRenderer.create(
      <Profiler id="camera-rig" onRender={onRender}>
        <CameraRig />
      </Profiler>,
    );
    const before = commits;

    setProgress(0.3);
    setProgress(0.6);
    await renderer.advanceFrames(10, 0.016);

    expect(commits).toBe(before);
  });
});
