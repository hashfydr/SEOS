import { lazy, Suspense } from 'react';
import type { ViewId } from '../types';

const ProjectOverview = lazy(() => import('../views/ProjectOverview'));
const IdeaInput = lazy(() => import('../views/IdeaInput'));
const UserStories = lazy(() => import('../views/UserStories'));
const SystemModeling = lazy(() => import('../views/SystemModeling'));
const Architecture = lazy(() => import('../views/Architecture'));
const APIDesigner = lazy(() => import('../views/APIDesigner'));
const Documentation = lazy(() => import('../views/Documentation'));
const LearningDashboard = lazy(() => import('../views/LearningDashboard'));

interface Props {
  activeView: ViewId;
}

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center bg-seos-bg">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-seos-accent/20 flex items-center justify-center animate-pulse-glow">
          <div className="w-5 h-5 border-2 border-seos-accent border-t-transparent rounded-full animate-spin-slow" />
        </div>
        <p className="text-sm text-seos-text-3">Loading module...</p>
      </div>
    </div>
  );
}

const VIEW_MAP: Record<ViewId, React.LazyExoticComponent<React.ComponentType>> = {
  overview: ProjectOverview,
  requirements: IdeaInput,
  'user-stories': UserStories,
  modeling: SystemModeling,
  architecture: Architecture,
  'api-designer': APIDesigner,
  documentation: Documentation,
  learning: LearningDashboard,
};

export default function MainWorkspace({ activeView }: Props) {
  const ViewComponent = VIEW_MAP[activeView];

  return (
    <main className="flex-1 h-full overflow-hidden bg-seos-bg">
      <Suspense fallback={<LoadingFallback />}>
        <ViewComponent />
      </Suspense>
    </main>
  );
}
