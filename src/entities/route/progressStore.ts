import { createStore } from 'zustand/vanilla';
import { clamp01 } from '@/shared/lib/math';

export type ProgressState = {
  /** Позиция на маршруте, 0..1. Читается в useFrame, не через React. */
  progress: number;
};

export const progressStore = createStore<ProgressState>(() => ({
  progress: 0,
}));

export function setProgress(value: number): void {
  progressStore.setState({ progress: clamp01(value) });
}
