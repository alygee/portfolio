import type { SceneState } from '@/entities/scene-mode/sceneMode';
import type { GraphNode } from '@/entities/skill/graph';

export const EMPHASIS_SCALE = 1.6;
export const PULSE_AMPLITUDE = 0.25;
/** Рад/с. */
export const PULSE_SPEED = 3;

/** Множитель масштаба узла: подсветка/выбор крупнее, «изучаю» у зала пульсирует. */
export function instanceScale(
  node: GraphNode,
  state: Pick<SceneState, 'mode' | 'highlightedId' | 'selectedId'>,
  time: number,
): number {
  if (node.id === state.highlightedId || node.id === state.selectedId) return EMPHASIS_SCALE;
  if (state.mode !== 'travelling' && node.kind === 'skill' && node.status === 'learning') {
    return 1 + PULSE_AMPLITUDE * Math.sin(time * PULSE_SPEED);
  }
  return 1;
}
