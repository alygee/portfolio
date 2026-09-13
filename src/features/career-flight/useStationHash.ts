import { useEffect } from 'react';
import { jobs } from '@/content';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';
import { activeStationIndex, stationProgress } from './route';
import { hashToStationIndex, stationIndexToHash } from './stationHash';

const IDS = jobs.map((job) => job.id);

/**
 * Двусторонняя связь маршрута и URL. Хэш пишется только при смене станции,
 * а не на каждом изменении прогресса.
 */
export function useStationHash(): void {
  useEffect(() => {
    const fromHash = hashToStationIndex(window.location.hash, IDS);
    if (fromHash !== null) {
      setProgress(stationProgress(fromHash, IDS.length));
    }

    let lastIndex = activeStationIndex(progressStore.getState().progress, IDS.length);

    const unsubscribe = progressStore.subscribe((state) => {
      const index = activeStationIndex(state.progress, IDS.length);
      if (index === lastIndex) return;
      lastIndex = index;
      const hash = stationIndexToHash(index, IDS);
      if (hash !== '' && hash !== window.location.hash) {
        window.history.replaceState(null, '', hash);
      }
    });

    return unsubscribe;
  }, []);
}
