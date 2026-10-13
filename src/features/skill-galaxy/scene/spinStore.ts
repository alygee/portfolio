import { createStore } from 'zustand/vanilla';
import { INITIAL_SPIN, type Spin } from './spin';

/** Читается и пишется в цикле кадра и в обработчиках указателя — без React. */
export const spinStore = createStore<{ spin: Spin; dragging: boolean }>(() => ({
  spin: INITIAL_SPIN,
  dragging: false,
}));
