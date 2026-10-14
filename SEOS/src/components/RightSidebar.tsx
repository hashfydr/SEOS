import React, { useState, useRef, useEffect } from 'react';
import type { AIMessage, Citation } from '../types';
import type { LLMProvider } from '../store';
import { useStore } from '../store';
import { sendChatMessage } from '../lib/assistant';

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
  const setSelectedProvider = useStore((s) => s.setSelectedProvider);

  const [activeTab, setActiveTab] = useState<'chat' | 'context'>('chat');
  const [inputText, setInputText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Local state for API key modal inputs
  const [tempKeys, setTempKeys] = useState({ openai: '', gemini: '', anthropic: '' });
  
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

  // Sync temp keys with store when modal opens
  useEffect(() => {
    if (apiKeysModalOpen) {
      setTempKeys({ ...apiKeys });
    }
  }, [apiKeysModalOpen]);

  const MODEL_OPTIONS: { provider: LLMProvider; label: string }[] = [
    { provider: 'gemini', label: 'Gemini (latest Flash)' },
    { provider: 'openai', label: 'GPT-4o' },
    { provider: 'anthropic', label: 'Claude Sonnet' },
  ];

  const activeModel = useStore((s) => s.activeModel);
  const llmNotice = useStore((s) => s.llmNotice);
  const currentModelLabel = activeModel || MODEL_OPTIONS.find((m) => m.provider === selectedProvider)?.label || 'Gemini';

  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: '*(Context Handoff Complete)*\n\nI have summarized the decisions from our previous thread and retained the necessary project context. We are now in a fresh, optimized chat window. How would you like to proceed?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isThinking) return;
    
    const userText = inputText;
    
    const newUserMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString()
    };
    
    addMessage(newUserMsg);
    setInputText('');
    setIsThinking(true);
    
    try {
      const response = await sendChatMessage(userText);
      
      const newAIMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
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

  const handleSaveKeys = () => {
    setApiKey('openai', tempKeys.openai);
    setApiKey('gemini', tempKeys.gemini);
    setApiKey('anthropic', tempKeys.anthropic);
    setApiKeysModalOpen(false);
  };

  const hasKey = !!apiKeys[selectedProvider]?.trim();

  return (
    <aside 
      className="flex flex-col bg-seos-background border-l border-seos-border h-full"
      style={{ width: props.width, minWidth: 260 }}
    >
      {/* Header */}
      <header className="flex items-center justify-between p-3 border-b border-seos-border bg-seos-panel relative">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-seos-green' : 'bg-seos-amber animate-pulse'}`}></div>
          <h2 className="font-semibold text-sm text-seos-text truncate">AI Assistant</h2>
          {!hasKey && <span className="text-[10px] text-seos-amber">No API Key</span>}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleNewChat}
            className="p-1 hover:bg-seos-hover rounded text-seos-text-muted hover:text-seos-text transition-colors focus:outline-none"
            title="New Chat (Fork & Summarize)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 hover:bg-seos-hover rounded text-seos-text-muted transition-colors focus:outline-none"
          >
            ⋮
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
      <div className="flex border-b border-seos-border shrink-0">
        <button 
          className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'chat' ? 'text-seos-primary border-b-2 border-seos-primary' : 'text-seos-text-muted hover:text-seos-text'}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          className={`flex-1 py-2 text-xs font-medium transition-colors ${activeTab === 'context' ? 'text-seos-primary border-b-2 border-seos-primary' : 'text-seos-text-muted hover:text-seos-text'}`}
          onClick={() => setActiveTab('context')}
        >
          Context
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
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasKey ? "Ask the AI Assistant..." : "⚠️ Set an API key first (click model selector below)"}
              className="w-full bg-transparent border-none resize-none outline-none text-sm text-seos-text min-h-[24px] max-h-[96px] placeholder-seos-text-muted"
              rows={Math.min(4, inputText.split('\n').length || 1)}
            />
            <div className="flex items-center justify-between pt-2 border-t border-seos-border/50">
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-seos-text-muted hover:text-seos-text rounded hover:bg-seos-hover transition-colors" title="Attach file">
                  📎
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setModelMenuOpen(!modelMenuOpen)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors border ${hasKey ? 'bg-seos-hover text-seos-text-muted hover:text-seos-text border-seos-border/50' : 'bg-seos-amber/10 text-seos-amber border-seos-amber/30'}`}
                  >
                    {currentModelLabel} ▾
                  </button>
                  {modelMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 bg-seos-surface border border-seos-border shadow-lg rounded-md overflow-hidden z-50 text-xs flex flex-col">
                      <div className="px-3 py-2 text-seos-text-muted font-medium border-b border-seos-border/50">Select AI Model</div>
                      {MODEL_OPTIONS.map(m => (
                        <button 
                          key={m.provider}
                          onClick={() => { setSelectedProvider(m.provider); setModelMenuOpen(false); }}
                          className={`w-full text-left px-3 py-2 hover:bg-seos-hover transition-colors flex items-center justify-between ${selectedProvider === m.provider ? 'text-seos-primary font-medium bg-seos-primary/10' : 'text-seos-text'}`}
                        >
                          <span>{m.label}</span>
                          {apiKeys[m.provider]?.trim() ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-seos-green"></span>
                          ) : (
                            <span className="text-[10px] text-seos-text-muted">No key</span>
                          )}
                        </button>
                      ))}
                      <div className="border-t border-seos-border/50 mt-1"></div>
                      <button 
                        onClick={() => { setModelMenuOpen(false); setApiKeysModalOpen(true); }}
                        className="w-full text-left px-3 py-2 hover:bg-seos-hover transition-colors text-seos-text flex items-center gap-2"
                      >
                        ⚙️ Manage API Keys...
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() || isThinking}
                className="bg-seos-primary text-white p-1.5 rounded disabled:opacity-50 hover:bg-seos-primary/90 transition-colors shadow-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* API Keys Modal */}
      {apiKeysModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-seos-panel border border-seos-border rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-seos-border/50 flex justify-between items-center bg-seos-hover/30">
              <h3 className="font-semibold text-seos-text">Connect AI API Keys</h3>
              <button onClick={() => setApiKeysModalOpen(false)} className="text-seos-text-muted hover:text-seos-text">✕</button>
            </div>
            <div className="p-4 flex flex-col gap-4 text-sm">
              <p className="text-seos-text-muted text-xs">
                To use the AI Assistant, please provide your own API keys for the providers you wish to use. Keys are stored locally in your browser.
              </p>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-seos-text font-medium text-xs flex items-center gap-2">
                  OpenAI API Key (GPT-4o)
                  {tempKeys.openai.trim() && <span className="w-1.5 h-1.5 rounded-full bg-seos-green"></span>}
                </label>
                <input 
                  type="password" 
                  placeholder="sk-..." 
                  value={tempKeys.openai}
                  onChange={(e) => setTempKeys({ ...tempKeys, openai: e.target.value })}
                  className="bg-seos-background border border-seos-border rounded-md px-3 py-2 text-seos-text focus:outline-none focus:border-seos-primary" 
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-seos-text font-medium text-xs flex items-center gap-2">
                  Google API Key (Gemini — newest Flash model is picked automatically)
                  {tempKeys.gemini.trim() && <span className="w-1.5 h-1.5 rounded-full bg-seos-green"></span>}
                </label>
                <input 
                  type="password" 
                  placeholder="AIza..." 
                  value={tempKeys.gemini}
                  onChange={(e) => setTempKeys({ ...tempKeys, gemini: e.target.value })}
                  className="bg-seos-background border border-seos-border rounded-md px-3 py-2 text-seos-text focus:outline-none focus:border-seos-primary" 
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-seos-text font-medium text-xs flex items-center gap-2">
                  Anthropic API Key (Claude Sonnet)
                  {tempKeys.anthropic.trim() && <span className="w-1.5 h-1.5 rounded-full bg-seos-green"></span>}
                </label>
                <input 
                  type="password" 
                  placeholder="sk-ant-..." 
                  value={tempKeys.anthropic}
                  onChange={(e) => setTempKeys({ ...tempKeys, anthropic: e.target.value })}
                  className="bg-seos-background border border-seos-border rounded-md px-3 py-2 text-seos-text focus:outline-none focus:border-seos-primary" 
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-seos-border/50 bg-seos-hover/30 flex justify-end gap-2">
              <button onClick={() => setApiKeysModalOpen(false)} className="px-3 py-1.5 rounded text-seos-text hover:bg-seos-hover text-sm">Cancel</button>
              <button onClick={handleSaveKeys} className="px-3 py-1.5 rounded bg-seos-primary text-white hover:bg-seos-primary/90 text-sm font-medium">Save Keys</button>
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
