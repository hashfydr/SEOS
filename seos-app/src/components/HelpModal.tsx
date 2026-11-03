import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpArticle {
  id: string;
  section: string;
  title: string;
  summary: string;
  content: string[];
}

const HELP_ARTICLES: HelpArticle[] = [
  // 01. Getting Started
  {
    id: 'getting-started-overview',
    section: '01. Getting Started',
    title: 'Getting Started with SEOS',
    summary: 'Account setup, first project creation, and workspace overview.',
    content: [
      'Welcome to SEOS (Software Engineering Operating System). SEOS provides a single connected workspace for the entire software engineering lifecycle.',
      'To start a new project, click on your project name at the bottom of the left sidebar or select "[+] Projects & Case Studies" from the More menu.',
      'You can also explore built-in reference case studies (FreshCart Microservices, FoodDash Modular Monolith, CarePulse Event-Driven) to see completed canonical project models.',
    ],
  },
  {
    id: 'six-stage-pipeline',
    section: '01. Getting Started',
    title: 'Understanding the Six-Stage Pipeline',
    summary: 'From plain-language concept to living IEEE 830 documentation.',
    content: [
      'SEOS structures software development into six sequential, canonical layers:',
      '1. Requirements Engineering: Functional and non-functional requirements elicitation.',
      '2. User Stories: INVEST-validated user stories with Gherkin Given-When-Then acceptance criteria.',
      '3. System Modeling: Domain entity-relationship diagrams (ERD) and UML class models.',
      '4. Architecture: Architectural pattern recommendation, trade-offs, and component topologies.',
      '5. API Designer: Validated OpenAPI 3.1 contracts derived directly from domain entities.',
      '6. Documentation: Living IEEE 830 SRS, SDD, and project README derived from upstream artifacts.',
      'Every layer rests upon the layer above it. Changes upstream automatically flag downstream artifacts for review to prevent documentation drift.',
    ],
  },

  // 02. Feature Guides
  {
    id: 'requirements-stories',
    section: '02. Feature Guides',
    title: 'Requirements & User Stories',
    summary: 'Approval gates, INVEST verification, and bidirectional trace links.',
    content: [
      'Requirements can be generated via AI from your product idea or authored manually. Each requirement receives a canonical ID (e.g. REQ-001).',
      'Requirements remain in Draft state until explicitly approved. Approving requirements unlocks automatic derivation of INVEST user stories.',
      'Every user story maintains a bidirectional trace link back to its parent requirement ID (e.g. [REQ-001] badge), ensuring zero orphan stories.',
    ],
  },
  {
    id: 'system-modeling-api',
    section: '02. Feature Guides',
    title: 'System Modeling & API Designer',
    summary: 'Visual ERD canvas, field editor, and bidirectional OpenAPI synchronization.',
    content: [
      'The System Modeling canvas renders domain entities with primary/foreign key badges, SQL column types, and Bezier relation connectors.',
      'In the API Designer, OpenAPI 3.1 specifications are validated with live AST diagnostics against OpenAPI specifications.',
      'The Reverse Parser allows you to modify the YAML contract and instantly sync new schemas back to visual canvas entities.',
    ],
  },
  {
    id: 'ai-engine-credentials',
    section: '02. Feature Guides',
    title: 'AI Engine & Unified Key Management',
    summary: 'Zero vendor lock-in, smart key detection, and volatile memory security.',
    content: [
      'SEOS supports Google Gemini, OpenAI GPT, and Anthropic Claude through a unified AI Engine.',
      'Paste any API key into the Smart Key Ingest bar (AIzaSy..., sk-proj-..., sk-ant-...). SEOS automatically identifies the provider and activates the model.',
      'Security Compliance (Gate 1): All personal API keys are stored strictly in volatile browser memory and never written to plaintext disk or localStorage.',
      'If you have no custom key, SEOS automatically routes inference through the institutional backend proxy.',
    ],
  },
  {
    id: 'rag-knowledge-base',
    section: '02. Feature Guides',
    title: 'Knowledge Base & RAG Retrieval',
    summary: 'Uploading course literature, sliding-window chunking, and semantic search.',
    content: [
      'The Knowledge Base allows uploading course syllabi, textbooks, and architectural papers in .pdf, .md, and .txt formats.',
      'Uploaded documents are parsed via pypdf and split into sliding-window text chunks with contextual overlap.',
      'During AI synthesis, relevant passages from literature (e.g. Newman on Microservices, Kleppmann on Data-Intensive Systems) are retrieved to ground generation in software engineering theory.',
    ],
  },

  // 03. Troubleshooting & Support
  {
    id: 'troubleshooting-sync',
    section: '03. Troubleshooting & Support',
    title: 'Synchronization & Conflict Resolution',
    summary: 'Optimistic concurrency control (OCC), HTTP 409 handling, and offline cache.',
    content: [
      'SEOS uses version-based Optimistic Concurrency Control (OCC V2) to prevent concurrent overwrites.',
      'If another client updates a project simultaneously, the server returns HTTP 409 Conflict.',
      'SEOS will prompt you with a manual merge diff dialogue to resolve concurrent edits safely.',
      'If your network disconnects, mutations are queued locally and synchronized automatically once connectivity is restored.',
    ],
  },
  {
    id: 'troubleshooting-shortcuts',
    section: '03. Troubleshooting & Support',
    title: 'Keyboard Shortcuts & Navigation',
    summary: 'Speed up your workflow across the workspace.',
    content: [
      '• Esc: Dismiss any open modal or dialogue.',
      '• Ctrl / Cmd + Z: Undo canvas mutation in System Modeling.',
      '• Ctrl / Cmd + Shift + Z: Redo canvas mutation.',
      '• Tab (in YAML editor): Indents exactly 2 spaces.',
      '• Enter (in AI chat input): Send message / trigger command.',
    ],
  },

  // 04. More Resources
  {
    id: 'resources-faq',
    section: '04. More Resources',
    title: 'Frequently Asked Questions (FAQ)',
    summary: 'Common queries regarding licensing, data export, and browser support.',
    content: [
      'Q: Can I export my project for external grading or GitHub?',
      'A: Yes. Use "[↓] Export SRS (.md)" for formatted specifications, "[P] Export Document (.pdf)" for printable docs, or "[{}] Export Project (.json)" for complete portable backups.',
      'Q: What browsers are supported?',
      'A: SEOS is optimized for modern Chromium (Google Chrome, Microsoft Edge, Brave) and Firefox on Linux, macOS, and Windows.',
      'Q: How do I report an issue?',
      'A: Contact your course instructor/mentor or submit an issue via the academic repository tracker with the diagnostic error payload.',
    ],
  },
];

export const HelpModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticleId, setActiveArticleId] = useState<string>(HELP_ARTICLES[0].id);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredArticles = HELP_ARTICLES.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.section.toLowerCase().includes(q) ||
      a.content.some((c) => c.toLowerCase().includes(q))
    );
  });

  const selectedArticle =
    HELP_ARTICLES.find((a) => a.id === activeArticleId) || filteredArticles[0] || HELP_ARTICLES[0];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[85vh] cursor-default text-seos-text font-sans"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs text-seos-green font-bold px-2 py-0.5 rounded bg-seos-green/15 border border-seos-green/30">
              :: HELP CENTER ::
            </span>
            <div>
              <h2 className="font-bold text-base text-seos-text">SEOS Knowledge &amp; Guidance</h2>
              <p className="text-[11px] text-seos-text-3 font-mono">
                Find instructions, understand features, and troubleshoot platform behavior.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-seos-text-3 hover:text-seos-text font-mono text-sm px-2 py-1 rounded transition-colors cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-seos-border/70 bg-seos-surface-2/20 flex items-center gap-3">
          <span className="text-seos-text-3 font-mono text-xs">:: SEARCH ::</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles, guides, and troubleshooting FAQs..."
            className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-seos-text placeholder:text-seos-text-3"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-seos-text-3 hover:text-seos-text font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Content Body: Sidebar list + Detail View */}
        <div className="flex-1 flex overflow-hidden">
          {/* Article List */}
          <nav className="w-72 md:w-80 border-r border-seos-border bg-seos-surface-2/30 overflow-y-auto p-3 space-y-1 shrink-0 font-mono text-xs">
            {filteredArticles.length === 0 ? (
              <div className="p-4 text-center text-seos-text-3 text-xs">No articles matching query.</div>
            ) : (
              filteredArticles.map((art) => {
                const isActive = art.id === selectedArticle.id;
                return (
                  <button
                    key={art.id}
                    onClick={() => setActiveArticleId(art.id)}
                    className={`w-full text-left p-2.5 rounded transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-seos-accent/15 border border-seos-accent/40 text-seos-accent font-semibold'
                        : 'hover:bg-seos-surface-2 text-seos-text-2 hover:text-seos-text'
                    }`}
                  >
                    <div className="text-[10px] uppercase text-seos-text-3 font-bold">{art.section}</div>
                    <div className="font-semibold text-xs mt-0.5 truncate">{art.title}</div>
                    <div className="text-[11px] text-seos-text-3/80 font-sans line-clamp-1 mt-0.5">
                      {art.summary}
                    </div>
                  </button>
                );
              })
            )}
          </nav>

          {/* Article Viewer */}
          <main className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-seos-accent font-bold">
                {selectedArticle.section}
              </div>
              <h1 className="text-xl font-bold text-seos-text mt-1">{selectedArticle.title}</h1>
              <p className="text-xs text-seos-text-3 font-mono mt-0.5">{selectedArticle.summary}</p>
            </div>

            <hr className="border-seos-border/60" />

            <div className="space-y-3 text-xs text-seos-text leading-relaxed font-sans">
              {selectedArticle.content.map((paragraph, idx) => (
                <p key={idx} className={paragraph.startsWith('•') || paragraph.match(/^\d\./) ? 'pl-2 font-mono text-seos-text-2' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="pt-6 border-t border-seos-border/50 text-[11px] font-mono text-seos-text-3 flex justify-between items-center">
              <span>SEOS Help Center &bull; Knowledge Corpus v1.0</span>
              <span className="text-seos-green">[Verified Academic Guide]</span>
            </div>
          </main>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-seos-border bg-seos-surface-2/40 flex justify-between items-center text-xs font-mono">
          <span className="text-seos-text-3">Need institutional guidance? Contact your faculty mentor.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-seos-accent text-white hover:bg-seos-accent-2 transition-colors cursor-pointer font-semibold"
          >
            Close Help
          </button>
        </div>
      </div>
    </div>
  );
};
