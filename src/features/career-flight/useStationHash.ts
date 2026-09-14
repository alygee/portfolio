import { useEffect } from 'react';
import { displayJobs } from '@/content';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';
// Именно `@/entities/route/progress`, а не `./route`: этот хук зовётся из
// `App` безусловно, в том числе когда сцена не смонтирована, то есть попадает
// в главный чанк. `./route` тянет за собой `three` через модульный синглтон
// `route` — этого чанк не должен видеть.
import { activeStationIndex, stationProgress } from '@/entities/route/progress';
import { hashToStationIndex, stationIndexToHash } from './stationHash';

/** Порядок тот же, что у секций документа: см. `displayJobs`. */
const IDS = displayJobs.map((job) => job.id);

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
