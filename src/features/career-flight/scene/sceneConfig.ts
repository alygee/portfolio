import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { palette } from '@/shared/config/palette';

export const CAMERA = { fov: 60, near: 0.1, far: 400 } as const;

export type SceneConfig = {
  fog: { near: number; far: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  sun: { color: string; intensity: number; position: [number, number, number] };
  station: { color: string; emissiveIntensity: number; roughness: number; metalness: number };
};

/**
 * Параметры среды. Цвет фона и тумана сюда не входит: это palette.background,
 * общий с документом, и настраиваться отдельно от CSS он не должен.
 */
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  fog: { near: 12, far: 70 },
  hemisphere: { sky: '#9fb4c8', ground: palette.background, intensity: 0.35 },
  sun: { color: '#ffe8c7', intensity: 1.4, position: [-30, 40, 10] },
  station: { color: palette.accent, emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.1 },
};

/**
 * В проде его никто не пишет — сцена рисует дефолты. В разработке его
 * двигает панель leva (debug/DevPanel.tsx). Это не progressStore: тот
 * читается в useFrame без React, а этот меняется редко, и перерисовка по
 * подписке здесь как раз нужна.
 */
export const sceneConfigStore = createStore<SceneConfig>(() => DEFAULT_SCENE_CONFIG);

export function useSceneConfig<T>(selector: (config: SceneConfig) => T): T {
  return useStore(sceneConfigStore, selector);
}
