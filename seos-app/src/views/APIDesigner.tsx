import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { runPipeline } from '../lib/pipeline';
import { validateOpenApi, type ValidationIssue, type ParsedOperation } from '../lib/openapiValidator';
import { parseOpenApiToModel } from '../lib/reverseOpenApiParser';

const METHOD_STYLE: Record<string, { badge: string; border: string }> = {
  get: { badge: 'bg-seos-green text-black', border: 'border-l-seos-green' },
  post: { badge: 'bg-seos-cyan text-white', border: 'border-l-seos-cyan' },
  put: { badge: 'bg-seos-amber text-black', border: 'border-l-seos-amber' },
  patch: { badge: 'bg-seos-amber text-black', border: 'border-l-seos-amber' },
  delete: { badge: 'bg-seos-red text-white', border: 'border-l-seos-red' },
  options: { badge: 'bg-seos-surface-3 text-seos-text', border: 'border-l-seos-border' },
  head: { badge: 'bg-seos-surface-3 text-seos-text', border: 'border-l-seos-border' },
};

type ActiveTab = 'endpoints' | 'schemas' | 'validation';

const APIDesigner = () => {
  const yaml = useStore((s) => s.openapiYaml);
  const setOpenapiYaml = useStore((s) => s.setOpenapiYaml);
  const projectName = useStore((s) => s.projectName);
  const isStale = useStore((s) => s.staleArtifacts.api);
  const isGenerating = useStore((s) => s.pipeline.running);
  const umlNodes = useStore((s) => s.umlNodes);
  const umlEdges = useStore((s) => s.umlEdges);
  const setUMLNodes = useStore((s) => s.setUMLNodes);
  const setUMLEdges = useStore((s) => s.setUMLEdges);
  const setStaleArtifacts = useStore((s) => s.setStaleArtifacts);

  const [activeTab, setActiveTab] = useState<ActiveTab>('endpoints');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [syncToast, setSyncToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Validate and parse specification directly from YAML
  const validation = useMemo(() => validateOpenApi(yaml), [yaml]);

  const copy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([yaml], { type: 'application/yaml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'api'}-openapi.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSyncToModel = () => {
    const res = parseOpenApiToModel(yaml, umlNodes, umlEdges);
    if (!res.success) {
      setSyncToast({
        type: 'error',
        message: res.error || 'Failed to extract model from OpenAPI specification.',
      });
      return;
    }

    setUMLNodes(res.nodes);
    setUMLEdges(res.edges);
    setStaleArtifacts({ api: false });
    setSyncToast({
      type: 'success',
      message: `Canvas synchronized: ${res.nodes.length} entities (${res.stats.nodesCreated} new, ${res.stats.nodesUpdated} updated) and ${res.edges.length} relationships mapped.`,
    });
    setTimeout(() => setSyncToast(null), 4000);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newYaml = yaml.substring(0, start) + '  ' + yaml.substring(end);
      setOpenapiYaml(newYaml);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  if (!yaml.trim()) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-seos-bg text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-3xl font-medium tracking-tight">API Designer</h1>
          <p className="mt-3 text-sm text-seos-text-3">
            No API specification yet. Generate the project from the Requirements Engineer or ask the assistant — the spec is derived from your domain model.
          </p>
        </div>
      </div>
    );
  }

  const errorCount = validation.issues.filter((i) => i.type === 'error').length;
  const warningCount = validation.issues.filter((i) => i.type === 'warning').length;

  return (
    <div className="animate-fade-in h-full flex flex-col p-6 lg:px-10 lg:py-8 bg-seos-bg text-seos-text">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 shrink-0">
        <div>
          <h1 className="font-display text-3xl font-medium tracking-tight">{validation.title || 'API Designer'}</h1>
          <p className="text-xs text-seos-text-3 mt-1">Production-ready OpenAPI 3.1 specification derived from domain entities</p>
        </div>

        <div className="flex items-center gap-2 text-sm flex-wrap">
          {validation.isValid ? (
            <span className="px-3 py-1 bg-seos-green/15 text-seos-green rounded-full border border-seos-green/30 flex items-center gap-1.5 text-xs font-semibold">
              <span>✓</span> Valid OpenAPI {validation.version}
            </span>
          ) : (
            <span className="px-3 py-1 bg-seos-red/15 text-seos-red rounded-full border border-seos-red/30 flex items-center gap-1.5 text-xs font-semibold">
              <span>✕</span> {errorCount} Schema {errorCount === 1 ? 'Error' : 'Errors'}
            </span>
          )}

          {warningCount > 0 && (
            <span className="px-3 py-1 bg-seos-amber/15 text-seos-amber rounded-full border border-seos-amber/30 text-xs font-medium">
              {warningCount} {warningCount === 1 ? 'warning' : 'warnings'}
            </span>
          )}

          <span className="px-3 py-1 bg-seos-accent/15 text-seos-accent rounded-full border border-seos-accent/30 text-xs">
            {validation.pathCount} paths · {validation.operationCount} operations
          </span>
        </div>
      </div>

      {syncToast && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between gap-4 shrink-0 animate-fade-in ${
            syncToast.type === 'success'
              ? 'bg-seos-green/10 border-seos-green/30 text-seos-green'
              : 'bg-seos-red/10 border-seos-red/30 text-seos-red'
          }`}
        >
          <div className="flex items-center gap-3 text-sm">
            <span className="text-xl">{syncToast.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{syncToast.message}</span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-xs px-2 py-1 rounded hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {isStale && (
        <div className="mb-6 p-4 rounded-xl bg-seos-amber/10 border border-seos-amber/30 flex flex-wrap items-center justify-between gap-4 shrink-0 animate-fade-in">
          <div className="flex items-center gap-3 text-sm text-seos-amber">
            <span className="text-xl">⚠️</span>
            <span>
              <strong>Domain model modified:</strong> The OpenAPI specification is out of date with your latest entities.
            </span>
          </div>
          <button
            onClick={() => runPipeline({ stages: ['api'] })}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-seos-amber text-black hover:bg-seos-amber/90 transition-colors shrink-0 disabled:opacity-50 cursor-pointer shadow"
          >
            {isGenerating ? 'Regenerating...' : 'Regenerate API Spec'}
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0">
        {/* YAML Code Viewer / Editor */}
        <div className="lg:w-[56%] min-h-[320px] flex flex-col bg-seos-surface rounded-xl border border-seos-border overflow-hidden shadow-sm">
          <div className="bg-seos-surface-2/60 px-4 py-2.5 border-b border-seos-border flex items-center justify-between shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-seos-text-2">openapi.yaml</span>
              <span className="text-[11px] text-seos-text-3 font-mono">({yaml.split('\n').length} lines)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer border ${
                  isEditing
                    ? 'bg-seos-accent text-white border-seos-accent shadow-sm'
                    : 'text-seos-text-2 border-seos-border hover:bg-seos-surface-2'
                }`}
                title="Toggle manual YAML editing"
              >
                {isEditing ? 'Viewing Mode' : '✏️ Edit YAML'}
              </button>
              <button
                onClick={handleSyncToModel}
                className="px-3 py-1 rounded-md bg-seos-green/20 text-seos-green border border-seos-green/40 hover:bg-seos-green/30 transition-colors cursor-pointer font-semibold flex items-center gap-1 shadow-sm"
                title="Reverse-engineer domain entities & relationships from OpenAPI specification"
              >
                <span>⟲</span> Sync to Model
              </button>
              <button
                onClick={copy}
                className="px-3 py-1 rounded-md text-seos-text-2 hover:text-seos-accent hover:bg-seos-surface-2 transition-colors cursor-pointer"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                onClick={download}
                className="px-3 py-1 rounded-md bg-seos-surface-3 text-seos-text hover:bg-seos-surface-2 transition-colors cursor-pointer shadow-sm border border-seos-border"
              >
                Download
              </button>
            </div>
          </div>
          {isEditing ? (
            <div className="flex-1 flex flex-col min-h-0 bg-seos-bg/60 p-2">
              <div className="text-[11px] text-seos-text-3 px-2 py-1 flex items-center justify-between border-b border-seos-border/50 font-mono">
                <span>Tab inserts 2 spaces · Live syntax & schema validation active</span>
                <span className="text-seos-accent font-semibold">Editing Active</span>
              </div>
              <textarea
                value={yaml}
                onChange={(e) => setOpenapiYaml(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                spellCheck={false}
                className="flex-1 w-full bg-transparent resize-none p-3 font-mono text-[13px] leading-relaxed text-seos-text outline-none focus:ring-1 focus:ring-seos-accent/40 rounded-b overflow-auto"
                placeholder="Enter valid OpenAPI 3.1 YAML..."
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 bg-seos-bg/40 font-mono text-[13px] leading-relaxed whitespace-pre">
              {yaml.split('\n').map((line, i) => {
                if (line.trim().startsWith('#')) {
                  return <div key={i} className="text-seos-text-3 italic">{line}</div>;
                }
                const match = line.match(/^(\s*-?\s*)([^:]+):(.*)$/);
                if (match) {
                  const value = match[3].trim();
                  const valueClass = /^['"]/.test(value)
                    ? 'text-seos-green'
                    : value !== '' && !isNaN(Number(value))
                      ? 'text-seos-amber'
                      : 'text-seos-text';
                  return (
                    <div key={i}>
                      {match[1]}
                      <span className="text-seos-accent">{match[2]}</span>:<span className={valueClass}>{match[3]}</span>
                    </div>
                  );
                }
                return <div key={i}>{line || ' '}</div>;
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Tabs for Endpoints, Schemas & Validation Report */}
        <div className="lg:w-[44%] flex flex-col bg-seos-surface rounded-xl border border-seos-border overflow-hidden shadow-sm">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-seos-border bg-seos-surface-2/40 px-2 pt-2">
            <button
              onClick={() => setActiveTab('endpoints')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                activeTab === 'endpoints'
                  ? 'border-seos-accent text-seos-accent bg-seos-surface'
                  : 'border-transparent text-seos-text-3 hover:text-seos-text'
              }`}
            >
              Endpoints ({validation.operations.length})
            </button>
            <button
              onClick={() => setActiveTab('schemas')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                activeTab === 'schemas'
                  ? 'border-seos-accent text-seos-accent bg-seos-surface'
                  : 'border-transparent text-seos-text-3 hover:text-seos-text'
              }`}
            >
              Schemas ({validation.schemas.length})
            </button>
            <button
              onClick={() => setActiveTab('validation')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'validation'
                  ? 'border-seos-accent text-seos-accent bg-seos-surface'
                  : 'border-transparent text-seos-text-3 hover:text-seos-text'
              }`}
            >
              <span>Validation</span>
              {errorCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-seos-red text-white text-[10px] font-bold">
                  {errorCount}
                </span>
              ) : warningCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-seos-amber text-black text-[10px] font-bold">
                  {warningCount}
                </span>
              ) : (
                <span className="text-seos-green text-xs">✓</span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
            {/* Endpoints View */}
            {activeTab === 'endpoints' && (
              <>
                {validation.operations.map((op: ParsedOperation, i: number) => {
                  const style = METHOD_STYLE[op.method.toLowerCase()] || METHOD_STYLE.get;
                  return (
                    <div
                      key={`${op.method}-${op.path}-${i}`}
                      className={`bg-seos-surface-2/40 border border-seos-border border-l-4 ${style.border} px-4 py-3 rounded-lg hover:border-seos-accent/40 transition-all`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`${style.badge} font-bold px-2 py-0.5 rounded text-[11px] w-16 text-center uppercase shrink-0`}>
                          {op.method}
                        </span>
                        <span className="font-mono text-sm text-seos-text truncate" title={op.path}>
                          {op.path}
                        </span>
                      </div>
                      {op.summary && <p className="mt-1.5 text-xs text-seos-text-2">{op.summary}</p>}
                      {op.responses.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-seos-text-3">
                          <span>Responses:</span>
                          {op.responses.map((code) => (
                            <span key={code} className="px-1.5 py-0.5 rounded bg-seos-surface border border-seos-border font-mono text-[10px]">
                              {code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {validation.operations.length === 0 && (
                  <p className="text-sm text-seos-text-3 text-center py-8">No operations declared in the specification.</p>
                )}
              </>
            )}

            {/* Schemas View */}
            {activeTab === 'schemas' && (
              <>
                <div className="text-xs text-seos-text-2 mb-2">
                  Entities declared under <code className="text-seos-accent font-mono">components.schemas</code>:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {validation.schemas.map((schemaName) => (
                    <div
                      key={schemaName}
                      className="p-3 rounded-lg bg-seos-surface-2/50 border border-seos-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-bold text-seos-accent">[OBJ]</span>
                        <span className="font-mono text-sm font-semibold text-seos-text">{schemaName}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-seos-surface border border-seos-border text-seos-text-3 uppercase">
                        Object
                      </span>
                    </div>
                  ))}
                </div>
                {validation.schemas.length === 0 && (
                  <p className="text-sm text-seos-text-3 text-center py-8">No schemas found in components.</p>
                )}
              </>
            )}

            {/* Validation Issues View */}
            {activeTab === 'validation' && (
              <>
                <div className="p-3 rounded-lg bg-seos-surface-2/30 border border-seos-border text-xs leading-relaxed text-seos-text-2 mb-2">
                  OpenAPI 3.1 conformance checking against standard OAS requirements (structure, parameters, response codes).
                </div>

                {validation.issues.map((issue: ValidationIssue, idx: number) => {
                  const icon = issue.type === 'error' ? '[! ERR]' : issue.type === 'warning' ? '[▲ WARN]' : '[i INFO]';
                  const border =
                    issue.type === 'error'
                      ? 'border-l-seos-red bg-seos-red/5'
                      : issue.type === 'warning'
                        ? 'border-l-seos-amber bg-seos-amber/5'
                        : 'border-l-seos-accent bg-seos-accent/5';
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border border-seos-border border-l-4 ${border} text-xs flex flex-col gap-1`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{icon}</span>
                        <span className="uppercase tracking-wider text-[10px] text-seos-text-3">{issue.type}</span>
                        {issue.line && (
                          <span className="font-mono text-seos-text-3 text-[10px]">Line {issue.line}</span>
                        )}
                        {issue.path && (
                          <span className="font-mono text-seos-accent text-[10px] truncate max-w-[200px]">
                            {issue.path}
                          </span>
                        )}
                      </div>
                      <p className="text-seos-text leading-relaxed mt-0.5">{issue.message}</p>
                    </div>
                  );
                })}

                {validation.issues.length === 0 && (
                  <div className="text-center py-10 text-seos-green flex flex-col items-center gap-2">
                    <span className="text-3xl">✓</span>
                    <span className="font-semibold text-sm">Specification Valid</span>
                    <span className="text-xs text-seos-text-3 max-w-xs">
                      Zero errors or warnings detected. This OpenAPI 3.1 contract is fully ready to import into Swagger, Postman, or API gateways.
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIDesigner;
