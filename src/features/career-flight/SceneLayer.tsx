import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import { Suspense } from 'react';
import { CareerScene } from './CareerScene';

/** Дефолтный экспорт: слой подгружается через React.lazy, вместе с ним — three. */
export default function SceneLayer() {
  return (
    <div className="scene-layer" aria-hidden="true">
      <Canvas dpr={[1, 1.75]} camera={{ fov: 60, near: 0.1, far: 400 }}>
        <Suspense fallback={null}>
          <CareerScene />
        </Suspense>
        <AdaptiveDpr pixelated />
      </Canvas>
    </div>
  );
}
