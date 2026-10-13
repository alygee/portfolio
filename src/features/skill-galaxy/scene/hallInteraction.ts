import { createStore } from 'zustand/vanilla';

/** Смещение указателя (px), после которого отпускание — конец перетаскивания, а не щелчок. */
export const CLICK_SLOP = 6;

export type Hover = { id: string; x: number; y: number } | null;

/** Узел под указателем и позиция подсказки; пишет сцена, читает DOM-оверлей. */
export const hoverStore = createStore<{ hover: Hover }>(() => ({ hover: null }));
