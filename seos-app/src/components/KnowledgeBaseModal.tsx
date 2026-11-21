import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { SE_KNOWLEDGE_BASE, type KnowledgeChunk } from '../lib/knowledgeBase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'docs' | 'library'>('docs');
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search state for library
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLibrary, setFilteredLibrary] = useState<KnowledgeChunk[]>(SE_KNOWLEDGE_BASE);

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

  // Live filter library
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLibrary(SE_KNOWLEDGE_BASE);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = SE_KNOWLEDGE_BASE.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.topic.toLowerCase().includes(q) ||
        c.chapter.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.principles.some((p) => p.toLowerCase().includes(q))
    );
    setFilteredLibrary(matches);
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
        text: `[OK] Uploaded and indexed ${res.chunks_count} sections from ${res.file_name}.`,
      });
      await fetchDocs();
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: `[ERROR] ${err.message || 'Failed to index file.'}`,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    try {
      await api.deleteDocument(fileName);
      setStatusMsg({ type: 'ok', text: `[REMOVED] ${fileName} removed from active index.` });
      await fetchDocs();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: `[ERROR] ${err.message || 'Failed to delete.'}` });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in cursor-pointer font-mono text-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-seos-surface border border-seos-border rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] cursor-default text-seos-text"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-seos-border flex items-center justify-between bg-seos-surface-2/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-seos-accent font-bold">::</span>
              <h2 className="font-bold text-xs uppercase tracking-wider text-seos-text">
                [KNOWLEDGE BASE]
              </h2>
            </div>
            <p className="text-[11px] text-seos-text-3 mt-0.5">
              Reference documents and literature used to ground AI recommendations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-seos-text-3 hover:text-seos-text font-mono text-xs px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-seos-border px-5 bg-seos-surface-2/20 text-xs">
          <button
            onClick={() => setActiveTab('docs')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'docs'
                ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
                : 'border-transparent text-seos-text-3 hover:text-seos-text'
            }`}
          >
            [01] My Documents ({uploadedDocs.length})
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'library'
                ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
                : 'border-transparent text-seos-text-3 hover:text-seos-text'
            }`}
          >
            [02] Engineering Library ({SE_KNOWLEDGE_BASE.length})
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`mx-5 mt-3 p-2 rounded text-[11px] border ${
              statusMsg.type === 'ok'
                ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                : 'bg-seos-red/15 text-seos-red border-seos-red/30'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MY DOCUMENTS */}
          {activeTab === 'docs' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-2.5 rounded bg-seos-surface-2/60 border border-seos-border text-[11px] text-seos-text-2">
                <strong>What it does:</strong> Upload your own project PRDs, design documents, or technical specs (.pdf, .md, .txt). The AI reads these files as direct context when generating requirements, user stories, and architecture.
              </div>

              {/* Upload Drop Zone */}
              <div className="p-5 rounded border border-dashed border-seos-accent/40 bg-seos-accent/5 flex flex-col items-center justify-center text-center space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".md,.pdf,.txt,.json,.yaml"
                  className="hidden"
                />
                <span className="text-xl text-seos-accent font-bold">[+]</span>
                <div className="font-bold text-xs text-seos-text">Upload Custom Project Document</div>
                <p className="text-[11px] text-seos-text-3 max-w-md">
                  Supported formats: <strong>.pdf</strong>, <strong>.md</strong>, <strong>.txt</strong>. Files are split into indexed sections for context search.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-1 px-4 py-1.5 rounded bg-seos-accent text-white font-bold text-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'INDEXING...' : '[SELECT FILE TO UPLOAD]'}
                </button>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-seos-text-3">
                  Uploaded Project Files ({uploadedDocs.length})
                </div>
                {uploadedDocs.length === 0 ? (
                  <div className="p-3.5 rounded bg-seos-surface-2 border border-seos-border text-[11px] text-seos-text-3 text-center">
                    No custom documents uploaded yet. Upload a PRD or architecture note to ground the AI assistant.
                  </div>
                ) : (
                  <div className="divide-y divide-seos-border border border-seos-border rounded overflow-hidden bg-seos-surface-2/40">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-seos-text flex items-center gap-2">
                            <span>{doc.file_name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-seos-cyan/15 text-seos-cyan border border-seos-cyan/30">
                              {doc.chunks_count || '1'} indexed sections
                            </span>
                          </div>
                          <div className="text-[10px] text-seos-text-3 mt-0.5">
                            Uploaded: {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(doc.file_name)}
                          className="px-2 py-1 rounded text-[10px] text-seos-red hover:bg-seos-red/10 border border-seos-red/30 cursor-pointer"
                        >
                          [REMOVE]
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ENGINEERING LIBRARY */}
          {activeTab === 'library' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-2.5 rounded bg-seos-surface-2/60 border border-seos-border text-[11px] text-seos-text-2">
                <strong>What it does:</strong> Pre-loaded seminal software engineering books (Martin Kleppmann, Sam Newman, Martin Fowler, Eric Evans). The AI cites these principles when designing microservices, databases, and APIs.
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter engineering principles (e.g. microservices, event sourcing, DDD, CQRS)..."
                  className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2 text-[10px] text-seos-text-3 hover:text-seos-text cursor-pointer"
                  >
                    [CLEAR]
                  </button>
                )}
              </div>

              {/* Library Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredLibrary.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-3.5 rounded border border-seos-border bg-seos-surface-2/40 flex flex-col justify-between space-y-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-seos-accent/15 text-seos-accent border border-seos-accent/30">
                          {chunk.topic.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-seos-text-3">{chunk.page}</span>
                      </div>
                      <h4 className="font-bold text-xs text-seos-text leading-tight">{chunk.title}</h4>
                      <p className="text-[11px] text-seos-text-3 mt-0.5">by {chunk.author}</p>
                      <p className="text-[11px] text-seos-text-2 mt-1.5 leading-relaxed bg-seos-bg/50 p-2 rounded border border-seos-border/50">
                        &ldquo;{chunk.summary}&rdquo;
                      </p>
                    </div>

                    <div className="pt-2 border-t border-seos-border/50 flex items-center justify-between text-[10px] text-seos-text-3">
                      <span className="truncate">{chunk.chapter}</span>
                      <span className="text-seos-green shrink-0 ml-1 font-bold">[ACTIVE]</span>
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

export default KnowledgeBaseModal;
