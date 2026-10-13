import { Canvas, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Suspense, lazy } from 'react';
import { useSceneState } from '@/entities/scene-mode/sceneStore';
import { CareerScene } from '@/features/career-flight/scene/CareerScene';
import { CAMERA } from '@/features/career-flight/scene/sceneConfig';
import { SceneReady } from './SceneReady';

// Только в разработке. Условие проверяется при сборке: в проде
// import.meta.env.DEV — литерал false, ветка и чанк панели исчезают. Статический
// импорт под тем же условием не вырезался бы (у leva нет sideEffects: false,
// спека §3.3).
const DevPanel = import.meta.env.DEV ? lazy(() => import('@/features/career-flight/scene/debug/DevPanel')) : null;

/**
 * Деградация из спеки §7 работающей цепочкой, а не по отдельности:
 * `PerformanceMonitor` считает fps скользящим окном и при устойчивой просадке
 * зовёт `regress()`, тот опускает `performance.current` до минимума, и только
 * это заставляет `AdaptiveDpr` снизить разрешение. Сам по себе `AdaptiveDpr`
 * инертен: менять `performance.current` некому.
 *
 * Границы заданы явно (дефолтные drei — 60..100 на высокочастотных экранах)
 * под бюджет §7: 60 fps на десктопе, не ниже 30 на мобильных. `flipflops`
 * ограничивает качание вверх-вниз: после трёх переключений монитор фиксирует
 * fallback и перестаёт поднимать качество обратно.
 */
function AdaptiveQuality() {
  const regress = useThree((state) => state.performance.regress);

  return (
    <PerformanceMonitor
      bounds={(refreshrate) => (refreshrate > 90 ? [50, 90] : [45, 60])}
      flipflops={3}
      onDecline={regress}
      onFallback={regress}
    >
      <AdaptiveDpr pixelated />
    </PerformanceMonitor>
  );
}

/** Дефолтный экспорт: слой подгружается через React.lazy, вместе с ним — three. */
export default function SceneLayer() {
  // Указатель и жесты канвас получает только в режиме исследования зала:
  // в остальное время документ поверх сцены должен оставаться кликабельным,
  // а касание — прокручивать страницу (фаза 1.5; спека зала §5.5).
  const exploring = useSceneState((state) => state.mode === 'exploring');

  return (
    <div className="scene-layer" aria-hidden="true">
      {/*
        `pointer-events: none` в CSS у `.scene-layer` не доходит до канваса:
        `@react-three/fiber` сам ставит inline `pointer-events: auto` на свою
        внутреннюю обёртку вокруг `<canvas>`, а инлайн-стиль перебивает
        унаследованное значение. `style` — единственный проп, через который
        R3F даёт переопределить именно эту обёртку, поэтому декларация
        передаётся сюда, а не через className/CSS.
      */}
      <Canvas
        dpr={[1, 1.75]}
        camera={{ ...CAMERA }}
        style={{
          pointerEvents: exploring ? 'auto' : 'none',
          touchAction: exploring ? 'none' : 'auto',
        }}
      >
        <Suspense fallback={null}>
          <CareerScene />
          <SceneReady />
        </Suspense>
        <AdaptiveQuality />
        {DevPanel && (
          <Suspense fallback={null}>
            <DevPanel />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}
