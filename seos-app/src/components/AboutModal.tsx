import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGoToHomepage: () => void;
}

export const AboutModal: React.FC<Props> = ({ isOpen, onClose, onGoToHomepage }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh] cursor-default text-seos-text font-sans"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-seos-accent font-bold px-2 py-0.5 rounded bg-seos-accent/15 border border-seos-accent/30">
              :: ABOUT ::
            </span>
            <div>
              <h2 className="font-bold text-base text-seos-text">Software Engineering Operating System</h2>
              <p className="text-[11px] text-seos-text-3 font-mono">SEOS Platform &bull; Version 1.0.0 (Release Build 2026.11)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-seos-text-3 hover:text-seos-text font-mono text-sm px-2 py-1 rounded transition-colors cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-sans text-seos-text leading-relaxed">
          {/* Mission & Architectural Philosophy */}
          <div className="p-4 rounded-xl bg-seos-surface-2/50 border border-seos-border/70 space-y-2">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-accent">
              Architectural Philosophy: Canonical Traceability
            </div>
            <p>
              Traditional software engineering often suffers from <strong>artifact drift</strong>: requirements live in Jira, models in draw.io, schemas in Postman, and architecture in Google Docs. When code changes, documentation becomes obsolete.
            </p>
            <p className="text-seos-text-2">
              <strong>SEOS connects the entire lifecycle into one unified engineering model.</strong> An idea is elicited once, and every subsequent layer—requirements, INVEST user stories, domain models, architecture patterns, OpenAPI contracts, and IEEE 830 documentation—is derived and synchronized with bidirectional traceability.
            </p>
          </div>

          {/* Core Capabilities */}
          <div className="space-y-2">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
              Core Capabilities
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border flex items-center gap-2">
                <span className="text-seos-accent font-bold">[✓]</span>
                <span>AI-Assisted 6-Stage Engineering Pipeline</span>
              </div>
              <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border flex items-center gap-2">
                <span className="text-seos-green font-bold">[✓]</span>
                <span>INVEST &amp; Gherkin Acceptance Validation</span>
              </div>
              <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border flex items-center gap-2">
                <span className="text-seos-cyan font-bold">[✓]</span>
                <span>Visual UML &amp; Entity-Relationship Canvas</span>
              </div>
              <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border flex items-center gap-2">
                <span className="text-seos-amber font-bold">[✓]</span>
                <span>OpenAPI 3.1 Bidirectional Schema Sync</span>
              </div>
              <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border flex items-center gap-2">
                <span className="text-seos-accent font-bold">[✓]</span>
                <span>Living IEEE 830 SRS, SDD &amp; README</span>
              </div>
              <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border flex items-center gap-2">
                <span className="text-seos-green font-bold">[✓]</span>
                <span>Literature-Grounded RAG (Newman, Fowler)</span>
              </div>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="space-y-2">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
              Technology Stack
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
              {['React 19', 'TypeScript', 'Tailwind CSS v4', 'FastAPI', 'Python 3.12+', 'PostgreSQL 16', 'SQLAlchemy OCC', 'Google Gemini 1.5', 'Claude 3.5 Sonnet', 'OpenAI GPT-4o', 'pypdf RAG'].map((tech) => (
                <span key={tech} className="px-2.5 py-1 rounded bg-seos-surface-2 border border-seos-border text-seos-text-2">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Academic & Platform Information */}
          <div className="p-4 rounded-xl bg-seos-surface-2/30 border border-seos-border/50 grid grid-cols-2 gap-4 font-mono text-[11px]">
            <div>
              <span className="text-seos-text-3 uppercase block text-[10px]">Academic Institution</span>
              <span className="font-semibold text-seos-text">Thapar Institute of Eng. &amp; Tech.</span>
            </div>
            <div>
              <span className="text-seos-text-3 uppercase block text-[10px]">Course Code</span>
              <span className="font-semibold text-seos-text">UCS503: Software Engineering</span>
            </div>
            <div>
              <span className="text-seos-text-3 uppercase block text-[10px]">Release Channel</span>
              <span className="font-semibold text-seos-green">[STABLE PRODUCTION V1.0]</span>
            </div>
            <div>
              <span className="text-seos-text-3 uppercase block text-[10px]">License</span>
              <span className="font-semibold text-seos-text">MIT Open-Source &bull; Educational</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-seos-border bg-seos-surface-2/40 flex justify-between items-center text-xs font-mono">
          <button
            onClick={() => {
              onClose();
              onGoToHomepage();
            }}
            className="text-seos-accent hover:underline flex items-center gap-1.5 cursor-pointer font-bold"
          >
            <span>Visit Product Homepage &amp; Geological Strata &rarr;</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-seos-accent text-white hover:bg-seos-accent-2 transition-colors cursor-pointer font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
