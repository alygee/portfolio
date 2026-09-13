import { clamp01 } from '@/shared/lib/math';

export type ScrollMetrics = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
};

export function scrollMetricsToProgress(metrics: ScrollMetrics): number {
  const scrollable = metrics.scrollHeight - metrics.viewportHeight;
  if (scrollable <= 0) return 0;
  return clamp01(metrics.scrollTop / scrollable);
}
