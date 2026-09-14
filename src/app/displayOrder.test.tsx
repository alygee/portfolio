import { act, render, renderHook } from '@testing-library/react';
import { displayJobs } from '@/content';
import { useStationHash } from '@/features/career-flight/useStationHash';
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import { progressStore, setProgress } from '@/features/scroll-bridge/progressStore';

/**
 * Инвариант порядка отображения: станция с индексом N — это N-я секция работы
 * в документе сверху. Порядок обязан быть один и тот же в трёх местах:
 * HTML-проекция, станции сцены, синхронизация с хэшем. Тесты здесь связывают
 * фактический DOM документа с фактическим поведением хэша, поэтому краснеют,
 * если разворот порядка появится или исчезнет в одном из этих мест.
 */
function documentSectionIds(): string[] {
  const { container } = render(<ResumeDocument now="2026-08" />);
  return [...container.querySelectorAll('section[id]')].map((section) => section.id);
}

function resetLocationHash() {
  window.history.replaceState(null, '', window.location.pathname);
}

beforeEach(() => {
  resetLocationHash();
  progressStore.setState({ progress: 0, mode: 'travelling' });
});

describe('порядок отображения работ', () => {
  it('в начале маршрута активна первая секция документа, в конце — последняя', () => {
    const ids = documentSectionIds();
    expect(ids.length).toBeGreaterThan(1);

    renderHook(() => useStationHash());

    // Хэш пишется только на смене станции, поэтому прогресс сначала уводится
    // в середину маршрута, а потом ставится на границы.
    act(() => setProgress(0.5));

    act(() => setProgress(0));
    expect(window.location.hash).toBe(`#${ids[0]}`);

    act(() => setProgress(1));
    expect(window.location.hash).toBe(`#${ids[ids.length - 1]}`);
  });

  it('порядок секций документа совпадает с порядком отображения из контента', () => {
    // Связывает фактический DOM с `displayJobs` — тем же списком, по которому
    // монтируются станции сцены (см. `CareerScene.test.tsx`). Поэтому лишний
    // или пропавший разворот в HTML-проекции краснит этот тест.
    expect(documentSectionIds()).toEqual(displayJobs.map((job) => job.id));
  });

  it('вход по хэшу первой секции ставит начало маршрута, по хэшу последней — конец', () => {
    const ids = documentSectionIds();

    window.location.hash = `#${ids[0]}`;
    const first = renderHook(() => useStationHash());
    expect(progressStore.getState().progress).toBe(0);
    first.unmount();

    window.location.hash = `#${ids[ids.length - 1]}`;
    renderHook(() => useStationHash());
    expect(progressStore.getState().progress).toBe(1);
  });
});
