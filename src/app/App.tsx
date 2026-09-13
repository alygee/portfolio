import { Suspense, lazy } from 'react';
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';
import './styles.css';

const SceneLayer = lazy(() => import('@/features/career-flight/SceneLayer'));

export default function App() {
  const sceneEnabled = useSceneEnabled();

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
