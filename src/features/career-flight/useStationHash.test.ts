import { renderHook } from '@testing-library/react';
import { jobs } from '@/content';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';
import { stationProgress } from './route';
import { useStationHash } from './useStationHash';

function resetLocationHash() {
  window.history.replaceState(null, '', window.location.pathname);
}

beforeEach(() => {
  resetLocationHash();
  progressStore.setState({ progress: 0, mode: 'travelling' });
});

describe('useStationHash', () => {
  it('на входе с хэшем в URL выставляет прогресс соответствующей станции', () => {
    // Красный при поломке: если убрать чтение hashToStationIndex при
    // монтировании (или перестать звать setProgress по его результату),
    // progress останется 0 и тест провалится.
    window.location.hash = '#mplat';

    renderHook(() => useStationHash());

    expect(progressStore.getState().progress).toBe(stationProgress(2, jobs.length));
  });

  it('при смене активной станции переписывает хэш на её идентификатор', () => {
    // Красный при поломке: если перестать писать хэш при смене
    // activeStationIndex (или использовать неверный индекс/id), итоговый
    // location.hash не совпадёт с '#polykod'.
    renderHook(() => useStationHash());

    setProgress(stationProgress(1, jobs.length));

    expect(window.location.hash).toBe(`#${jobs[1]!.id}`);
  });

  it('пишет в историю один раз на смену станции, а не на каждое изменение прогресса', () => {
    // Красный при поломке: если убрать guard "индекс не изменился — не
    // писать" и писать в history при каждом вызове setProgress, первый
    // expect (0 вызовов после трёх мелких изменений внутри одной станции)
    // провалится задолго до смены станции.
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    renderHook(() => useStationHash());

    setProgress(0.02);
    setProgress(0.05);
    setProgress(0.1);
    expect(replaceStateSpy).not.toHaveBeenCalled();

    setProgress(stationProgress(1, jobs.length));
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
  });
});
