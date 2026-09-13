import { Suspense, lazy } from 'react';
import { useStationHash } from '@/features/career-flight/useStationHash';
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';
import './styles.css';

const SceneLayer = lazy(() => import('@/features/career-flight/SceneLayer'));

export default function App() {
  const sceneEnabled = useSceneEnabled();
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
