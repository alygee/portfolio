import { useEffect } from 'react';
import { displayJobs } from '@/content';
import { setProgress } from './progressStore';
import { readSectionOffsets, sectionsToProgress } from './scrollProgress';

/** Порядок тот же, что у станций маршрута: см. `displayJobs`. */
const SECTION_IDS = displayJobs.map((job) => job.id);

/**
 * Прогресс маршрута берётся из позиций секций работ в настоящем документе:
 * когда N-я секция в точке обзора (у верхней кромки окна — там же, куда её
 * ставит переход по хэшу), прогресс равен прогрессу N-й станции.
 *
 * На тач-устройствах инерция не перехватывается: подменять нативный скролл
 * на телефоне — значит ломать привычные жесты (см. спеку §7).
 */
export function useScrollProgress(): void {
  useEffect(() => {
    let offsets: readonly number[] = [];
    let scrollLimit = 0;

    // Позиции секций меряются не на каждое событие скролла: контент статичен,
    // меняет их только изменение размеров окна. Заодно это развязывает
    // источник позиции скролла (Lenis отдаёт свою) и чтение геометрии.
    const measure = () => {
      scrollLimit = document.documentElement.scrollHeight - window.innerHeight;
      offsets = readSectionOffsets(SECTION_IDS) ?? [];
    };

    const publish = (viewOffset: number) => {
      setProgress(sectionsToProgress({ offsets, viewOffset, scrollLimit }));
    };

    measure();
    publish(window.scrollY);

    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    // Инерционный скролл (Lenis) — это движение, а prefers-reduced-motion
    // просит его не показывать. К тому же 3D-слой в этом режиме не
    // монтируется вообще (см. useSceneEnabled), так что подмена физики
    // скролла дала бы изменённое поведение страницы без единого визуального
    // выигрыша — идём нативной веткой, как и на тач-устройствах.
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const useNativeScroll = coarsePointer || reducedMotion;

    const onResize = () => {
      measure();
      publish(window.scrollY);
    };
    window.addEventListener('resize', onResize, { passive: true });

    if (useNativeScroll) {
      const onScroll = () => publish(window.scrollY);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
      };
    }

    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    let cancelled = false;

    void (async () => {
      const { default: Lenis } = await import('lenis');
      if (cancelled) return;
      const instance = new Lenis({ smoothWheel: true });
      instance.on('scroll', ({ scroll }: { scroll: number }) => publish(scroll));
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
      window.removeEventListener('resize', onResize);
      lenis?.destroy();
    };
  }, []);
}
