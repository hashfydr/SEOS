import React, { useState, useEffect, useMemo } from 'react';
import { useStore, type PipelineStage } from '../store';
import type { ViewId } from '../types';

const go = (view: ViewId) => {
  window.location.hash = `#/workspace/${view}`;
};

type LayerState = 'empty' | 'draft' | 'settled' | 'generating';

const STATE_LABEL: Record<LayerState, string> = {
  empty: 'Not started',
  draft: 'In draft',
  settled: 'Settled',
  generating: 'Generating…',
};

const STATE_STYLE: Record<LayerState, string> = {
  empty: 'text-seos-text-3 border-seos-border-2',
  draft: 'text-seos-amber border-seos-amber/40 bg-seos-amber/10',
  settled: 'text-seos-green border-seos-green/40 bg-seos-green/10',
  generating: 'text-seos-accent border-seos-accent/40 bg-seos-accent/10 animate-pulse',
};

// Strata swatches (top soil → bedrock), matching the home page figure
const SWATCH = ['#ebdfc8', '#dcc6a1', '#c9a576', '#b47a50', '#8c5a3d', '#5e4a3d', '#352d27'];

const ProjectOverview: React.FC = () => {
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const productIdea = useStore((s) => s.productIdea);
  const requirements = useStore((s) => s.requirements);
  const userStories = useStore((s) => s.userStories);
  const umlNodes = useStore((s) => s.umlNodes);
  const umlEdges = useStore((s) => s.umlEdges);
  const docs = useStore((s) => s.docs);
  const openapiYaml = useStore((s) => s.openapiYaml);
  const architecture = useStore((s) => s.architecture);
  const pipeline = useStore((s) => s.pipeline);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(projectName);

  useEffect(() => {
    setEditNameValue(projectName);
  }, [projectName]);

  const handleNameSave = () => {
    if (editNameValue.trim()) {
      setProjectName(editNameValue.trim());
    } else {
      setEditNameValue(projectName);
    }
    setIsEditingName(false);
  };

  // ─── Derived project facts ───
  const facts = useMemo(() => {
    const approvedReqs = requirements.filter((r) => r.status === 'approved').length;
    const approvedStories = userStories.filter((s) => s.status === 'approved').length;
    const paths = (openapiYaml.match(/^\s{2}\/\S*:\s*$/gm) || []).length;
    const operations = (openapiYaml.match(/^\s{4}(get|post|put|patch|delete):/gm) || []).length;

    const reqIds = new Set(requirements.map((r) => r.id));
    const coveredReqIds = new Set(userStories.map((s) => s.reqId).filter((id) => reqIds.has(id)));
    const uncovered = requirements.filter((r) => !coveredReqIds.has(r.id));
    const orphanStories = userStories.filter((s) => !reqIds.has(s.reqId));

    const techStack = Array.from(
      new Set(
        architecture.components
          .flatMap((c) => c.tech.split(/\s*[+/,]\s*/))
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    );

    return { approvedReqs, approvedStories, paths, operations, uncovered, orphanStories, coveredCount: coveredReqIds.size, techStack };
  }, [requirements, userStories, openapiYaml, architecture]);

  const hasArch = architecture.pattern && architecture.pattern !== 'None';

  const layers: { name: string; view: ViewId; detail: string; state: LayerState }[] = [
    {
      name: 'Idea',
      view: 'requirements',
      detail: productIdea ? productIdea : 'Describe what you want to build.',
      state: productIdea ? 'settled' : 'empty',
    },
    {
      name: 'Requirements',
      view: 'requirements',
      detail: requirements.length
        ? `${requirements.length} total · ${facts.approvedReqs} approved`
        : 'Generated from the idea.',
      state: !requirements.length ? 'empty' : facts.approvedReqs === requirements.length ? 'settled' : 'draft',
    },
    {
      name: 'User Stories',
      view: 'user-stories',
      detail: userStories.length
        ? `${userStories.length} stories · ${facts.approvedStories} approved`
        : 'Derived from approved requirements.',
      state: !userStories.length ? 'empty' : facts.approvedStories === userStories.length ? 'settled' : 'draft',
    },
    {
      name: 'System Model',
      view: 'modeling',
      detail: umlNodes.length ? `${umlNodes.length} entities · ${umlEdges.length} relationships` : 'Entities, keys and relationships.',
      state: umlNodes.length ? 'settled' : 'empty',
    },
    {
      name: 'Architecture',
      view: 'architecture',
      detail: hasArch ? architecture.pattern : 'Pattern, components and trade-offs.',
      state: hasArch ? 'settled' : 'empty',
    },
    {
      name: 'API',
      view: 'api-designer',
      detail: openapiYaml ? `${facts.paths} paths · ${facts.operations} operations` : 'OpenAPI 3.1 from the model.',
      state: openapiYaml ? 'settled' : 'empty',
    },
    {
      name: 'Documentation',
      view: 'documentation',
      detail: docs.length ? docs.map((d) => d.type).join(' · ') : 'SRS, SDD and README.',
      state: docs.length ? 'settled' : 'empty',
    },
  ];

  // Layer index (in `layers`) for each pipeline stage; index 0 is the idea itself
  const STAGE_LAYER: Record<PipelineStage, number> = { requirements: 1, stories: 2, model: 3, architecture: 4, api: 5, docs: 6 };
  if (pipeline.running && pipeline.stage) {
    layers[STAGE_LAYER[pipeline.stage]].state = 'generating';
  }

  const settledCount = layers.filter((l) => l.state === 'settled').length;
  const nextLayer = layers.find((l) => l.state !== 'settled');

  const stats = [
    { label: 'Requirements', value: requirements.length, sub: `${facts.approvedReqs} approved`, ratio: requirements.length ? facts.approvedReqs / requirements.length : 0, view: 'requirements' as ViewId },
    { label: 'User stories', value: userStories.length, sub: `${facts.approvedStories} approved`, ratio: userStories.length ? facts.approvedStories / userStories.length : 0, view: 'user-stories' as ViewId },
    { label: 'Entities', value: umlNodes.length, sub: `${umlEdges.length} relationships`, ratio: umlNodes.length ? 1 : 0, view: 'modeling' as ViewId },
    { label: 'API operations', value: facts.operations, sub: `${facts.paths} paths`, ratio: facts.operations ? 1 : 0, view: 'api-designer' as ViewId },
  ];

  return (
    <div className="h-full overflow-y-auto bg-seos-bg text-seos-text">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-8 lg:px-10 lg:py-10">
        {/* ── Header ── */}
        <header className="flex flex-wrap items-end justify-between gap-6 pb-8 border-b border-seos-border">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-seos-accent">Project</p>
            {isEditingName ? (
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                  if (e.key === 'Escape') {
                    setEditNameValue(projectName);
                    setIsEditingName(false);
                  }
                }}
                className="mt-2 w-full max-w-xl font-display text-4xl font-medium tracking-tight bg-seos-surface border border-seos-accent rounded-md px-3 py-1 outline-none text-seos-text"
                autoFocus
              />
            ) : (
              <h1 className="mt-2 font-display text-4xl lg:text-[44px] font-medium tracking-tight leading-tight flex items-center gap-3">
                <span className="truncate">{projectName}</span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="shrink-0 p-1.5 rounded-md text-seos-text-3 hover:text-seos-accent hover:bg-seos-surface-2 transition-colors"
                  title="Rename project"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </h1>
            )}
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-seos-text-2">
              {productIdea || 'No idea described yet. Start in the Requirements Engineer or tell the assistant what you want to build.'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-display text-3xl">
                {settledCount}
                <span className="text-seos-text-3 text-xl">/{layers.length}</span>
              </div>
              <div className="text-xs text-seos-text-3">layers settled</div>
            </div>
            {nextLayer && (
              <button
                onClick={() => go(nextLayer.view)}
                className="rounded-md bg-seos-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-seos-accent-2 transition-colors"
              >
                Continue: {nextLayer.name} →
              </button>
            )}
          </div>
        </header>

        {/* ── Stats ── */}
        <section className="mt-8 grid grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <button
              key={s.label}
              onClick={() => go(s.view)}
              className="group text-left rounded-xl border border-seos-border bg-seos-surface p-5 hover:border-seos-accent/40 transition-colors"
            >
              <div className="text-[13px] text-seos-text-2">{s.label}</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="font-display text-4xl leading-none">{s.value}</span>
                <span className="text-xs text-seos-text-3 pb-1">{s.sub}</span>
              </div>
              <div className="mt-4 h-1 rounded-full bg-seos-surface-3 overflow-hidden">
                <div className="h-full rounded-full bg-seos-accent transition-all" style={{ width: `${Math.round(s.ratio * 100)}%` }} />
              </div>
            </button>
          ))}
        </section>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-6">
          {/* ── Strata ── */}
          <section className="rounded-xl border border-seos-border bg-seos-surface overflow-hidden">
            <div className="flex items-baseline justify-between px-6 pt-6 pb-4">
              <h2 className="font-display text-xl font-medium tracking-tight">Project strata</h2>
              <span className="text-xs text-seos-text-3">Each layer is derived from the one above</span>
            </div>
            <ol>
              {layers.map((layer, i) => (
                <li key={layer.name}>
                  <button
                    onClick={() => go(layer.view)}
                    className="group w-full flex items-center gap-4 px-6 py-4 border-t border-seos-border text-left hover:bg-seos-surface-2/60 transition-colors"
                  >
                    <span
                      className="w-2.5 self-stretch rounded-sm shrink-0"
                      style={{ background: SWATCH[i], boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)' }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] text-seos-text-3 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-seos-text group-hover:text-seos-accent transition-colors">{layer.name}</span>
                      <span className="block mt-0.5 text-[13px] text-seos-text-3 truncate">{layer.detail}</span>
                    </span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATE_STYLE[layer.state]}`}>
                      {STATE_LABEL[layer.state]}
                    </span>
                    <span className="shrink-0 text-seos-text-3 group-hover:text-seos-accent group-hover:translate-x-0.5 transition-all" aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>

          {/* ── Side column ── */}
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-seos-border bg-seos-surface p-6">
              <h2 className="font-display text-xl font-medium tracking-tight">Traceability</h2>
              <p className="mt-1 text-[13px] text-seos-text-3">Requirements covered by at least one user story.</p>
              <div className="mt-5 flex items-end gap-3">
                <span className="font-display text-4xl leading-none">
                  {requirements.length ? Math.round((facts.coveredCount / requirements.length) * 100) : 0}%
                </span>
                <span className="text-xs text-seos-text-3 pb-1">
                  {facts.coveredCount} of {requirements.length} requirements
                </span>
              </div>
              <div className="mt-4 flex gap-1">
                {requirements.map((r) => {
                  const covered = !facts.uncovered.includes(r);
                  return (
                    <span
                      key={r.id}
                      title={`${r.id} — ${covered ? 'covered' : 'no story yet'}`}
                      className={`h-2 flex-1 rounded-sm ${covered ? 'bg-seos-green' : 'bg-seos-surface-3'}`}
                    />
                  );
                })}
              </div>
              {facts.uncovered.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-xs font-medium text-seos-text-2">Without a story</p>
                  {facts.uncovered.slice(0, 4).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => go('requirements')}
                      className="w-full flex gap-3 text-left rounded-md px-3 py-2 bg-seos-surface-2/60 hover:bg-seos-surface-2 transition-colors"
                    >
                      <span className="font-mono text-[11px] text-seos-accent pt-0.5 shrink-0">{r.id}</span>
                      <span className="text-[13px] text-seos-text-2 line-clamp-2">{r.description}</span>
                    </button>
                  ))}
                  {facts.uncovered.length > 4 && (
                    <p className="text-xs text-seos-text-3">and {facts.uncovered.length - 4} more</p>
                  )}
                </div>
              )}
              {facts.orphanStories.length > 0 && (
                <p className="mt-4 text-xs text-seos-amber">
                  {facts.orphanStories.length} {facts.orphanStories.length === 1 ? 'story points' : 'stories point'} to a requirement that no longer exists.
                </p>
              )}
            </section>

            <section className="rounded-xl border border-seos-border bg-seos-surface p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-medium tracking-tight">Architecture</h2>
                <button onClick={() => go('architecture')} className="text-xs text-seos-accent hover:underline underline-offset-4">Details</button>
              </div>
              <p className="mt-3 text-[15px] font-medium">{hasArch ? architecture.pattern : 'Not chosen yet'}</p>
              {hasArch && (
                <p className="mt-1 text-[13px] leading-relaxed text-seos-text-3 line-clamp-3">{architecture.rationale}</p>
              )}
              {facts.techStack.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {facts.techStack.map((tech) => (
                    <span key={tech} className="rounded-md border border-seos-border-2 bg-seos-surface-2 px-2.5 py-1 text-xs text-seos-text-2">
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;
