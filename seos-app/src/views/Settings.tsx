import { useState } from 'react';
import { useStore } from '../store';
import { detectApiKeyProvider, sanitizeApiKey, validateApiKeyOnline } from '../lib/apiKeyDetector';
import { exportProjectAsMarkdown, exportProjectAsPDF } from '../lib/exportUtils';
import type { LLMProvider } from '../types';

type SettingsTab = 'ai' | 'workspace' | 'traceability' | 'classroom' | 'backups';

interface TabItem {
  id: SettingsTab;
  code: string;
  label: string;
}

const TABS: TabItem[] = [
  { id: 'ai', code: '01', label: 'AI Models' },
  { id: 'workspace', code: '02', label: 'Workspace' },
  { id: 'traceability', code: '03', label: 'Traceability' },
  { id: 'classroom', code: '04', label: 'Classroom' },
  { id: 'backups', code: '05', label: 'Backups' },
];

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAllSettings = useStore((s) => s.resetAllSettings);
  const apiKeys = useStore((s) => s.apiKeys);
  const setApiKey = useStore((s) => s.setApiKey);
  const autoSetApiKey = useStore((s) => s.autoSetApiKey);
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const resetProject = useStore((s) => s.resetProject);

  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeProvider = settings.ai.provider;
  const currentKeyForProvider = apiKeys[activeProvider]?.trim();
  const sessionPersistenceActive = settings.ai.sessionKeyPersistence !== false;

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

  const handleKeyChange = (raw: string) => {
    const sanitized = sanitizeApiKey(raw);
    setApiKeyInput(sanitized);

    if (!sanitized) {
      setDetectedBadge(null);
      return;
    }

    const detected = detectApiKeyProvider(sanitized);
    if (detected) {
      autoSetApiKey(sanitized);
      setDetectedBadge(`IDENTIFIED: ${detected.providerName} (${detected.defaultModel})`);
      triggerToast(`[CONNECTED] ${detected.providerName}`);
    } else if (sanitized.length > 8) {
      setDetectedBadge('UNRECOGNIZED KEY FORMAT');
    } else {
      setDetectedBadge(null);
    }
  };

  const handleDisconnectKeys = () => {
    setApiKey('gemini', '');
    setApiKey('groq', '');
    setApiKey('nvidia', '');
    setApiKey('openai', '');
    setApiKey('anthropic', '');
    setApiKeyInput('');
    setDetectedBadge(null);
    setTestStatus(null);
    triggerToast('[RESET] All custom keys removed; proxy active');
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
            System preferences, inference engines, and workspace rules.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all settings to default configurations? Project data and API keys will be preserved.')) {
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
              {/* API Key */}
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <div className="flex items-center justify-between border-b border-seos-border/50 pb-2.5">
                  <div>
                    <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider">
                      [API KEY]
                    </h2>
                    <p className="text-[11px] text-seos-text-3 mt-0.5">
                      Ingest key for Gemini, Groq, NVIDIA, OpenAI, or Claude.
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${
                    currentKeyForProvider
                      ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                      : 'bg-seos-surface-2 text-seos-text-3 border-seos-border'
                  }`}>
                    {currentKeyForProvider ? '[KEY ACTIVE]' : '[PROXY FALLBACK]'}
                  </span>
                </div>

                {detectedBadge && (
                  <div className="p-2 rounded text-[11px] bg-seos-accent/10 border border-seos-accent/30 text-seos-accent flex items-center justify-between font-bold">
                    <span>[{detectedBadge}]</span>
                    <button onClick={() => setDetectedBadge(null)} className="text-[10px] text-seos-text-3 hover:text-seos-text">
                      [DISMISS]
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        handleKeyChange(pasted);
                      }}
                      placeholder="Paste key (AIzaSy..., AQ..., gsk_..., sk-proj-...)"
                      className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                    {currentKeyForProvider && (
                      <button
                        onClick={handleDisconnectKeys}
                        className="px-3 py-1.5 text-xs font-mono rounded border border-seos-red/30 text-seos-red hover:bg-seos-red/10 transition-colors cursor-pointer shrink-0"
                      >
                        [DISCONNECT]
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-[11px] text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={sessionPersistenceActive}
                      onChange={(e) => {
                        updateSettings('ai', { sessionKeyPersistence: e.target.checked });
                        triggerToast(`Session persistence ${e.target.checked ? 'enabled' : 'disabled'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Keep key active across tab reloads (stored in temporary sessionStorage)</span>
                  </label>
                </div>
              </div>

              {/* Active Engine */}
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <div className="flex items-center justify-between border-b border-seos-border/50 pb-2.5">
                  <div>
                    <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider">
                      [ACTIVE ENGINE]
                    </h2>
                    <p className="text-[11px] text-seos-text-3 mt-0.5">
                      Select provider and verify remote endpoint connectivity.
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-seos-text-2 mb-1">Provider</label>
                    <select
                      value={activeProvider}
                      onChange={(e) => {
                        const p = e.target.value as LLMProvider;
                        updateSettings('ai', { provider: p });
                        triggerToast(`Switched to ${p.toUpperCase()}`);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                    >
                      <option value="gemini">Google Gemini (Gemini 2.5 Flash / 1.5 Flash)</option>
                      <option value="groq">Groq Cloud (Llama 3.3 70B)</option>
                      <option value="nvidia">NVIDIA NIM (Llama / Mistral)</option>
                      <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                      <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-seos-text-2 mb-1">Timeout (seconds)</label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={settings.ai.timeoutSeconds}
                      onChange={(e) => updateSettings('ai', { timeoutSeconds: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-seos-text-2 mb-1">
                      <span>Sampling Temperature</span>
                      <span className="font-bold text-seos-text">[{settings.ai.temperature}]</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={settings.ai.temperature}
                      onChange={(e) => updateSettings('ai', { temperature: parseFloat(e.target.value) })}
                      className="w-full cursor-pointer accent-seos-accent"
                    />
                    <div className="flex justify-between text-[10px] text-seos-text-3 mt-0.5">
                      <span>0.0 (Precise)</span>
                      <span>1.0 (Creative)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-seos-text-2 mb-1">
                      <span>Max Response Tokens</span>
                      <span className="font-bold text-seos-text">[{settings.ai.maxTokens}]</span>
                    </div>
                    <input
                      type="number"
                      min={512}
                      max={16384}
                      step={512}
                      value={settings.ai.maxTokens}
                      onChange={(e) => updateSettings('ai', { maxTokens: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
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

                <div className="pt-2">
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
              </div>
            </div>
          )}

          {/* TAB 3: TRACEABILITY */}
          {activeTab === 'traceability' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider border-b border-seos-border/50 pb-2.5">
                  [QUALITY STANDARDS]
                </h2>

                <div className="space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.traceability.enforceInvest}
                      onChange={(e) => updateSettings('traceability', { enforceInvest: e.target.checked })}
                      className="mt-0.5 rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-seos-text">Enforce INVEST story checklist</div>
                      <div className="text-[11px] text-seos-text-3 mt-0.5">
                        Validate that stories are Independent, Negotiable, Valuable, Estimable, Small, and Testable.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.traceability.enforceGherkin}
                      onChange={(e) => updateSettings('traceability', { enforceGherkin: e.target.checked })}
                      className="mt-0.5 rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-seos-text">Require Gherkin acceptance criteria</div>
                      <div className="text-[11px] text-seos-text-3 mt-0.5">
                        Format acceptance scenarios using standard Given / When / Then syntax.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.traceability.orphanArtifactDetection}
                      onChange={(e) => updateSettings('traceability', { orphanArtifactDetection: e.target.checked })}
                      className="mt-0.5 rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-seos-text">Detect drift and orphan artifacts</div>
                      <div className="text-[11px] text-seos-text-3 mt-0.5">
                        Highlight unlinked requirements or database entities missing matching API endpoints.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLASSROOM */}
          {activeTab === 'classroom' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded border border-seos-border bg-seos-surface space-y-3">
                <h2 className="text-xs font-bold text-seos-text uppercase tracking-wider border-b border-seos-border/50 pb-2.5">
                  [CLASSROOM SYNC]
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-seos-text-2 mb-1">Classroom Join Code</label>
                    <input
                      type="text"
                      value={settings.classroom.joinCode}
                      onChange={(e) => updateSettings('classroom', { joinCode: e.target.value })}
                      placeholder="e.g. SEOS-CS301-A"
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text uppercase font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-seos-text-2 mb-1">Sync Conflict Resolution</label>
                    <select
                      value={settings.sync.conflictResolution}
                      onChange={(e) => updateSettings('sync', { conflictResolution: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                    >
                      <option value="server_wins">Server Wins (Authoritative)</option>
                      <option value="client_wins">Client Wins (Local priority)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-seos-border/50 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={settings.sync.autoSyncEnabled}
                      onChange={(e) => updateSettings('sync', { autoSyncEnabled: e.target.checked })}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Automatically sync changes to cloud backend</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={settings.privacy.telemetryEnabled}
                      onChange={(e) => updateSettings('privacy', { telemetryEnabled: e.target.checked })}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Share anonymous usage metrics to improve prompt quality</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BACKUPS */}
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
