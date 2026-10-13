import { useEffect } from 'react';
import { ROUTE_ANCHOR_IDS } from '@/entities/route/anchors';
import { setProgress } from '@/entities/route/progressStore';
import { sceneStore } from '@/entities/scene-mode/sceneStore';
import { readSectionOffsets, sectionsToProgress } from './scrollProgress';

/** Порядок тот же, что у путевых точек маршрута: см. `ROUTE_ANCHOR_IDS`. */
const SECTION_IDS = ROUTE_ANCHOR_IDS;

/**
 * Прогресс маршрута берётся из позиций секций работ в настоящем документе:
 * когда N-я секция в точке обзора (у верхней кромки окна — там же, куда её
 * ставит переход по хэшу), прогресс равен прогрессу N-й станции.
 *
 * Инерционный скролл (Lenis) включается только там, где смонтирована сцена:
 * иначе это 5.3 КБ и подмена нативной физики прокрутки rAF-циклом без единого
 * визуального выигрыша. Пригодность окружения решается в одном месте —
 * `useSceneEnabled` (WebGL и prefers-reduced-motion по спеке §7; проверка по
 * классу видеокарты убрана в фазе 1.5, см. `sceneSupport.ts`), — а здесь
 * приходит готовым ответом: дублировать эти проверки нельзя, они
 * разъезжаются.
 *
 * На тач-устройствах инерция не перехватывается даже при живой сцене:
 * подменять нативный скролл на телефоне — значит ломать привычные жесты
 * (см. спеку §7).
 */
export function useScrollProgress(sceneMounted: boolean): void {
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
    const useNativeScroll = !sceneMounted || coarsePointer;

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

    let lenis:
      | { raf: (time: number) => void; destroy: () => void; stop: () => void; start: () => void }
      | undefined;
    let unsubscribeMode: (() => void) | undefined;
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
      // Зал навыков блокирует прокрутку через overflow: hidden, но Lenis
      // крутит документ сам, мимо overflow, — его нужно остановить явно.
      unsubscribeMode = sceneStore.subscribe((state) => {
        if (state.mode === 'exploring') instance.stop();
        else instance.start();
      });
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      unsubscribeMode?.();
      lenis?.destroy();
    };
  }, [sceneMounted]);
}
