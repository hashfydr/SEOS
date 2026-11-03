import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { SE_KNOWLEDGE_BASE, type KnowledgeChunk } from '../lib/knowledgeBase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'search' | 'corpus'>('docs');
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeChunk[]>([]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Load uploaded docs from backend
  const fetchDocs = async () => {
    try {
      const docs = await api.listMyDocuments();
      setUploadedDocs(docs || []);
    } catch {
      // Backend offline or local session
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDocs();
    }
  }, [isOpen]);

  // Handle live search across local SE corpus + keywords
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(SE_KNOWLEDGE_BASE.slice(0, 4));
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = SE_KNOWLEDGE_BASE.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.chapter.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.keywords.some((k) => k.toLowerCase().includes(q)) ||
        c.principles.some((p) => p.toLowerCase().includes(q))
    );
    setSearchResults(matches);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMsg(null);
    try {
      const res = await api.uploadDocument(file);
      setStatusMsg({
        type: 'ok',
        text: `Indexed ${res.chunks_count} chunks from ${res.file_name} into RAG vector space!`,
      });
      await fetchDocs();
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err.message || 'Failed to upload and index document.',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      await api.deleteDocument(fileName);
      setStatusMsg({ type: 'ok', text: `Removed ${fileName} from knowledge index.` });
      await fetchDocs();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message || 'Failed to delete document.' });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] cursor-default text-seos-text font-sans"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-seos-accent font-bold px-2 py-0.5 rounded bg-seos-accent/15 border border-seos-accent/30">
              :: RAG &amp; LITERATURE ::
            </span>
            <div>
              <h2 className="font-bold text-base text-seos-text">Knowledge Base &amp; Context Retrieval</h2>
              <p className="text-[11px] text-seos-text-3 font-mono">
                Manage uploaded course literature, inspect sliding-window chunks, and query software engineering principles.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-seos-border px-6 bg-seos-surface-2/20 font-mono text-xs">
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-3 px-4 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'docs'
                ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
                : 'border-transparent text-seos-text-3 hover:text-seos-text'
            }`}
          >
            [01 / COURSE DOCUMENTS ({uploadedDocs.length})]
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-4 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
                : 'border-transparent text-seos-text-3 hover:text-seos-text'
            }`}
          >
            [02 / SEMANTIC QUERY SEARCH]
          </button>
          <button
            onClick={() => setActiveTab('corpus')}
            className={`py-3 px-4 font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'corpus'
                ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
                : 'border-transparent text-seos-text-3 hover:text-seos-text'
            }`}
          >
            [03 / SE LITERATURE CORPUS ({SE_KNOWLEDGE_BASE.length})]
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs font-mono border ${
                statusMsg.type === 'ok'
                  ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                  : 'bg-seos-red/15 text-seos-red border-seos-red/30'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* TAB 1: Uploaded Course Documents */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl border border-dashed border-seos-accent/40 bg-seos-accent/5 flex flex-col items-center justify-center text-center space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".md,.pdf,.txt,.json,.yaml"
                  className="hidden"
                />
                <span className="font-mono text-2xl text-seos-accent">[+]</span>
                <div className="font-semibold text-sm">Upload Course Syllabus or Technical Literature</div>
                <p className="text-xs text-seos-text-3 max-w-md font-mono">
                  Supported formats: <strong>.pdf</strong>, <strong>.md</strong>, <strong>.txt</strong>.
                  Files are automatically chunked into 600-character windows with 100-character overlap for vector search.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-2 px-4 py-2 rounded-lg bg-seos-accent hover:bg-seos-accent-2 text-white font-mono text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isUploading ? 'Chunking & Indexing...' : 'Select File to Ingest'}
                </button>
              </div>

              <div>
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text mb-2">
                  Active Ingested Documents
                </h3>
                {uploadedDocs.length === 0 ? (
                  <div className="p-4 rounded-lg bg-seos-surface-2 border border-seos-border text-xs text-seos-text-3 font-mono text-center">
                    No custom documents indexed yet. Upload a syllabus or textbook chapter to ground AI generation.
                  </div>
                ) : (
                  <div className="divide-y divide-seos-border border border-seos-border rounded-xl overflow-hidden bg-seos-surface-2/40">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="font-bold text-seos-text flex items-center gap-2">
                            <span>{doc.file_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-seos-cyan/15 text-seos-cyan border border-seos-cyan/30">
                              {doc.chunks_count || '1+'} chunks
                            </span>
                          </div>
                          <div className="text-[10px] text-seos-text-3 mt-0.5">
                            Uploaded: {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(doc.file_name)}
                          className="px-2.5 py-1 rounded text-[11px] text-seos-red hover:bg-seos-red/10 border border-seos-red/30 cursor-pointer"
                        >
                          [DELETE]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Semantic Query Search */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query knowledge base (e.g. bounded context, microservices, 3NF, Gherkin)..."
                  className="w-full pl-4 pr-10 py-2.5 text-xs font-mono rounded-xl bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs font-mono text-seos-text-3 hover:text-seos-text"
                  >
                    [clear]
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-xs font-mono text-seos-text-3">
                  Showing {searchResults.length} matching knowledge chunk(s):
                </div>

                {searchResults.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-seos-surface-2/50 border border-seos-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-seos-accent px-1.5 py-0.5 rounded bg-seos-accent/10 border border-seos-accent/30">
                          {item.id}
                        </span>
                        <span className="font-bold text-seos-text">{item.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-seos-green px-1.5 py-0.5 rounded bg-seos-green/10 border border-seos-green/30 font-bold">
                        [RAG CITATION MATCH]
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-seos-text-2">
                      by <strong>{item.author}</strong> &bull; {item.chapter} ({item.page})
                    </div>

                    <p className="text-xs text-seos-text leading-relaxed font-sans bg-seos-bg/60 p-2.5 rounded border border-seos-border/50">
                      &ldquo;{item.summary}&rdquo;
                    </p>

                    <div className="space-y-1">
                      <div className="font-mono text-[10px] text-seos-text-3 uppercase font-bold">Key Architectural Principles:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-seos-text-2">
                        {item.principles.map((pr, pIdx) => (
                          <li key={pIdx}>{pr}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Pre-Indexed Software Engineering Literature */}
          {activeTab === 'corpus' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-seos-cyan/10 border border-seos-cyan/30 text-xs font-mono text-seos-cyan">
                [PRE-INDEXED] The following seminal engineering texts are grounded in the SEOS vector space.
                All chat assistant architecture recommendations cite these references.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SE_KNOWLEDGE_BASE.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-xl bg-seos-surface-2/40 border border-seos-border flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-seos-accent/15 text-seos-accent border border-seos-accent/30">
                          {chunk.topic.toUpperCase()}
                        </span>
                        <span className="font-mono text-[10px] text-seos-text-3">{chunk.page}</span>
                      </div>
                      <h4 className="font-bold text-sm text-seos-text">{chunk.title}</h4>
                      <p className="font-mono text-xs text-seos-text-3 mt-0.5">by {chunk.author}</p>
                      <p className="text-xs text-seos-text-2 mt-2 leading-relaxed">{chunk.summary}</p>
                    </div>

                    <div className="pt-2 border-t border-seos-border/50 flex items-center justify-between text-[11px] font-mono text-seos-accent">
                      <span>{chunk.chapter}</span>
                      <span>[ACTIVE]</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
