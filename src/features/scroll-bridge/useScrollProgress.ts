import { useEffect } from 'react';
import { setProgress } from './progressStore';
import { scrollMetricsToProgress } from './scrollProgress';

function readProgress(scrollTop: number): number {
  const root = document.documentElement;
  return scrollMetricsToProgress({
    scrollTop,
    scrollHeight: root.scrollHeight,
    viewportHeight: window.innerHeight,
  });
}

/**
 * Прогресс маршрута берётся из скролла настоящего документа.
 * На тач-устройствах инерция не перехватывается: подменять нативный скролл
 * на телефоне — значит ломать привычные жесты (см. спеку §7).
 */
export function useScrollProgress(): void {
  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    setProgress(readProgress(window.scrollY));

    if (coarsePointer) {
      const onScroll = () => setProgress(readProgress(window.scrollY));
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }

    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    let cancelled = false;

    void (async () => {
      const { default: Lenis } = await import('lenis');
      if (cancelled) return;
      const instance = new Lenis({ smoothWheel: true });
      instance.on('scroll', ({ scroll }: { scroll: number }) => {
        setProgress(readProgress(scroll));
      });
      const raf = (time: number) => {
        instance.raf(time);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      lenis = instance;
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);
}
