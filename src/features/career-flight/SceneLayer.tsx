import { Canvas, useThree } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Suspense } from 'react';
import { CareerScene } from './CareerScene';

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
  return (
    <div className="scene-layer" aria-hidden="true">
      <Canvas dpr={[1, 1.75]} camera={{ fov: 60, near: 0.1, far: 400 }}>
        <Suspense fallback={null}>
          <CareerScene />
        </Suspense>
        <AdaptiveQuality />
      </Canvas>
    </div>
  );
}
