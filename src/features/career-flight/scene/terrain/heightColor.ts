import { Color } from 'three';
import { clamp01 } from '@/shared/lib/math';

export function heightToColor(
  height: number,
  maxHeight: number,
  low: Color,
  high: Color,
  target = new Color(),
): Color {
  const t = maxHeight > 0 ? clamp01(height / maxHeight) : 0;
  return target.copy(low).lerp(high, t);
}
