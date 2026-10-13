import ReactThreeTestRenderer from '@react-three/test-renderer';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { SceneReady } from './SceneReady';

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('SceneReady', () => {
  it('сообщает о готовности после первого кадра', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneReady />);
    await renderer.advanceFrames(1, 0.016);
    expect(sceneStore.getState().sceneReady).toBe(true);
  });

  it('при размонтировании снимает готовность', async () => {
    const renderer = await ReactThreeTestRenderer.create(<SceneReady />);
    await renderer.advanceFrames(1, 0.016);
    await renderer.unmount();
    expect(sceneStore.getState().sceneReady).toBe(false);
  });
});
