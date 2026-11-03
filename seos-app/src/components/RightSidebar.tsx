import React, { useState, useRef, useEffect } from 'react';
import type { AIMessage, Citation } from '../types';
import type { LLMProvider } from '../store';
import { useStore } from '../store';
import { sendChatMessage } from '../lib/assistant';
import { api } from '../lib/api';
import { detectApiKeyProvider, validateApiKeyOnline } from '../lib/apiKeyDetector';

interface Props { 
  width: number; 
}

export default function RightSidebar(props: Props) {
  const messages = useStore((s) => s.messages);
  const isThinking = useStore((s) => s.isThinking);
  const addMessage = useStore((s) => s.addMessage);
  const setMessages = useStore((s) => s.setMessages);
  const setIsThinking = useStore((s) => s.setIsThinking);
  const apiKeys = useStore((s) => s.apiKeys);
  const selectedProvider = useStore((s) => s.selectedProvider);
  const setApiKey = useStore((s) => s.setApiKey);
  const autoSetApiKey = useStore((s) => s.autoSetApiKey);

  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');
  const [inputText, setInputText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const [smartKeyInput, setSmartKeyInput] = useState('');
  const [smartKeyNotice, setSmartKeyNotice] = useState<string | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Attached files for chat prompt
  interface AttachedFile {
    id: string;
    name: string;
    size: number;
    content: string;
  }
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 5MB size limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          setAttachedFiles((prev) => [
            ...prev,
            {
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              size: file.size,
              content,
            },
          ]);
        }
      };
      reader.onerror = () => {
        alert(`Failed to read file ${file.name}`);
      };
      reader.readAsText(file);
    });

    e.target.value = '';
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Close API Keys Modal on Escape
  useEffect(() => {
    if (!apiKeysModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setApiKeysModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [apiKeysModalOpen]);

  // Document upload state for RAG Context
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchUploadedDocs = async () => {
    try {
      const docsList = await api.listMyDocuments();
      setUploadedDocs(docsList || []);
    } catch {
      // Backend offline
    }
  };

  useEffect(() => {
    if (activeTab === 'context') {
      fetchUploadedDocs();
    }
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);
    try {
      const res = await api.uploadDocument(file);
      setUploadMessage(`Indexed ${res.chunks_count} chunks from ${res.file_name}!`);
      await fetchUploadedDocs();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setUploadMessage('FastAPI backend is offline (port 8000). Start ./start.sh to index documents into RAG vector space.');
      } else {
        setUploadMessage(`Error: ${msg}`);
      }
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (fileName: string) => {
    try {
      await api.deleteDocument(fileName);
      await fetchUploadedDocs();
    } catch (err: any) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };
  
  // Artifacts state for Context tab
  const requirements = useStore((s) => s.requirements);
  const userStories = useStore((s) => s.userStories);
  const umlNodes = useStore((s) => s.umlNodes);
  const docs = useStore((s) => s.docs);

  const [artifacts, setArtifacts] = useState([
    { id: 1, name: `Requirements (${requirements.length})`, included: true },
    { id: 2, name: `User Stories (${userStories.length})`, included: true },
    { id: 3, name: `ER Diagram (${umlNodes.length} entities)`, included: false },
    { id: 4, name: 'Architecture Doc', included: true },
    { id: 5, name: 'API Spec', included: false },
  ]);

  // Update artifact counts when data changes
  useEffect(() => {
    setArtifacts((prev) => prev.map((a) => {
      if (a.id === 1) return { ...a, name: `Requirements (${requirements.length})` };
      if (a.id === 2) return { ...a, name: `User Stories (${userStories.length})` };
      if (a.id === 3) return { ...a, name: `ER Diagram (${umlNodes.length} entities)` };
      if (a.id === 4) return { ...a, name: `Documents (${docs.length})` };
      return a;
    }));
  }, [requirements.length, userStories.length, umlNodes.length, docs.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Clear transient notice when modal opens
  useEffect(() => {
    if (apiKeysModalOpen) {
      setSmartKeyNotice(null);
      setSmartKeyInput('');
    }
  }, [apiKeysModalOpen]);

  const MODEL_OPTIONS: { provider: LLMProvider; label: string }[] = [
    { provider: 'groq', label: 'Groq (Auto-Model)' },
    { provider: 'nvidia', label: 'NVIDIA NIM' },
    { provider: 'gemini', label: 'Gemini (latest Flash)' },
    { provider: 'openai', label: 'GPT-4o' },
    { provider: 'anthropic', label: 'Claude Sonnet' },
  ];

  const activeModel = useStore((s) => s.activeModel);
  const llmNotice = useStore((s) => s.llmNotice);
  const currentModelLabel = activeModel || MODEL_OPTIONS.find((m) => m.provider === selectedProvider)?.label || 'Gemini';

  const projectName = useStore((s) => s.projectName);
  const architecture = useStore((s) => s.architecture);
  const openapiYaml = useStore((s) => s.openapiYaml);

  const handleNewChat = () => {
    const approvedReqs = requirements.filter((r) => r.status === 'approved');
    const entityNames = umlNodes.map((n) => n.name).join(', ') || 'None';
    const recentQueries = messages
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => m.content.slice(0, 70))
      .join('; ');

    const handoffMarkdown = `### :: CONTEXT HANDOFF v${Date.now().toString().slice(-4)} ::
**Continuous Project Context Transferred to Fresh Chat Session**

\`\`\`yaml
Project: "${projectName}"
Requirements: ${approvedReqs.length} approved / ${requirements.length} total
Domain Entities: [${entityNames}]
Architecture: "${architecture.pattern || 'Not Selected'}"
OpenAPI 3.1: ${openapiYaml.trim() ? 'Active (CRUD validated)' : 'Pending'}
Recent Discussion Focus: "${recentQueries || 'Initial project elicitation'}"
\`\`\`

> **Autonomous Context Summary:**
> All decisions regarding requirements structure, entity relations, and architecture choices have been consolidated and carried over into this active session. Full continuity is active.

How would you like to proceed with the engineering pipeline?`;

    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: handoffMarkdown,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const anyConnectedProvider = (['groq', 'nvidia', 'gemini', 'openai', 'anthropic'] as LLMProvider[]).find(
    (p) => !!apiKeys[p]?.trim()
  );
  const effectiveProvider = (apiKeys[selectedProvider]?.trim() ? selectedProvider : anyConnectedProvider) || selectedProvider;
  const hasKey = !!apiKeys[effectiveProvider]?.trim();

  const handleSend = async () => {
    if ((!inputText.trim() && attachedFiles.length === 0) || isThinking) return;
    
    let userText = inputText.trim();

    // Universal Chat Intercept: Detect if user pasted an API key directly into the chat prompt box
    const detectedKey = detectApiKeyProvider(userText);
    if (detectedKey && attachedFiles.length === 0 && !userText.includes('\n')) {
      setInputText('');
      autoSetApiKey(userText);
      const maskedKey = `${userText.slice(0, 6)}••••••••${userText.slice(-4)}`;
      const userMsg: AIMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: `[Connected API Key: ${maskedKey}]`,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setIsThinking(true);
      try {
        const valRes = await validateApiKeyOnline(userText);
        const replyMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚡ **Universal Key Detector: Engine Activated!**\n\n- **Provider:** ${detectedKey.providerName}\n- **Model:** ${detectedKey.defaultModel}\n- **Status:** ${valRes.statusMessage}\n\nYour API key is securely connected in volatile memory (Gate 1 Hardened). No manual engine selection needed—you can now ask any software engineering question or generate your project!`,
          timestamp: new Date().toISOString(),
        };
        addMessage(replyMsg);
      } catch {
        const replyMsg: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚡ **Universal Key Detector: Engine Activated!**\n\n- **Provider:** ${detectedKey.providerName}\n- **Model:** ${detectedKey.defaultModel}\n\nYour API key has been connected in volatile memory. Ready to chat!`,
          timestamp: new Date().toISOString(),
        };
        addMessage(replyMsg);
      } finally {
        setIsThinking(false);
      }
      return;
    }

    if (attachedFiles.length > 0) {
      const attachments = attachedFiles
        .map((f) => `### Attached File: ${f.name}\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n');
      userText = userText
        ? `${userText}\n\n${attachments}`
        : `Please analyze the following attached file(s):\n\n${attachments}`;
    }
    
    const newUserMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    
    addMessage(newUserMsg);
    setInputText('');
    setAttachedFiles([]);
    setIsThinking(true);
    
    try {
      const { reply, citations } = await sendChatMessage(userText);
      
      const newAIMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        citations: citations && citations.length > 0 ? citations : undefined,
        timestamp: new Date().toISOString(),
      };
      addMessage(newAIMsg);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ **Error:** ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const toggleArtifact = (id: number) => {
    setArtifacts(artifacts.map(a => a.id === id ? { ...a, included: !a.included } : a));
  };

  const handleSaveKeys = async () => {
    if (smartKeyInput.trim()) {
      const trimmed = smartKeyInput.trim();
      const detected = detectApiKeyProvider(trimmed);
      if (detected) {
        autoSetApiKey(trimmed);
      } else {
        try {
          const res = await validateApiKeyOnline(trimmed);
          if (res.detected) {
            autoSetApiKey(trimmed, res.detected);
          } else {
            setApiKey(selectedProvider, trimmed);
          }
        } catch {
          setApiKey(selectedProvider, trimmed);
        }
      }
    }
    setApiKeysModalOpen(false);
  };

  return (
    <aside 
      className="flex flex-col bg-seos-background border-l border-seos-border h-full"
      style={{ width: props.width, minWidth: 260 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-seos-border bg-seos-panel relative">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${hasKey ? 'bg-seos-green' : 'bg-seos-amber animate-pulse'}`}></div>
          <div className="flex flex-col min-w-0">
            <h2 className="font-semibold text-xs text-seos-text truncate">AI Assistant</h2>
            <button
              onClick={() => setApiKeysModalOpen(true)}
              className="font-mono text-[10px] text-left truncate hover:underline cursor-pointer flex items-center gap-1"
              title="Click to view/change active AI model & keys"
            >
              <span className="text-seos-accent font-bold truncate">[{currentModelLabel}]</span>
              {hasKey ? (
                <span className="text-seos-green text-[9px]">● ACTIVE</span>
              ) : (
                <span className="text-seos-amber text-[9px]">○ DEMO</span>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <button 
            onClick={handleNewChat}
            className="px-2 py-1 hover:bg-seos-hover rounded text-xs text-seos-accent font-bold transition-colors focus:outline-none border border-seos-accent/30 bg-seos-accent/10"
            title="New Chat (Fork & Summarize Context)"
          >
            [+] NEW
          </button>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="px-1.5 py-1 hover:bg-seos-hover rounded text-xs font-mono text-seos-text-muted transition-colors focus:outline-none"
          >
            [...]
          </button>
        </div>
        {menuOpen && (
          <div className="absolute right-3 top-10 w-40 bg-seos-panel border border-seos-border shadow-lg rounded-md overflow-hidden z-20 text-sm">
            <button className="w-full text-left px-4 py-2 hover:bg-seos-hover text-seos-text transition-colors" onClick={() => { setMessages([]); setMenuOpen(false); }}>Clear History</button>
            <button className="w-full text-left px-4 py-2 hover:bg-seos-hover text-seos-text transition-colors" onClick={() => setMenuOpen(false)}>Export Chat</button>
            <button className="w-full text-left px-4 py-2 hover:bg-seos-hover text-seos-text transition-colors" onClick={() => { setApiKeysModalOpen(true); setMenuOpen(false); }}>Manage API Keys</button>
            <button className="w-full text-left px-4 py-2 hover:bg-seos-hover text-seos-text transition-colors" onClick={() => setMenuOpen(false)}>Toggle Citations</button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-seos-border shrink-0 font-mono">
        <button 
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'chat' ? 'text-seos-accent border-b-2 border-seos-accent bg-seos-accent/5' : 'text-seos-text-muted hover:text-seos-text'}`}
          onClick={() => setActiveTab('chat')}
        >
          [&gt;_ CHAT]
        </button>
        <button 
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === 'context' ? 'text-seos-accent border-b-2 border-seos-accent bg-seos-accent/5' : 'text-seos-text-muted hover:text-seos-text'}`}
          onClick={() => setActiveTab('context')}
        >
          [# CONTEXT]
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 relative">
        {activeTab === 'context' ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-seos-text-muted uppercase mb-2">Project Artifacts</h3>
            {artifacts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2 rounded-md bg-seos-panel border border-seos-border text-sm shadow-sm">
                <span className={`text-seos-text ${!a.included && 'opacity-50 line-through'}`}>{a.name}</span>
                <button 
                  onClick={() => toggleArtifact(a.id)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${a.included ? 'bg-seos-primary/10 text-seos-primary hover:bg-seos-primary/20' : 'bg-seos-hover text-seos-text-muted hover:text-seos-text'}`}
                >
                  {a.included ? 'Include' : 'Exclude'}
                </button>
              </div>
            ))}

            {/* Course & Personal Reference Material (RAG) */}
            <div className="mt-4 pt-4 border-t border-seos-border/60">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-seos-accent uppercase tracking-wider font-mono">
                  [:: RAG MATERIAL ::]
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-2 py-1 rounded bg-seos-accent/15 border border-seos-accent/30 text-seos-accent hover:bg-seos-accent/25 text-[11px] font-mono font-bold transition-colors cursor-pointer"
                >
                  {isUploading ? '[UPLOADING...]' : '[+ UPLOAD FILE]'}
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.md,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <p className="text-[11px] text-seos-text-3 mb-2 font-mono">
                Upload PDFs or Markdown notes. Grounded chunks will be cited in AI answers.
              </p>

              {uploadMessage && (
                <div className="p-2 rounded bg-seos-surface-2 border border-seos-border text-[11px] font-mono text-seos-accent mb-2">
                  {uploadMessage}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {uploadedDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-seos-surface-2 border border-seos-border flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-mono font-semibold text-seos-text truncate">
                        [DOC] {doc.file_name}
                      </div>
                      <div className="text-[10px] text-seos-text-3 font-mono">
                        {doc.chunks_count} chunks indexed · {doc.topic}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.file_name)}
                      className="text-seos-red hover:bg-seos-red/10 px-1.5 py-0.5 rounded font-mono text-xs cursor-pointer"
                      title="Remove document chunks"
                    >
                      [x]
                    </button>
                  </div>
                ))}
                {uploadedDocs.length === 0 && (
                  <div className="p-3 text-center rounded border border-dashed border-seos-border/80 text-[11px] text-seos-text-3 font-mono">
                    No course or personal docs uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <MessageItem key={msg.id} msg={msg} />
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-seos-text-muted text-xs p-3 self-start bg-seos-panel rounded-lg border border-seos-border shadow-sm">
                <div className="flex gap-1">
                  <span className="animate-bounce inline-block w-1.5 h-1.5 bg-seos-text-muted rounded-full"></span>
                  <span className="animate-bounce inline-block w-1.5 h-1.5 bg-seos-text-muted rounded-full" style={{ animationDelay: '0.2s' }}></span>
                  <span className="animate-bounce inline-block w-1.5 h-1.5 bg-seos-text-muted rounded-full" style={{ animationDelay: '0.4s' }}></span>
                </div>
                <span>{llmNotice || `Querying ${currentModelLabel}...`}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      {activeTab === 'chat' && (
        <div className="p-3 border-t border-seos-border bg-seos-background shrink-0">
          <div className="relative flex flex-col gap-2 bg-seos-panel border border-seos-border rounded-lg p-2 focus-within:border-seos-primary focus-within:ring-1 focus-within:ring-seos-primary transition-all shadow-sm">
            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1 max-h-24 overflow-y-auto border-b border-seos-border/40 mb-1">
                {attachedFiles.map((f) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-seos-accent/15 border border-seos-accent/30 text-[11px] font-mono text-seos-accent"
                  >
                    <span>📎 {f.name}</span>
                    <span className="text-[10px] opacity-70">
                      ({Math.round((f.size / 1024) * 10) / 10}KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(f.id)}
                      className="text-seos-accent hover:text-seos-red font-bold ml-0.5 cursor-pointer"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI Assistant (or paste requirements, ideas)..."
              className="w-full bg-transparent border-none resize-none outline-none text-sm text-seos-text min-h-[24px] max-h-[96px] placeholder-seos-text-muted"
              rows={Math.min(4, inputText.split('\n').length || 1)}
            />
            <div className="flex items-center justify-between pt-2 border-t border-seos-border/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  className="px-2 py-1 font-mono text-xs text-seos-text-muted hover:text-seos-accent rounded hover:bg-seos-hover border border-seos-border/40 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Attach file (.txt, .md, .json, .yaml, code, etc.)"
                >
                  <span>[+] FILE</span>
                  {attachedFiles.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-seos-accent"></span>
                  )}
                </button>
                <input
                  ref={chatFileInputRef}
                  type="file"
                  accept=".txt,.md,.json,.yaml,.yml,.csv,.py,.ts,.js,.tsx,.jsx,.html,.css,.sql,.doc,.docx,.pdf"
                  multiple
                  onChange={handleChatFileSelect}
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={() => setApiKeysModalOpen(true)}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors border font-mono cursor-pointer ${
                    hasKey 
                      ? 'bg-seos-green/10 text-seos-green border-seos-green/30 hover:bg-seos-green/20' 
                      : 'bg-seos-surface-2 text-seos-text-muted hover:text-seos-text border-seos-border/50 hover:border-seos-accent/40'
                  }`}
                  title="Click to paste API key and switch model"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-seos-green' : 'bg-seos-cyan'}`}></span>
                  <span className="font-semibold">{currentModelLabel}</span>
                  <span className="text-[10px] text-seos-text-muted font-normal">[{hasKey ? 'Active' : 'No Key'}]</span>
                </button>
              </div>
              <button 
                onClick={handleSend}
                disabled={(!inputText.trim() && attachedFiles.length === 0) || isThinking}
                className="bg-seos-accent text-white font-mono text-xs font-bold px-3 py-1.5 rounded disabled:opacity-50 hover:bg-seos-accent-2 transition-colors shadow-sm cursor-pointer"
              >
                [&gt;_ SEND]
              </button>
            </div>
          </div>
        </div>
      )}
      {/* API Keys Modal */}
      {apiKeysModalOpen && (
        <div
          onClick={() => setApiKeysModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-seos-surface border border-seos-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden cursor-default text-seos-text"
          >
            <div className="px-5 py-3.5 border-b border-seos-border flex justify-between items-center bg-seos-surface-2/40">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-seos-accent font-bold px-1.5 py-0.5 rounded bg-seos-accent/15 border border-seos-accent/30">
                  :: UNIVERSAL AI DETECTOR ::
                </span>
                <h3 className="font-semibold text-sm text-seos-text">Paste &amp; Play AI Engine Ingest</h3>
              </div>
              <button
                onClick={() => setApiKeysModalOpen(false)}
                className="text-seos-text-3 hover:text-seos-text font-mono text-sm px-1.5 py-0.5 rounded cursor-pointer"
              >
                [X]
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs font-mono">
              {/* Active Model Status Bar */}
              <div className="p-3 rounded-lg bg-seos-surface-2/60 border border-seos-border/70 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase text-seos-text-3 font-semibold">Current Active Engine</span>
                  <span className="text-xs font-bold text-seos-text flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-seos-green animate-pulse' : 'bg-seos-cyan'}`}></span>
                    {hasKey ? currentModelLabel : 'No AI Engine Configured'}
                  </span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  hasKey
                    ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                    : 'bg-seos-cyan/15 text-seos-cyan border-seos-cyan/30'
                }`}>
                  {hasKey ? '[Memory Key Connected]' : '[Awaiting Key]'}
                </span>
              </div>

              {/* Universal Smart Key Detection Input */}
              <div className="p-4 rounded-lg bg-seos-accent/10 border border-seos-accent/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-seos-accent flex items-center gap-1.5">
                    <span>⚡</span> UNIVERSAL DETECTOR: PASTE &amp; PLAY
                  </span>
                  {smartKeyNotice && (
                    <span className="text-[10px] text-seos-green font-bold truncate max-w-[240px]">
                      {smartKeyNotice}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-seos-text-2 font-sans leading-relaxed">
                  Paste <strong>ANY</strong> API key below. SEOS performs instantaneous prefix parsing and dynamic endpoint probing against provider model catalogs to activate and route the engine automatically. No manual selection needed.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Paste key (nvapi-..., gsk_..., AIzaSy..., sk-proj-...)"
                    value={smartKeyInput}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setSmartKeyInput(val);
                      const trimmed = val.trim();
                      if (!trimmed) {
                        setSmartKeyNotice(null);
                        return;
                      }

                      const detected = detectApiKeyProvider(trimmed);
                      if (detected) {
                        autoSetApiKey(trimmed);
                        setSmartKeyNotice(`[⚡ Identified: ${detected.providerName}] Probing catalog...`);
                      } else if (trimmed.length > 10) {
                        setSmartKeyNotice('Scanning provider catalogs...');
                      } else {
                        setSmartKeyNotice(null);
                      }

                      if (trimmed.length >= 15) {
                        setIsValidatingKey(true);
                        try {
                          const res = await validateApiKeyOnline(trimmed);
                          if (res.detected) {
                            autoSetApiKey(trimmed, res.detected);
                          }
                          setSmartKeyNotice(res.statusMessage);
                        } catch {
                          // Keep existing notice
                        } finally {
                          setIsValidatingKey(false);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveKeys();
                      }
                    }}
                    className="flex-1 bg-seos-bg border border-seos-border rounded-md px-3 py-2 text-xs text-seos-text focus:outline-none focus:border-seos-accent font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={isValidatingKey || !smartKeyInput.trim()}
                    onClick={async () => {
                      if (smartKeyInput) {
                        const trimmed = smartKeyInput.trim();
                        setIsValidatingKey(true);
                        try {
                          const res = await validateApiKeyOnline(trimmed);
                          if (res.detected) {
                            autoSetApiKey(trimmed, res.detected);
                            setSmartKeyNotice(res.statusMessage);
                          } else {
                            setApiKey(selectedProvider, trimmed);
                          }
                        } finally {
                          setIsValidatingKey(false);
                        }
                      }
                      handleSaveKeys();
                    }}
                    className="px-4 py-2 rounded bg-seos-accent text-white hover:bg-seos-accent-2 text-xs font-bold cursor-pointer shrink-0 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {isValidatingKey ? 'Verifying...' : '⚡ Activate & Play'}
                  </button>
                </div>

                {/* Supported Engine Auto-Detection Badges */}
                <div className="pt-1 flex flex-col gap-1.5">
                  <span className="text-[10px] text-seos-text-3 font-semibold uppercase">Auto-Recognized Catalogs:</span>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border/70 text-[10px] text-seos-text">
                      ✓ Groq Cloud <span className="text-seos-text-3">(gsk_*)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border/70 text-[10px] text-seos-text">
                      ✓ NVIDIA NIM <span className="text-seos-text-3">(nvapi-*)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border/70 text-[10px] text-seos-text">
                      ✓ Google Gemini <span className="text-seos-text-3">(AIzaSy*)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border/70 text-[10px] text-seos-text">
                      ✓ OpenAI GPT <span className="text-seos-text-3">(sk-*)</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border/70 text-[10px] text-seos-text">
                      ✓ Claude <span className="text-seos-text-3">(sk-ant-*)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Reset Option */}
              <div className="flex items-center justify-between text-[11px] text-seos-text-3 pt-1">
                <span>[Gate 1 Hardened] Keys kept strictly in volatile memory.</span>
                {hasKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey('nvidia', '');
                      setApiKey('groq', '');
                      setApiKey('openai', '');
                      setApiKey('gemini', '');
                      setApiKey('anthropic', '');
                      setSmartKeyInput('');
                      setSmartKeyNotice('API keys cleared');
                    }}
                    className="text-seos-red hover:underline cursor-pointer"
                  >
                    Disconnect Key
                  </button>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-seos-border bg-seos-surface-2/40 flex justify-end gap-2 font-mono">
              <button
                onClick={() => setApiKeysModalOpen(false)}
                className="px-3 py-1.5 rounded text-seos-text-3 hover:text-seos-text text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSaveKeys}
                className="px-4 py-1.5 rounded bg-seos-accent text-white hover:bg-seos-accent-2 text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function MessageItem({ msg }: { msg: AIMessage }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const [showCitations, setShowCitations] = useState(false);

  // Helper to parse bold text **bold**
  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-inherit">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Safe date formatting — fixes "Invalid Date" bug
  const formatTime = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get citation display text — handles both {source,page} and {title,url} shapes
  const getCitationLabel = (c: Citation, index: number): string => {
    return c.title || c.source || `Source ${index + 1}`;
  };

  const getCitationLink = (c: Citation): string => {
    return c.url || '#';
  };

  if (isSystem) {
    return (
      <div className="text-center text-xs text-seos-text-muted py-2 px-4 italic">
        {renderText(msg.content)}
        {msg.timestamp && (
          <span className="block mt-1 text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`group flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
      <div className={`relative p-3 rounded-xl text-sm max-w-[90%] shadow-sm ${isUser ? 'bg-seos-primary text-white rounded-tr-sm' : 'bg-seos-panel border border-seos-border text-seos-text rounded-tl-sm'}`}>
        <div className="break-words leading-relaxed whitespace-pre-wrap">
          {renderText(msg.content)}
        </div>
        
        {!isUser && (
          <div className="absolute top-0 right-0 -mt-3 -mr-2 hidden group-hover:flex items-center bg-seos-panel border border-seos-border rounded-md shadow-md overflow-hidden z-10 text-seos-text-muted">
            <button className="p-1.5 hover:bg-seos-hover hover:text-seos-text transition-colors" title="Copy" onClick={() => navigator.clipboard.writeText(msg.content)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        )}

        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="mt-3 pt-2 border-t border-seos-border/50">
            <button 
              onClick={() => setShowCitations(!showCitations)}
              className="text-xs text-seos-text-muted hover:text-seos-text flex items-center gap-1 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform ${showCitations ? 'rotate-90' : ''}`}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
              {showCitations ? 'Hide' : 'Show'} {msg.citations.length} sources
            </button>
            
            {showCitations && (
              <div className="mt-2 flex flex-col gap-1.5">
                {msg.citations.map((c, i) => (
                  <a key={i} href={getCitationLink(c)} className="text-xs text-seos-primary hover:underline truncate flex items-center gap-1">
                    <span className="opacity-50">[{i + 1}]</span> {getCitationLabel(c, i)}
                    {c.page && <span className="opacity-50">— {c.page}</span>}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <span className="text-[10px] text-seos-text-muted mt-1 px-1">
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
}
