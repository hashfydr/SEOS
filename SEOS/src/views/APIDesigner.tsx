import { useMemo, useState } from 'react';
import { useStore } from '../store';

interface Operation {
  method: string;
  path: string;
  summary: string;
}

const METHOD_STYLE: Record<string, { badge: string; border: string }> = {
  get: { badge: 'bg-seos-green text-black', border: 'border-l-seos-green' },
  post: { badge: 'bg-seos-cyan text-white', border: 'border-l-seos-cyan' },
  put: { badge: 'bg-seos-amber text-black', border: 'border-l-seos-amber' },
  patch: { badge: 'bg-seos-amber text-black', border: 'border-l-seos-amber' },
  delete: { badge: 'bg-seos-red text-white', border: 'border-l-seos-red' },
};

/** Pull operations out of the spec's `paths:` block (2-space indented YAML). */
function parseOperations(yaml: string): Operation[] {
  const ops: Operation[] = [];
  let inPaths = false;
  let path = '';
  let current: Operation | null = null;
  for (const line of yaml.split('\n')) {
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths && /^\S/.test(line)) break; // next top-level key
    if (!inPaths) continue;
    const p = line.match(/^ {2}(\/\S*):\s*$/);
    if (p) { path = p[1]; current = null; continue; }
    const m = line.match(/^ {4}(get|post|put|patch|delete):\s*$/);
    if (m && path) { current = { method: m[1], path, summary: '' }; ops.push(current); continue; }
    const s = line.match(/^ {6}summary:\s*['"]?(.*?)['"]?\s*$/);
    if (s && current && !current.summary) current.summary = s[1];
  }
  return ops;
}

const APIDesigner = () => {
  const yaml = useStore((s) => s.openapiYaml);
  const projectName = useStore((s) => s.projectName);
  const operations = useMemo(() => parseOperations(yaml), [yaml]);
  const pathCount = new Set(operations.map((o) => o.path)).size;
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="animate-fade-in h-full flex flex-col p-6 lg:px-10 lg:py-8 bg-seos-bg text-seos-text">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 shrink-0">
        <h1 className="font-display text-3xl font-medium tracking-tight">API Designer</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-seos-surface-2 text-seos-text-2 rounded-full border border-seos-border">OpenAPI 3.1</span>
          <span className="px-3 py-1 bg-seos-accent/15 text-seos-accent rounded-full border border-seos-accent/30">
            {pathCount} paths · {operations.length} operations
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0">
        {/* YAML */}
        <div className="lg:w-[58%] min-h-[320px] flex flex-col bg-seos-surface rounded-xl border border-seos-border overflow-hidden">
          <div className="bg-seos-surface-2/50 px-4 py-2 border-b border-seos-border flex items-center justify-between shrink-0">
            <span className="text-sm font-mono text-seos-text-2">openapi.yaml</span>
            <div className="flex items-center gap-1 text-xs">
              <button onClick={copy} className="px-2.5 py-1 rounded-md text-seos-text-2 hover:text-seos-accent hover:bg-seos-surface-2 transition-colors">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button onClick={download} className="px-2.5 py-1 rounded-md text-seos-text-2 hover:text-seos-accent hover:bg-seos-surface-2 transition-colors">
                Download
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="font-mono text-[13px] leading-relaxed whitespace-pre">
              {yaml.split('\n').map((line, i) => {
                if (line.trim().startsWith('#')) {
                  return <div key={i} className="text-seos-text-3">{line}</div>;
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
            </pre>
          </div>
        </div>

        {/* Endpoints */}
        <div className="lg:w-[42%] flex flex-col gap-3 overflow-auto pb-4 pr-1">
          {operations.map((op, i) => {
            const style = METHOD_STYLE[op.method] || METHOD_STYLE.get;
            return (
              <div key={`${op.method}-${op.path}-${i}`} className={`bg-seos-surface border border-seos-border border-l-4 ${style.border} px-4 py-3 rounded-lg`}>
                <div className="flex items-center gap-3">
                  <span className={`${style.badge} font-bold px-2 py-0.5 rounded text-[11px] w-16 text-center uppercase shrink-0`}>{op.method}</span>
                  <span className="font-mono text-sm text-seos-text truncate" title={op.path}>{op.path}</span>
                </div>
                {op.summary && <p className="mt-1.5 text-sm text-seos-text-2">{op.summary}</p>}
              </div>
            );
          })}
          {operations.length === 0 && (
            <p className="text-sm text-seos-text-3">No operations found in the specification's paths block.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIDesigner;
