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
        className="hidden md:flex items-center gap-2 rounded-lg border border-seos-accent/30 bg-seos-accent/10 px-2.5 py-1 text-xs font-mono text-seos-accent font-semibold"
        role="status"
        aria-live="polite"
      >
        <span className="text-[#22c55e] animate-pulse">[▲ GENERATING]</span>
        <span>
          {notice ? notice : <>{STAGE_LABEL[pipeline.stage]}</>}
        </span>
        <span className="text-[10px] text-seos-accent/70 font-mono">
          [{pipeline.done.length}/{pipeline.planned.length}]
        </span>
      </div>
    );
  }

  if (pipeline.error) {
    return (
      <div className="hidden md:flex items-center gap-2 rounded-lg border border-seos-red/30 bg-seos-red/10 px-2.5 py-1 text-xs font-mono text-seos-red max-w-[420px]" role="alert">
        <span className="font-bold">[! ERR]</span>
        <span className="truncate" title={pipeline.error}>
          {pipeline.error}
        </span>
        <button
          onClick={() => void resumePipeline()}
          className="shrink-0 rounded bg-seos-red px-2 py-0.5 font-bold text-white hover:opacity-90 cursor-pointer"
        >
          [RETRY]
        </button>
        <button
          onClick={() => setPipeline({ error: null })}
          className="shrink-0 rounded px-1.5 py-0.5 hover:bg-seos-red/10 font-bold cursor-pointer"
          aria-label="Dismiss"
        >
          [x]
        </button>
      </div>
    );
  }

  return null;
}
