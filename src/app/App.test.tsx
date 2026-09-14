import { render, screen } from '@testing-library/react';
import { displayJobs } from '@/content';
import { stationProgress } from '@/features/career-flight/routeProgress';
import { progressStore } from '@/features/scroll-bridge/progressStore';
import App from './App';

beforeEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
  progressStore.setState({ progress: 0, mode: 'travelling' });
});

describe('App', () => {
  it('показывает имя в единственном заголовке первого уровня', () => {
    render(<App />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Альберт Аллагулов');
  });

  it('вход по хэшу выигрывает у моста скролла: порядок хуков закреплён', () => {
    // Контракт порядка: `useScrollProgress` ставит прогресс по текущей позиции
    // документа, и только после него `useStationHash` может переопределить его
    // deep link'ом. Красный при поломке: если переставить эти два хука, мост
    // скролла затрёт прогресс станции нулём (в jsdom позиция скролла нулевая),
    // и вход по '#mplat' молча перестанет работать.
    window.location.hash = '#mplat';

    render(<App />);

    const index = displayJobs.findIndex((job) => job.id === 'mplat');
    const expected = stationProgress(index, displayJobs.length);
    expect(expected).toBeGreaterThan(0);
    expect(progressStore.getState().progress).toBe(expected);
  });
});
