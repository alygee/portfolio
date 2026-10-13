import type { GraphNode } from '@/entities/skill/graph';
import { nodeColor } from './hallColors';

const skill = (domain: 'web' | 'ml', status: 'applied' | 'learning' | 'planned'): GraphNode => ({
  id: 'x',
  kind: 'skill',
  label: 'X',
  category: domain === 'web' ? 'framework' : 'mlops',
  domain,
  status,
});
const lightness = (node: GraphNode) => nodeColor(node).getHSL({ h: 0, s: 0, l: 0 }).l;

describe('nodeColor', () => {
  it('«в плане» тонет в фоне: темнее того же домена со статусом «применён»', () => {
    expect(lightness(skill('ml', 'planned'))).toBeLessThan(lightness(skill('ml', 'applied')));
  });

  it('«изучаю» — полный цвет домена', () => {
    expect(nodeColor(skill('ml', 'learning')).equals(nodeColor(skill('ml', 'applied')))).toBe(true);
  });

  it('домены различаются цветом', () => {
    expect(nodeColor(skill('web', 'applied')).equals(nodeColor(skill('ml', 'applied')))).toBe(false);
  });
});
