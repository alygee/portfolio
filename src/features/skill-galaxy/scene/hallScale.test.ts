import type { GraphNode } from '@/entities/skill/graph';
import { INITIAL_SCENE_STATE } from '@/entities/scene-mode/sceneMode';
import { EMPHASIS_SCALE, instanceScale } from './hallScale';

const learning: GraphNode = { id: 'python', kind: 'skill', label: 'Python', category: 'ml-data', domain: 'ml', status: 'learning' };
const applied: GraphNode = { id: 'react', kind: 'skill', label: 'React', category: 'framework', domain: 'web', status: 'applied' };
const docked = { ...INITIAL_SCENE_STATE, mode: 'docked' as const };

describe('instanceScale', () => {
  it('в полёте всё неподвижно, даже изучаемое', () => {
    expect(instanceScale(learning, INITIAL_SCENE_STATE, 0.5)).toBe(1);
  });

  it('у зала изучаемый узел пульсирует', () => {
    expect(instanceScale(learning, docked, 0.5)).not.toBe(instanceScale(learning, docked, 1));
  });

  it('применённый узел не пульсирует', () => {
    expect(instanceScale(applied, docked, 0.5)).toBe(1);
  });

  it('подсвеченный и выбранный узлы крупнее', () => {
    expect(instanceScale(applied, { ...docked, highlightedId: 'react' }, 0)).toBe(EMPHASIS_SCALE);
    expect(instanceScale(applied, { ...docked, mode: 'exploring', selectedId: 'react' }, 0)).toBe(EMPHASIS_SCALE);
  });
});
