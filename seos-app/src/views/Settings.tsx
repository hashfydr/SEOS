import { useState } from 'react';
import { useStore } from '../store';
import { sanitizeApiKey, validateApiKeyOnline } from '../lib/apiKeyDetector';
import { exportProjectAsMarkdown, exportProjectAsPDF } from '../lib/exportUtils';
import type { LLMProvider } from '../types';

type SettingsTab = 'ai' | 'workspace' | 'backups';

interface TabItem {
  id: SettingsTab;
  code: string;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'ai', code: '01', label: 'AI Models' },
  { id: 'workspace', code: '02', label: 'Workspace' },
  { id: 'backups', code: '03', label: 'Backups' },
];

interface ProviderConfig {
  id: LLMProvider;
  name: string;
  defaultModel: string;
  placeholder: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'gemini', name: 'Google Gemini', defaultModel: 'Gemini 2.5 Flash', placeholder: 'Paste Gemini key (e.g. AIzaSy... or AQ...)' },
  { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'Claude 3.5 Sonnet', placeholder: 'Paste Claude key (e.g. sk-ant-...)' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'GPT-4o / 4o-mini', placeholder: 'Paste OpenAI key (e.g. sk-proj-...)' },
  { id: 'groq', name: 'Groq Cloud', defaultModel: 'Llama 3.3 70B', placeholder: 'Paste Groq key (e.g. gsk_...)' },
  { id: 'nvidia', name: 'NVIDIA NIM', defaultModel: 'Llama 3.1 70B', placeholder: 'Paste NVIDIA NIM key (e.g. nvapi-...)' },
];

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAllSettings = useStore((s) => s.resetAllSettings);
  const apiKeys = useStore((s) => s.apiKeys);
  const setApiKey = useStore((s) => s.setApiKey);
  const selectedProvider = useStore((s) => s.selectedProvider);
  const setSelectedProvider = useStore((s) => s.setSelectedProvider);
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const resetProject = useStore((s) => s.resetProject);

  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [isValidating, setIsValidating] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeProvider = selectedProvider || settings.ai.provider;
  const currentKeyForActive = apiKeys[activeProvider]?.trim();
  const sessionPersistenceActive = settings.ai.sessionKeyPersistence !== false;

  const handleSelectProvider = (p: LLMProvider) => {
    setSelectedProvider(p);
    updateSettings('ai', { provider: p });
    setTestStatus(null);
    const pName = PROVIDERS.find((x) => x.id === p)?.name || p.toUpperCase();
    triggerToast(`[ACTIVE] ${pName}`);
  };

  const handleKeyChange = (provider: LLMProvider, raw: string) => {
    const clean = sanitizeApiKey(raw);
    setApiKey(provider, clean);
    if (clean) {
      triggerToast(`[SAVED] ${PROVIDERS.find((x) => x.id === provider)?.name} key saved`);
    }
  };

  const handleClearKey = (provider: LLMProvider) => {
    setApiKey(provider, '');
    triggerToast(`[CLEARED] ${PROVIDERS.find((x) => x.id === provider)?.name} key cleared`);
  };

  const handleTestConnection = async () => {
    const key = apiKeys[activeProvider]?.trim();
    if (!key) {
      setTestStatus(`[PROXY ACTIVE] No custom ${activeProvider.toUpperCase()} key entered. Using built-in server proxy.`);
      return;
    }

    setIsValidating(true);
    setTestStatus('[PROBING] Testing connection to remote API...');
    try {
      const startTime = performance.now();
      const res = await validateApiKeyOnline(key);
      const elapsed = Math.round(performance.now() - startTime);

      if (res.isValid) {
        setTestStatus(`[CONNECTED] ${res.statusMessage} (${elapsed}ms ping)`);
      } else {
        setTestStatus(`[VALIDATION FAILED] ${res.statusMessage}`);
      }
    } catch (err: any) {
      setTestStatus(`[CONNECTION ERROR] ${err.message || 'Unable to reach provider API'}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportJSON = () => {
    const currentStore = useStore.getState();
    const bundle = {
      archiveVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      activeProject: {
        name: currentStore.projectName,
        idea: currentStore.productIdea,
        requirements: currentStore.requirements,
        userStories: currentStore.userStories,
        umlNodes: currentStore.umlNodes,
        umlEdges: currentStore.umlEdges,
        architecture: currentStore.architecture,
        openapiYaml: currentStore.openapiYaml,
        docs: currentStore.docs,
      },
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seos_backup_${projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('[DOWNLOADED] Backup JSON archive');
  };

  return (
    <div className="flex flex-col h-full bg-seos-bg text-seos-text font-mono text-xs overflow-hidden">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 font-mono text-xs rounded border border-seos-accent bg-seos-surface text-seos-accent shadow-xl flex items-center gap-2 animate-fade-in">
          <span>::</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-seos-border bg-seos-surface flex items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-seos-accent">::</span>
            <h1 className="text-sm font-bold text-seos-text uppercase tracking-wider">
              [SETTINGS]
            </h1>
          </div>
          <p className="text-[11px] text-seos-text-3 mt-1">
            System preferences, inference providers, and workspace rules.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset settings to factory defaults? Your project data and entered API keys are preserved.')) {
              resetAllSettings();
              triggerToast('[RESET] Settings restored to factory defaults');
            }
          }}
          className="px-3 py-1.5 font-mono text-xs rounded border border-seos-border hover:bg-seos-surface-2 text-seos-text-2 hover:text-seos-text transition-colors cursor-pointer"
        >
          [RESET DEFAULTS]
        </button>
      </div>

      {/* Body: Left Tab Menu + Right Content Panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-48 border-r border-seos-border bg-seos-surface/40 p-2.5 space-y-1 shrink-0 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded font-mono text-xs transition-colors flex items-center justify-between cursor-pointer ${
                  isActive
                    ? 'bg-seos-accent text-white font-bold'
                    : 'text-seos-text-2 hover:bg-seos-surface-2 hover:text-seos-text'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-seos-text-3'}`}>
                  [{tab.code}]
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl space-y-5">
          {/* TAB 1: AI MODELS */}
          {activeTab === 'ai' && (
            <div className="space-y-5 animate-fade-in">
              {/* Active Engine Card */}
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <div className="flex items-center justify-between border-b border-seos-border/50 pb-2.5">
                  <div>
                    <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider">
                      [ACTIVE INFERENCE ENGINE]
                    </h2>
                    <p className="text-[11px] text-seos-text-3 mt-0.5">
                      Select which provider processes your engineering prompts.
                    </p>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    disabled={isValidating}
                    className="px-3 py-1 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isValidating && <span className="w-1.5 h-1.5 rounded-full bg-seos-accent animate-ping" />}
                    <span>[TEST CONNECTION]</span>
                  </button>
                </div>

                {testStatus && (
                  <div className="p-2.5 rounded text-[11px] bg-seos-surface-2 border border-seos-border text-seos-text">
                    {testStatus}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="w-full sm:w-2/3">
                    <label className="block text-[11px] text-seos-text-2 mb-1">Select Active Provider</label>
                    <select
                      value={activeProvider}
                      onChange={(e) => handleSelectProvider(e.target.value as LLMProvider)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer font-bold"
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.defaultModel}) {apiKeys[p.id]?.trim() ? '— [KEY SAVED]' : '— [PROXY]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:self-end pb-0.5">
                    <span className={`text-[10px] px-2.5 py-1 rounded border font-bold ${
                      currentKeyForActive
                        ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                        : 'bg-seos-surface-2 text-seos-text-3 border-seos-border'
                    }`}>
                      {currentKeyForActive ? '[KEY ACTIVE]' : '[PROXY FALLBACK]'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-seos-border/50">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={settings.pipeline.requireHumanReview}
                      onChange={(e) => {
                        updateSettings('pipeline', { requireHumanReview: e.target.checked });
                        triggerToast(`Human review ${e.target.checked ? 'required' : 'optional'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Require manual approval before advancing between pipeline stages</span>
                  </label>
                </div>
              </div>

              {/* Multi-Provider Key Manager */}
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <div className="border-b border-seos-border/50 pb-2.5">
                  <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider">
                    [CONFIGURED API KEYS]
                  </h2>
                  <p className="text-[11px] text-seos-text-3 mt-0.5">
                    Store keys for each provider independently. Switching active providers keeps all your keys safely in memory without re-entering them.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {PROVIDERS.map((prov) => {
                    const hasKey = Boolean(apiKeys[prov.id]?.trim());
                    const isActive = activeProvider === prov.id;
                    return (
                      <div
                        key={prov.id}
                        className={`p-3 rounded border transition-colors ${
                          isActive
                            ? 'bg-seos-surface-2/60 border-seos-accent/40'
                            : 'bg-seos-bg/40 border-seos-border/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-seos-text">{prov.name}</span>
                            <span className="text-[10px] text-seos-text-3">({prov.defaultModel})</span>
                            {isActive && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-seos-accent/15 text-seos-accent border border-seos-accent/30 font-bold">
                                [● CURRENT ACTIVE]
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              hasKey
                                ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                                : 'bg-seos-surface-2 text-seos-text-3 border-seos-border'
                            }`}>
                              {hasKey ? '[SAVED]' : '[EMPTY]'}
                            </span>
                            {hasKey && (
                              <button
                                onClick={() => handleClearKey(prov.id)}
                                className="px-2 py-0.5 text-[10px] rounded border border-seos-red/30 text-seos-red hover:bg-seos-red/10 cursor-pointer"
                              >
                                [CLEAR]
                              </button>
                            )}
                          </div>
                        </div>

                        <input
                          type="password"
                          value={apiKeys[prov.id] || ''}
                          onChange={(e) => handleKeyChange(prov.id, e.target.value)}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData('text');
                            handleKeyChange(prov.id, pasted);
                          }}
                          placeholder={prov.placeholder}
                          className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-seos-border/50">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={sessionPersistenceActive}
                      onChange={(e) => {
                        updateSettings('ai', { sessionKeyPersistence: e.target.checked });
                        triggerToast(`Session persistence ${e.target.checked ? 'enabled' : 'disabled'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Keep keys active across tab reloads (stored in temporary sessionStorage; cleared on browser close)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider border-b border-seos-border/50 pb-2.5">
                  [PROJECT DETAILS]
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-seos-text-2 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={settings.general.displayName}
                      onChange={(e) => updateSettings('general', { displayName: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-seos-text-2 mb-1">Project Name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text font-bold"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] text-seos-text-2 mb-1">Default Architecture Pattern</label>
                  <select
                    value={settings.project.defaultTemplate}
                    onChange={(e) => updateSettings('project', { defaultTemplate: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                  >
                    <option value="microservices">Event-Driven Microservices (FastAPI / Kafka)</option>
                    <option value="monolith">Modular Monolith (Clean Architecture)</option>
                    <option value="blank">Blank Slate (Dynamic Recommendation)</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-seos-border/50">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={settings.sync.autoSyncEnabled}
                      onChange={(e) => {
                        updateSettings('sync', { autoSyncEnabled: e.target.checked });
                        triggerToast(`Cloud sync ${e.target.checked ? 'enabled' : 'disabled'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Automatically sync project changes with cloud backend</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUPS */}
          {activeTab === 'backups' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider border-b border-seos-border/50 pb-2.5">
                  [EXPORT DOCUMENTATION]
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={exportProjectAsMarkdown}
                    className="px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer"
                  >
                    [EXPORT SRS .MD]
                  </button>
                  <button
                    onClick={exportProjectAsPDF}
                    className="px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer"
                  >
                    [EXPORT DOC .PDF]
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer"
                  >
                    [DOWNLOAD BACKUP .JSON]
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 rounded border border-seos-red/30 bg-seos-red/5 space-y-2.5">
                <h2 className="text-xs font-bold text-seos-red uppercase tracking-wider border-b border-seos-red/20 pb-2">
                  [RESET PROJECT]
                </h2>
                <p className="text-[11px] text-seos-text-3">
                  Clears current requirements, stories, diagrams, and architecture to start fresh. Saved API keys remain safe.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Clear all project layers and start fresh? Your API keys are preserved.')) {
                      resetProject();
                      triggerToast('[RESET] Project cleared; ready for new idea');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-mono font-bold rounded bg-seos-red text-white hover:bg-seos-red/90 transition-colors cursor-pointer"
                >
                  [CLEAR ALL LAYERS]
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
