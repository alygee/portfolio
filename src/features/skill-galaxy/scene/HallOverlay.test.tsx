import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { dispatchScene, sceneStore } from '@/entities/scene-mode/sceneStore';
import { hallGraph } from './hallData';
import { hoverStore } from './hallInteraction';
import { HallOverlay } from './HallOverlay';

const explore = () =>
  act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'exploring', sceneReady: true }, true));
const card = () => screen.getByRole('region', { name: 'Выбранный узел' });

beforeEach(() => {
  sceneStore.setState(INITIAL_SCENE_STATE, true);
  hoverStore.setState({ hover: null });
});

describe('HallOverlay', () => {
  it('вне исследования ничего не рисует', () => {
    act(() => sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked', sceneReady: true }, true));
    render(<HallOverlay />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('диалог с именем, фокус — на «Закрыть»', () => {
    explore();
    render(<HallOverlay />);
    expect(screen.getByRole('dialog', { name: 'Зал навыков' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();
  });

  it('«Закрыть» закрывает зал', () => {
    explore();
    render(<HallOverlay />);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(sceneStore.getState().mode).toBe('docked');
  });

  it('→ выбирает первый узел графа, ← от него — последний', () => {
    explore();
    render(<HallOverlay />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'ArrowRight' });
    expect(sceneStore.getState().selectedId).toBe(hallGraph.nodes[0]!.id);
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' });
    expect(sceneStore.getState().selectedId).toBe(hallGraph.nodes[hallGraph.nodes.length - 1]!.id);
  });

  it('карточка навыка: статус, где применён, мосты', () => {
    explore();
    act(() => dispatchScene({ type: 'select', id: 'postgres' }));
    render(<HallOverlay />);
    expect(within(card()).getByRole('heading', { name: 'PostgreSQL' })).toBeInTheDocument();
    expect(card()).toHaveTextContent('применён');
    expect(within(card()).getByRole('link', { name: 'Мобильная платформа' })).toHaveAttribute('href', '#mplat');
    expect(card()).toHaveTextContent('PostgreSQL → pandas');
  });

  it('ссылка на работу закрывает зал и после «назад» прокручивает к станции', async () => {
    const station = document.createElement('section');
    station.id = 'mplat';
    station.scrollIntoView = vi.fn();
    document.body.append(station);
    explore();
    act(() => dispatchScene({ type: 'select', id: 'postgres' }));
    render(<HallOverlay />);

    fireEvent.click(within(card()).getByRole('link', { name: 'Мобильная платформа' }));
    expect(sceneStore.getState().mode).toBe('docked');
    // useHallDocument при закрытии делает history.back(); здесь его нет —
    // имитируем событие, которое пришлёт браузер.
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(station.scrollIntoView).toHaveBeenCalled());
    station.remove();
  });

  it('подсказка при наведении показывает подпись узла', () => {
    explore();
    act(() => hoverStore.setState({ hover: { id: 'react', x: 10, y: 20 } }));
    render(<HallOverlay />);
    expect(screen.getByText('React', { selector: '.hall-tooltip' })).toBeInTheDocument();
  });
});
