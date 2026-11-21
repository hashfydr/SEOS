import { useState } from 'react';
import { useStore } from '../store';
import { detectApiKeyProvider, sanitizeApiKey, validateApiKeyOnline } from '../lib/apiKeyDetector';
import { exportProjectAsMarkdown, exportProjectAsPDF } from '../lib/exportUtils';
import type { LLMProvider } from '../types';

type SettingsTab = 'ai' | 'workspace' | 'quality' | 'collaboration' | 'backup';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: string;
  description: string;
}

const TABS: TabItem[] = [
  { id: 'ai', label: 'AI & API Keys', icon: '⚡', description: 'Configure AI model providers, API keys, and generation behavior' },
  { id: 'workspace', label: 'Workspace & Theme', icon: '🎨', description: 'Appearance, project details, and default architecture' },
  { id: 'quality', label: 'Quality & Traceability', icon: '🛡️', description: 'Standards for user stories, Gherkin syntax, and drift detection' },
  { id: 'collaboration', label: 'Classroom & Sync', icon: '👥', description: 'Classroom join codes and cloud synchronization' },
  { id: 'backup', label: 'Backup & Reset', icon: '💾', description: 'Export documentation, download backups, or reset project' },
];

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetAllSettings = useStore((s) => s.resetAllSettings);
  const apiKeys = useStore((s) => s.apiKeys);
  const setApiKey = useStore((s) => s.setApiKey);
  const autoSetApiKey = useStore((s) => s.autoSetApiKey);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
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

  // Live online API connectivity probe
  const handleTestConnection = async () => {
    const key = apiKeys[activeProvider]?.trim();
    if (!key) {
      setTestStatus(`[ℹ️ Proxy Active] No custom ${activeProvider.toUpperCase()} key entered. Using built-in server proxy.`);
      return;
    }

    setIsValidating(true);
    setTestStatus('Testing connection to remote API...');
    try {
      const startTime = performance.now();
      const res = await validateApiKeyOnline(key);
      const elapsed = Math.round(performance.now() - startTime);

      if (res.isValid) {
        setTestStatus(`[✓ Connected] ${res.statusMessage} (${elapsed}ms latency)`);
      } else {
        setTestStatus(`[❌ Validation Failed] ${res.statusMessage}`);
      }
    } catch (err: any) {
      setTestStatus(`[❌ Connection Error] ${err.message || 'Unable to reach provider API'}`);
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
      setDetectedBadge(`Identified: ${detected.providerName} (${detected.defaultModel})`);
      triggerToast(`Connected ${detected.providerName}`);
    } else if (sanitized.length > 8) {
      setDetectedBadge('Unrecognized key format');
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
    triggerToast('All custom API keys removed; switched to built-in proxy');
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
    triggerToast('Backup JSON downloaded');
  };

  return (
    <div className="flex flex-col h-full bg-seos-bg text-seos-text font-sans overflow-hidden">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2 text-xs font-mono rounded-lg bg-seos-accent text-white shadow-xl flex items-center gap-2 animate-fade-in">
          <span>●</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-seos-border bg-seos-surface flex items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-seos-text tracking-tight flex items-center gap-2">
            Settings
          </h1>
          <p className="text-xs text-seos-text-3 mt-0.5">
            Configure AI models, workspace appearance, engineering quality rules, and backups.
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all settings to default configurations? Your project data and API keys will be preserved.')) {
              resetAllSettings();
              triggerToast('Settings reset to defaults');
            }
          }}
          className="px-3 py-1.5 text-xs font-mono rounded border border-seos-border hover:bg-seos-surface-2 text-seos-text-2 hover:text-seos-text transition-colors cursor-pointer"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Body: Left Tab Menu + Right Content Panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-56 border-r border-seos-border bg-seos-surface/40 p-3 space-y-1 shrink-0 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-seos-accent text-white shadow-sm'
                    : 'text-seos-text-2 hover:bg-seos-surface-2 hover:text-seos-text'
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-3xl space-y-6">
          {/* TAB 1: AI & API KEYS */}
          {activeTab === 'ai' && (
            <div className="space-y-6 animate-fade-in">
              {/* API Key Input */}
              <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
                <div className="flex items-center justify-between border-b border-seos-border/50 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-seos-text flex items-center gap-2">
                      API Key
                    </h2>
                    <p className="text-xs text-seos-text-3 mt-0.5">
                      Enter your API key. Supports Google Gemini, Groq, NVIDIA NIM, OpenAI, and Anthropic Claude.
                    </p>
                  </div>
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    currentKeyForProvider
                      ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                      : 'bg-seos-surface-2 text-seos-text-3 border-seos-border'
                  }`}>
                    {currentKeyForProvider ? 'Key Active' : 'Free Proxy Fallback'}
                  </span>
                </div>

                {detectedBadge && (
                  <div className="p-2.5 rounded text-xs font-mono bg-seos-accent/10 border border-seos-accent/30 text-seos-accent flex items-center justify-between">
                    <span>{detectedBadge}</span>
                    <button onClick={() => setDetectedBadge(null)} className="text-[10px] text-seos-text-3 hover:text-seos-text">✕</button>
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
                      placeholder="Paste your API key here (e.g. AIzaSy..., gsk_..., sk-proj-...)"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                    {currentKeyForProvider && (
                      <button
                        onClick={handleDisconnectKeys}
                        className="px-3 py-2 text-xs font-mono rounded border border-seos-red/30 text-seos-red hover:bg-seos-red/10 transition-colors cursor-pointer shrink-0"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={sessionPersistenceActive}
                      onChange={(e) => {
                        updateSettings('ai', { sessionKeyPersistence: e.target.checked });
                        triggerToast(`Session Persistence ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Keep API key active across browser tab reloads (stored in temporary sessionStorage)</span>
                  </label>
                </div>
              </div>

              {/* Provider Selection & Connection Testing */}
              <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
                <div className="flex items-center justify-between border-b border-seos-border/50 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-seos-text">Active AI Engine</h2>
                    <p className="text-xs text-seos-text-3 mt-0.5">
                      Select which provider processes your engineering prompts.
                    </p>
                  </div>
                  <button
                    onClick={handleTestConnection}
                    disabled={isValidating}
                    className="px-3 py-1.5 text-xs font-mono font-medium rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isValidating && <span className="w-2 h-2 rounded-full bg-seos-accent animate-ping" />}
                    <span>Test Connection</span>
                  </button>
                </div>

                {testStatus && (
                  <div className="p-3 rounded text-xs font-mono bg-seos-surface-2 border border-seos-border text-seos-text">
                    {testStatus}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Provider</label>
                    <select
                      value={activeProvider}
                      onChange={(e) => {
                        const p = e.target.value as LLMProvider;
                        updateSettings('ai', { provider: p });
                        triggerToast(`Switched to ${p.toUpperCase()}`);
                      }}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                    >
                      <option value="gemini">Google Gemini (Gemini 2.5 Flash / 1.5 Flash)</option>
                      <option value="groq">Groq Cloud (Llama 3.3 70B - Fast)</option>
                      <option value="nvidia">NVIDIA NIM (Llama / Mistral)</option>
                      <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                      <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Timeout (seconds)</label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={settings.ai.timeoutSeconds}
                      onChange={(e) => updateSettings('ai', { timeoutSeconds: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs text-seos-text-2 mb-1.5">
                      <span className="font-medium">Creativity (Temperature)</span>
                      <span className="font-mono font-bold text-seos-text">{settings.ai.temperature}</span>
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
                    <div className="flex justify-between text-[10px] text-seos-text-3 font-mono mt-1">
                      <span>Precise (0.0)</span>
                      <span>Creative (1.0)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-seos-text-2 mb-1.5">
                      <span className="font-medium">Max Response Length</span>
                      <span className="font-mono font-bold text-seos-text">{settings.ai.maxTokens} tokens</span>
                    </div>
                    <input
                      type="number"
                      min={512}
                      max={16384}
                      step={512}
                      value={settings.ai.maxTokens}
                      onChange={(e) => updateSettings('ai', { maxTokens: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-seos-border/50">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={settings.pipeline.requireHumanReview}
                      onChange={(e) => {
                        updateSettings('pipeline', { requireHumanReview: e.target.checked });
                        triggerToast(`Human Review ${e.target.checked ? 'Required' : 'Optional'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Require human review and approval before advancing between pipeline stages</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORKSPACE & THEME */}
          {activeTab === 'workspace' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
                <h2 className="text-sm font-semibold text-seos-text border-b border-seos-border/50 pb-3">
                  Appearance &amp; Project Info
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Theme</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTheme('dark');
                          triggerToast('Dark mode enabled');
                        }}
                        className={`flex-1 py-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-seos-accent text-white border-seos-accent font-bold'
                            : 'bg-seos-surface-2 text-seos-text border-seos-border hover:bg-seos-surface-3'
                        }`}
                      >
                        🌙 Dark
                      </button>
                      <button
                        onClick={() => {
                          setTheme('light');
                          triggerToast('Light mode enabled');
                        }}
                        className={`flex-1 py-2 text-xs font-medium rounded border transition-colors cursor-pointer ${
                          theme === 'light'
                            ? 'bg-seos-accent text-white border-seos-accent font-bold'
                            : 'bg-seos-surface-2 text-seos-text border-seos-border hover:bg-seos-surface-3'
                        }`}
                      >
                        ☀️ Light
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Your Display Name</label>
                    <input
                      type="text"
                      value={settings.general.displayName}
                      onChange={(e) => updateSettings('general', { displayName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Project Name</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Default Architecture Pattern</label>
                    <select
                      value={settings.project.defaultTemplate}
                      onChange={(e) => updateSettings('project', { defaultTemplate: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                    >
                      <option value="microservices">Event-Driven Microservices (FastAPI / Kafka)</option>
                      <option value="monolith">Modular Monolith (Clean Architecture)</option>
                      <option value="blank">Blank Slate (Dynamic Recommendation)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUALITY & TRACEABILITY */}
          {activeTab === 'quality' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
                <h2 className="text-sm font-semibold text-seos-text border-b border-seos-border/50 pb-3">
                  Engineering Quality &amp; Consistency Rules
                </h2>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.traceability.enforceInvest}
                      onChange={(e) => updateSettings('traceability', { enforceInvest: e.target.checked })}
                      className="mt-0.5 rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-medium text-seos-text">Enforce INVEST Quality Checklist</div>
                      <div className="text-[11px] text-seos-text-3 mt-0.5">
                        Ensures all generated user stories are Independent, Negotiable, Valuable, Estimable, Small, and Testable.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.traceability.enforceGherkin}
                      onChange={(e) => updateSettings('traceability', { enforceGherkin: e.target.checked })}
                      className="mt-0.5 rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-medium text-seos-text">Require Gherkin Acceptance Criteria</div>
                      <div className="text-[11px] text-seos-text-3 mt-0.5">
                        Formats acceptance scenarios using standard Given / When / Then syntax for automated testing.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.traceability.orphanArtifactDetection}
                      onChange={(e) => updateSettings('traceability', { orphanArtifactDetection: e.target.checked })}
                      className="mt-0.5 rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-medium text-seos-text">Detect Drift and Orphan Artifacts</div>
                      <div className="text-[11px] text-seos-text-3 mt-0.5">
                        Highlights requirements without stories, or database entities without matching API endpoints.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CLASSROOM & COLLABORATION */}
          {activeTab === 'collaboration' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
                <h2 className="text-sm font-semibold text-seos-text border-b border-seos-border/50 pb-3">
                  Classroom &amp; Cloud Synchronization
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Classroom Join Code</label>
                    <input
                      type="text"
                      value={settings.classroom.joinCode}
                      onChange={(e) => updateSettings('classroom', { joinCode: e.target.value })}
                      placeholder="e.g. SEOS-CS301-A"
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text uppercase font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-seos-text-2 mb-1.5 font-medium">Sync Conflict Resolution</label>
                    <select
                      value={settings.sync.conflictResolution}
                      onChange={(e) => updateSettings('sync', { conflictResolution: e.target.value as any })}
                      className="w-full px-3 py-2 text-xs rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                    >
                      <option value="server_wins">Server Wins (Collaborative authoritative)</option>
                      <option value="client_wins">Client Wins (Local priority)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-seos-border/50 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-seos-text-2">
                    <input
                      type="checkbox"
                      checked={settings.sync.autoSyncEnabled}
                      onChange={(e) => updateSettings('sync', { autoSyncEnabled: e.target.checked })}
                      className="rounded border-seos-border text-seos-accent focus:ring-0 cursor-pointer"
                    />
                    <span>Automatically sync changes to cloud backend</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-seos-text-2">
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

          {/* TAB 5: BACKUP & RESET */}
          {activeTab === 'backup' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
                <h2 className="text-sm font-semibold text-seos-text border-b border-seos-border/50 pb-3">
                  Export Project Documentation
                </h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={exportProjectAsMarkdown}
                    className="px-4 py-2 text-xs font-medium rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>📄</span> Export IEEE 830 SRS (.md)
                  </button>
                  <button
                    onClick={exportProjectAsPDF}
                    className="px-4 py-2 text-xs font-medium rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>📑</span> Export Document (.pdf)
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-4 py-2 text-xs font-medium rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>📦</span> Download JSON Backup
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-5 rounded-xl bg-seos-red/5 border border-seos-red/30 space-y-3">
                <h2 className="text-sm font-semibold text-seos-red border-b border-seos-red/20 pb-2 flex items-center gap-2">
                  <span>⚠️</span> Reset Project
                </h2>
                <p className="text-xs text-seos-text-3">
                  Clears all current requirements, user stories, diagrams, and architecture to start a fresh project. Your saved API keys are kept safe.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to start a new project? All current layers and chat history will be cleared. Your API keys are kept.')) {
                      resetProject();
                      triggerToast('Project reset; ready for new idea');
                    }
                  }}
                  className="px-4 py-2 text-xs font-medium rounded bg-seos-red text-white hover:bg-seos-red/90 transition-colors cursor-pointer"
                >
                  Clear All Layers &amp; Start Fresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
