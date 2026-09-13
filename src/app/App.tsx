import { Suspense, lazy } from 'react';
import { useStationHash } from '@/features/career-flight/useStationHash';
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import { useScrollProgress } from '@/features/scroll-bridge/useScrollProgress';
import { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';
import './styles.css';

const SceneLayer = lazy(() => import('@/features/career-flight/SceneLayer'));

export default function App() {
  const sceneEnabled = useSceneEnabled();
  // Порядок важен: мост скролла сначала ставит прогресс по текущей позиции
  // скролла, а затем useStationHash может переопределить его, если в URL
  // пришёл deep link на станцию (иначе вход по '#mplat' сломается).
  useScrollProgress();
  useStationHash();

  return (
    <>
      {sceneEnabled && (
        <Suspense fallback={null}>
          <SceneLayer />
        </Suspense>
      )}
      <main>
        <ResumeDocument />
      </main>
    </>
  );
}
