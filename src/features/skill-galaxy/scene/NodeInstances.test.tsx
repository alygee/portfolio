import ReactThreeTestRenderer from '@react-three/test-renderer';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { CLICK_SLOP, hoverStore } from './hallInteraction';
import { hubNodes, skillNodes } from './hallData';
import { SkillHall } from './SkillHall';

const explore = () =>
  sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true);

async function meshes() {
  const renderer = await ReactThreeTestRenderer.create(<SkillHall />);
  const byName = (name: string) => renderer.scene.findAll((node) => node.props.name === name)[0]!;
  return { renderer, skills: byName('hall-skills'), hubs: byName('hall-hubs') };
}
const noop = () => {};

beforeEach(() => {
  sceneStore.setState(INITIAL_SCENE_STATE, true);
  hoverStore.setState({ hover: null });
});

describe('выбор узла лучом', () => {
  it('щелчок по инстансу выбирает его узел', async () => {
    explore();
    const { renderer, skills, hubs } = await meshes();
    await renderer.fireEvent(skills, 'click', { instanceId: 3, delta: 0, stopPropagation: noop });
    expect(sceneStore.getState().selectedId).toBe(skillNodes[3]!.id);
    await renderer.fireEvent(hubs, 'click', { instanceId: 0, delta: 0, stopPropagation: noop });
    expect(sceneStore.getState().selectedId).toBe(hubNodes[0]!.id);
  });

  it('отпускание после перетаскивания выбором не считается', async () => {
    explore();
    const { renderer, skills } = await meshes();
    await renderer.fireEvent(skills, 'click', {
      instanceId: 3,
      delta: CLICK_SLOP + 1,
      stopPropagation: noop,
    });
    expect(sceneStore.getState().selectedId).toBeNull();
  });

  it('наведение показывает подсказку, уход — убирает', async () => {
    explore();
    const { renderer, skills } = await meshes();
    await renderer.fireEvent(skills, 'pointerMove', {
      instanceId: 0,
      nativeEvent: { clientX: 10, clientY: 20 },
      stopPropagation: noop,
    });
    expect(hoverStore.getState().hover).toEqual({ id: skillNodes[0]!.id, x: 10, y: 20 });
    await renderer.fireEvent(skills, 'pointerOut', { stopPropagation: noop });
    expect(hoverStore.getState().hover).toBeNull();
  });

  it('вне исследования у узлов нет обработчиков указателя', async () => {
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true);
    const { skills } = await meshes();
    expect(skills.props.onClick).toBeUndefined();
  });
});
