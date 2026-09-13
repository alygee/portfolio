import { createStore } from 'zustand/vanilla';
import { clamp01 } from '@/shared/lib/math';

export type SceneMode = 'travelling' | 'docked';

export type ProgressState = {
  /** Позиция на маршруте, 0..1. Читается в useFrame, не через React. */
  progress: number;
  mode: SceneMode;
};

export const progressStore = createStore<ProgressState>(() => ({
  progress: 0,
  mode: 'travelling',
}));

export function setProgress(value: number): void {
  progressStore.setState({ progress: clamp01(value) });
}

export function setSceneMode(mode: SceneMode): void {
  progressStore.setState({ mode });
}
