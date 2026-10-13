import { Suspense, lazy, useEffect } from 'react';
import { progressStore } from '@/entities/route/progressStore';
import { bindProgress, dispatchScene } from '@/entities/scene-mode/sceneStore';
import { useStationHash } from '@/features/career-flight/useStationHash';
import { OpenHallButton } from '@/features/skill-galaxy/OpenHallButton';
import { useHallDocument } from '@/features/skill-galaxy/useHallDocument';
import { ResumeDocument } from '@/features/resume-document/ResumeDocument';
import { useScrollProgress } from '@/features/scroll-bridge/useScrollProgress';
import { useSceneEnabled } from '@/shared/hooks/useSceneEnabled';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import './styles.css';

// Это и есть ленивая граница чанка сцены — единственное легитимное место,
// где допустим импорт SceneLayer вне его собственного поддерева: он динамический
// (`lazy(() => import(...))`), поэтому three не попадёт в главный чанк.
// oxlint-disable-next-line no-restricted-imports
const SceneLayer = lazy(() => import('@/widgets/scene/SceneLayer'));

/** Сцена упала — её больше нет: режим исследования закрывается, документ возвращается. */
function onSceneError() {
  dispatchScene({ type: 'sceneReady', ready: false });
}

export default function App() {
  const sceneEnabled = useSceneEnabled();
  // Порядок важен: мост скролла сначала ставит прогресс по текущей позиции
  // скролла, а затем useStationHash может переопределить его, если в URL
  // пришёл deep link на станцию (иначе вход по '#mplat' сломается).
  useScrollProgress(sceneEnabled);
  useStationHash();
  // Режим сцены (полёт / стыковка / зал) выводится из прогресса маршрута.
  useEffect(() => bindProgress(progressStore), []);
  useHallDocument();

  return (
    <>
      {sceneEnabled && (
        // Граница ошибок обязательна: без неё сбой загрузки чанка сцены
        // размонтировал бы корень вместе с предрендеренным резюме — пустой
        // экран вместо документа.
        <ErrorBoundary onError={onSceneError}>
          <Suspense fallback={null}>
            <SceneLayer />
          </Suspense>
        </ErrorBoundary>
      )}
      <main>
        <ResumeDocument skillsAction={<OpenHallButton />} />
      </main>
    </>
  );
}
