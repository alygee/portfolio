import { Color } from 'three';
import type { GraphNode } from '@/entities/skill/graph';
import { palette } from '@/shared/config/palette';

/** Доля фона в цвете узла «в плане»: узел «тонет в тумане», но не исчезает. */
export const PLANNED_FADE = 0.7;

const BACKGROUND = new Color(palette.background);

/**
 * Цвет — по домену (веб — цвет текста, ML — акцент), а не по 14 категориям:
 * эстетика фазы 2 держится на одном акценте (спека зала, §5.2). Статус —
 * смешением с фоном, без прозрачности: прозрачные инстансы пришлось бы
 * сортировать.
 */
export function nodeColor(node: GraphNode, target = new Color()): Color {
  target.set(node.domain === 'web' ? palette.foreground : palette.accent);
  if (node.kind === 'skill' && node.status === 'planned') target.lerp(BACKGROUND, PLANNED_FADE);
  return target;
}
