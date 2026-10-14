import { useStore } from '../store';
import { STAGE_LABEL, resumePipeline } from '../lib/pipeline';

/** Top-bar indicator for the generation pipeline: progress while running, retry after an error. */
export default function PipelineStatus() {
  const pipeline = useStore((s) => s.pipeline);
  const setPipeline = useStore((s) => s.setPipeline);
  const notice = useStore((s) => s.llmNotice);

  if (pipeline.running && pipeline.stage) {
    return (
      <div
        className="hidden md:flex items-center gap-2.5 rounded-full border border-seos-accent/30 bg-seos-accent/10 pl-2.5 pr-3.5 py-1 text-xs text-seos-accent"
        role="status"
        aria-live="polite"
      >
        <span className="h-3.5 w-3.5 rounded-full border-2 border-seos-accent border-t-transparent animate-spin-slow" aria-hidden="true" />
        <span>
          {notice ? notice : <>Generating · <span className="font-medium">{STAGE_LABEL[pipeline.stage]}</span></>}
        </span>
        <span className="flex gap-0.5" aria-hidden="true">
          {pipeline.planned.map((st) => (
            <span
              key={st}
              className={`h-1.5 w-3 rounded-full ${
                pipeline.done.includes(st) ? 'bg-seos-accent' : st === pipeline.stage ? 'bg-seos-accent/50 animate-pulse' : 'bg-seos-accent/15'
              }`}
            />
          ))}
        </span>
      </div>
    );
  }

  if (pipeline.error) {
    return (
      <div className="hidden md:flex items-center gap-2 rounded-full border border-seos-red/30 bg-seos-red/10 pl-3 pr-1 py-0.5 text-xs text-seos-red max-w-[420px]" role="alert">
        <span className="truncate" title={pipeline.error}>
          {pipeline.error}
        </span>
        <button
          onClick={() => void resumePipeline()}
          className="shrink-0 rounded-full bg-seos-red px-2.5 py-1 font-medium text-white hover:opacity-90"
        >
          Retry
        </button>
        <button
          onClick={() => setPipeline({ error: null })}
          className="shrink-0 rounded-full px-1.5 py-1 hover:bg-seos-red/10"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
