import { act, fireEvent, render, screen } from '@testing-library/react';
import { INITIAL_SCENE_STATE, type SceneState } from '@/entities/scene-mode/sceneMode';
import { dispatchScene, sceneStore } from '@/entities/scene-mode/sceneStore';
import { OpenHallButton } from './OpenHallButton';

const setScene = (patch: Partial<SceneState>) =>
  act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, ...patch }, true));
const button = () => screen.queryByRole('button', { name: 'Open the skill hall' });

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('OpenHallButton', () => {
  it('без готовой сцены кнопки нет — даже в стыковке', () => {
    setScene({ mode: 'docked' });
    render(<OpenHallButton />);
    expect(button()).toBeNull();
  });

  it('в полёте кнопки нет', () => {
    setScene({ sceneReady: true });
    render(<OpenHallButton />);
    expect(button()).toBeNull();
  });

  it('в стыковке при готовой сцене открывает зал', () => {
    setScene({ mode: 'docked', sceneReady: true });
    render(<OpenHallButton />);
    fireEvent.click(button()!);
    expect(sceneStore.getState().mode).toBe('exploring');
  });

  it('после закрытия зала фокус возвращается на кнопку', () => {
    setScene({ mode: 'docked', sceneReady: true });
    render(<OpenHallButton />);
    fireEvent.click(button()!);
    act(() => dispatchScene({ type: 'closeHall' }));
    expect(button()).toHaveFocus();
  });
});
