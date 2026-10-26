import { fireEvent, render, screen, within } from '@testing-library/react';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { SkillList } from './SkillList';

const item = (label: string) => screen.getByText(label).closest('li')!;

beforeEach(() => sceneStore.setState(INITIAL_SCENE_STATE, true));

describe('SkillList', () => {
  it('навыки разделены на домены «Веб» и «ML»', () => {
    render(<SkillList />);
    const ml = screen.getByRole('heading', { level: 3, name: 'ML' }).closest('.skills-domain')!;
    expect(within(ml as HTMLElement).getByText('PyTorch')).toBeInTheDocument();
    expect(within(ml as HTMLElement).queryByText('React')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Web' })).toBeInTheDocument();
  });

  it('статус написан текстом, а не только цветом', () => {
    render(<SkillList />);
    expect(item('Python')).toHaveTextContent('learning');
    expect(item('ONNX')).toHaveTextContent('planned');
  });

  it('у применённого навыка метки нет — это умолчание', () => {
    render(<SkillList />);
    expect(item('React').textContent).toBe('React');
  });

  it('мосты: пара навыков и обоснование', () => {
    render(<SkillList />);
    expect(screen.getByRole('heading', { level: 3, name: 'What I bring to ML' })).toBeInTheDocument();
    const bridge = screen.getByText('PostgreSQL → pandas').closest('li')!;
    expect(bridge).toHaveTextContent('pre-billing');
  });

  it('в стыковке наведение на навык подсвечивает его в зале, уход снимает', () => {
    sceneStore.setState({ ...INITIAL_SCENE_STATE, mode: 'docked' }, true);
    render(<SkillList />);
    fireEvent.pointerEnter(item('React'));
    expect(sceneStore.getState().highlightedId).toBe('react');
    fireEvent.pointerLeave(item('React'));
    expect(sceneStore.getState().highlightedId).toBeNull();
  });
});
