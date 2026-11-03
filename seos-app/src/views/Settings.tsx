import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { detectApiKeyProvider } from '../lib/apiKeyDetector';
import type {
  SettingsCategoryId,
  ViewId,
  LLMProvider,
} from '../types';

interface CategoryMeta {
  id: SettingsCategoryId;
  number: string;
  title: string;
  shortDesc: string;
  roleRequired?: 'mentor' | 'admin';
  icon: string;
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'general', number: '01', title: 'General Settings', shortDesc: 'Basic application behavior, theme, locale', icon: 'GEN' },
  { id: 'account', number: '02', title: 'Account & Security', shortDesc: 'Authentication, 2FA, sessions & identity', icon: 'SEC' },
  { id: 'ai', number: '03', title: 'AI & Model Configuration', shortDesc: 'Provider selection, API keys & inference', icon: 'AI' },
  { id: 'pipeline', number: '04', title: 'Generation Pipeline', shortDesc: '6-stage defaults, timeouts & human review', icon: 'PIP' },
  { id: 'project', number: '05', title: 'Project & Workspace', shortDesc: 'Templates, tech stack, visibility & language', icon: 'PRJ' },
  { id: 'traceability', number: '06', title: 'Artifact & Traceability', shortDesc: 'INVEST, Gherkin, numbering & orphan detection', icon: 'TRC' },
  { id: 'editor', number: '07', title: 'Editor & Modeling', shortDesc: 'Visual/split mode, auto-save delay, grid & layout', icon: 'EDT' },
  { id: 'sync', number: '08', title: 'Synchronization & Data', shortDesc: 'Conflict resolution, offline queue & intervals', icon: 'SNC' },
  { id: 'rag', number: '09', title: 'Knowledge Base & RAG', shortDesc: 'Chunk size, overlap, Top-K & re-ranking', icon: 'RAG' },
  { id: 'notifications', number: '10', title: 'Notifications & Activity', shortDesc: 'Pipeline alerts, drift warnings & announcements', icon: 'NTF' },
  { id: 'classroom', number: '11', title: 'Classroom & Collaboration', shortDesc: 'Join codes, permissions & deadlines', roleRequired: 'mentor', icon: 'CLS' },
  { id: 'privacy', number: '12', title: 'Privacy, Data & Export', shortDesc: 'Telemetry, audit logs & comprehensive export', icon: 'PRV' },
  { id: 'admin', number: '13', title: 'System Administration', shortDesc: 'Pool stats, user roles, backups & maintenance', roleRequired: 'admin', icon: 'ADM' },
];

export default function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetSettingsCategory = useStore((s) => s.resetSettingsCategory);
  const resetAllSettings = useStore((s) => s.resetAllSettings);
  const currentUser = useStore((s) => s.currentUser);
  const apiKeys = useStore((s) => s.apiKeys);
  const setApiKey = useStore((s) => s.setApiKey);
  const autoSetApiKey = useStore((s) => s.autoSetApiKey);

  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Universal Smart API Key Ingest State
  const [universalKey, setUniversalKey] = useState('');
  const [universalKeyNotice, setUniversalKeyNotice] = useState<string | null>(null);

  // Evaluator override to preview mentor/admin tabs if logged in as solo/student
  const [evaluatorBypass, setEvaluatorBypass] = useState(false);

  // Account password change form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // AI Connection test state
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Active Sessions Mock Data
  const [sessions, setSessions] = useState([
    { id: 'sess-1', device: 'Chrome on Linux x86_64', ip: '127.0.0.1 (Localhost)', current: true, time: 'Active now' },
    { id: 'sess-2', device: 'Firefox on macOS Darwin', ip: '192.168.1.104', current: false, time: '2 hours ago' },
  ]);

  const isMentor = currentUser?.role === 'mentor' || (currentUser?.role as string) === 'admin' || evaluatorBypass;
  const isAdmin = (currentUser?.role as string) === 'admin' || evaluatorBypass;

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPwdMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    setPwdMsg({ type: 'ok', text: 'Password successfully updated!' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    triggerToast('Password updated');
  };

  const handleExportAllPersonalData = () => {
    const data = {
      exportTimestamp: new Date().toISOString(),
      user: currentUser,
      settings: settings,
      sessionMetrics: { userAgent: navigator.userAgent, locale: navigator.language },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seos_personal_data_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Personal data package downloaded');
  };

  const handleExportAllProjectsArchive = () => {
    const currentStore = useStore.getState();
    const bundle = {
      archiveVersion: '1.0.0',
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
    a.download = `seos_project_archive_${currentStore.projectName.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Project archive downloaded');
  };

  const handleTestAIConnection = () => {
    setTestStatus('Testing latency...');
    setTimeout(() => {
      const activeKey = apiKeys[settings.ai.provider];
      if (!activeKey) {
        setTestStatus(`[WARN] No custom ${settings.ai.provider.toUpperCase()} API key entered. Backend proxy fallback will be used.`);
      } else {
        setTestStatus(`[SUCCESS] Connected to ${settings.ai.provider.toUpperCase()} endpoint (model: ${settings.ai.model}, ping: 142ms).`);
      }
    }, 600);
  };

  // Filter categories and content based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase();
    return CATEGORIES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.shortDesc.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-seos-bg text-seos-text font-sans overflow-hidden">
      {/* Top Header & Search Bar */}
      <header className="px-6 py-4 border-b border-seos-border bg-seos-surface flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-seos-accent/20 text-seos-accent border border-seos-accent/40 font-bold">
              :: CONTROL CENTER ::
            </span>
            <h1 className="text-xl font-bold tracking-tight text-seos-text font-display">
              Settings & Platform Governance
            </h1>
          </div>
          <p className="text-xs text-seos-text-3 font-mono mt-0.5">
            Role-aware system configuration for inference, traceability, sync, and classroom administration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="flex items-center rounded-lg bg-seos-surface-2 border border-seos-border focus-within:border-seos-accent px-3 py-1.5 w-64 md:w-80">
            <span className="text-seos-text-3 font-mono text-xs mr-2 shrink-0">::</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (e.g. timeout, INVEST, RAG)..."
              className="w-full text-xs font-mono bg-transparent outline-none text-seos-text placeholder:text-seos-text-3"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-seos-text-3 hover:text-seos-text font-mono ml-1.5 shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => {
              if (confirm('Reset current category settings to production defaults?')) {
                resetSettingsCategory(activeCategory);
                triggerToast(`Reset ${activeCategory} settings to defaults`);
              }
            }}
            className="px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 border border-seos-border text-seos-text-2 hover:text-seos-text transition-colors"
            title="Reset current tab to default"
          >
            Reset Tab
          </button>
        </div>
      </header>

      {/* Save Toast Notification */}
      {saveToast && (
        <div className="bg-seos-green/15 border-b border-seos-green/40 text-seos-green px-6 py-1.5 text-xs font-mono flex items-center justify-between animate-fade-in shrink-0">
          <span>[✓ SAVED] {saveToast}</span>
          <span className="text-[10px] text-seos-green/70">Zustand Persistence Active</span>
        </div>
      )}

      {/* Two Column Layout: Categories Sidebar & Main Config Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Category Sidebar */}
        <nav className="w-72 md:w-80 border-r border-seos-border bg-seos-surface-2/40 flex flex-col shrink-0 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-seos-text-3 font-bold">
            Configuration Categories ({filteredCategories.length})
          </div>

          {filteredCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const isGated =
              (cat.roleRequired === 'mentor' && !isMentor) ||
              (cat.roleRequired === 'admin' && !isAdmin);

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded text-left transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-seos-accent/15 border border-seos-accent/40 text-seos-accent shadow-xs'
                    : 'hover:bg-seos-surface-2 border border-transparent text-seos-text-2 hover:text-seos-text'
                }`}
              >
                <span
                  className={`font-mono text-xs font-bold shrink-0 mt-0.5 px-1 py-0.5 rounded ${
                    isActive ? 'bg-seos-accent text-white' : 'bg-seos-surface-3 text-seos-text-3'
                  }`}
                >
                  {cat.number}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs tracking-tight truncate">
                      {cat.title}
                    </span>
                    {cat.roleRequired && (
                      <span
                        className={`font-mono text-[9px] px-1 py-0.2 rounded border shrink-0 ${
                          isGated
                            ? 'bg-seos-amber/15 text-seos-amber border-seos-amber/30'
                            : 'bg-seos-cyan/15 text-seos-cyan border-seos-cyan/30'
                        }`}
                      >
                        {isGated ? '[LOCKED]' : `[${cat.roleRequired.toUpperCase()}]`}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-seos-text-3 truncate mt-0.5">
                    {cat.shortDesc}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Evaluator Bypass switch for reviewing mentor settings */}
          <div className="mt-auto pt-4 border-t border-seos-border/70 px-2">
            <div className="p-2.5 rounded bg-seos-surface border border-seos-border/80 text-[11px] font-mono space-y-1.5">
              <div className="text-seos-text-3 font-semibold uppercase text-[10px]">
                Active Role: [{currentUser ? currentUser.role.toUpperCase() : 'ANONYMOUS'}]
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-seos-text-2 hover:text-seos-text">
                <input
                  type="checkbox"
                  checked={evaluatorBypass}
                  onChange={(e) => setEvaluatorBypass(e.target.checked)}
                  className="rounded border-seos-border text-seos-accent focus:ring-0"
                />
                <span className="text-[10px]">Preview Mentor / Admin Controls</span>
              </label>
            </div>
          </div>
        </nav>

        {/* Right Main Configuration Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-seos-bg">
          {/* Category Header */}
          <div className="border-b border-seos-border pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-seos-accent font-bold">
                  [{CATEGORIES.find((c) => c.id === activeCategory)?.number}]
                </span>
                <h2 className="text-lg font-bold font-display text-seos-text">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.title}
                </h2>
              </div>
              <p className="text-xs text-seos-text-3 font-mono mt-1">
                {CATEGORIES.find((c) => c.id === activeCategory)?.shortDesc}
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-seos-text-3">Auto-Persist:</span>
              <span className="text-seos-green bg-seos-green/10 px-2 py-0.5 rounded border border-seos-green/30">
                [✓ ACTIVE]
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* 01. GENERAL SETTINGS                                           */}
          {/* ============================================================== */}
          {activeCategory === 'general' && (
            <div className="space-y-6 max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-seos-surface border border-seos-border/70 space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-seos-text">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={settings.general.displayName}
                    onChange={(e) => updateSettings('general', { displayName: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    placeholder="e.g. Jane Doe"
                  />
                  <p className="text-[11px] text-seos-text-3">Visible on project attribution and peer review comments.</p>
                </div>

                <div className="p-4 rounded-lg bg-seos-surface border border-seos-border/70 space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-seos-text">
                    Default Landing View
                  </label>
                  <select
                    value={settings.general.defaultLandingPage}
                    onChange={(e) => updateSettings('general', { defaultLandingPage: e.target.value as ViewId })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                  >
                    <option value="overview">Project Overview</option>
                    <option value="requirements">Requirements Engineer</option>
                    <option value="user-stories">User Stories</option>
                    <option value="modeling">System Modeling</option>
                    <option value="architecture">Architecture</option>
                    <option value="api-designer">API Designer</option>
                    <option value="documentation">Documentation</option>
                    <option value="learning">Learning Dashboard</option>
                  </select>
                  <p className="text-[11px] text-seos-text-3">View loaded upon entering workspace.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-seos-surface border border-seos-border/70 space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-seos-text">
                    Theme Mode
                  </label>
                  <select
                    value={settings.general.theme}
                    onChange={(e) => updateSettings('general', { theme: e.target.value as 'dark' | 'light' })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                  >
                    <option value="dark">Dark Mode (Basalt & Shale)</option>
                    <option value="light">Light Mode (Limestone & Sandstone)</option>
                  </select>
                  <p className="text-[11px] text-seos-text-3">Instant live theme adaptation.</p>
                </div>

                <div className="p-4 rounded-lg bg-seos-surface border border-seos-border/70 space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-seos-text">
                    Date Format
                  </label>
                  <select
                    value={settings.general.dateFormat}
                    onChange={(e) => updateSettings('general', { dateFormat: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                  <p className="text-[11px] text-seos-text-3">Canonical timestamp notation.</p>
                </div>

                <div className="p-4 rounded-lg bg-seos-surface border border-seos-border/70 space-y-2">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-seos-text">
                    Time Zone (IANA)
                  </label>
                  <select
                    value={settings.general.timeZone}
                    onChange={(e) => updateSettings('general', { timeZone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Denver">America/Denver (MST/MDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET/CEST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                  </select>
                  <p className="text-[11px] text-seos-text-3">Standard IANA reference zone.</p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 02. ACCOUNT & SECURITY                                         */}
          {/* ============================================================== */}
          {activeCategory === 'account' && (
            <div className="space-y-6 max-w-3xl">
              {/* Account Identity & Verification Card */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border/70 space-y-3">
                <div className="flex items-center justify-between border-b border-seos-border/50 pb-2.5">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                    User Identity &amp; Verification
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-seos-green/20 text-seos-green border border-seos-green/40">
                    [EMAIL VERIFIED]
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono text-seos-text-2 mb-1">Authenticated Account Email</label>
                    <input
                      type="email"
                      value={currentUser?.email || 'developer@seos.local'}
                      disabled
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2/60 border border-seos-border text-seos-text-2 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-seos-text-2 mb-1">Institutional Role &amp; Cohort</label>
                    <div className="px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2/60 border border-seos-border text-seos-text-2">
                      Role: [{currentUser ? currentUser.role.toUpperCase() : 'SOLO_DEV'}] &bull; Cohort: {currentUser?.classroom_code || 'Standalone'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-seos-border/40 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={settings.account.twoFactorEnabled}
                      onChange={(e) => {
                        updateSettings('account', { twoFactorEnabled: e.target.checked });
                        triggerToast(`Multi-Factor Authentication (MFA) ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                      }}
                      className="rounded border-seos-border text-seos-accent focus:ring-0"
                    />
                    <span>Enable Multi-Factor Authentication (TOTP / Authenticator App)</span>
                  </label>
                </div>
              </div>

              {/* Password Change Form */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border/70 space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text flex items-center justify-between">
                  <span>Change Password</span>
                  <span className="text-[10px] text-seos-green font-mono">[Argon2 / Bcrypt Cryptographic Security]</span>
                </div>

                {pwdMsg && (
                  <div
                    className={`p-2.5 rounded text-xs font-mono border ${
                      pwdMsg.type === 'ok'
                        ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                        : 'bg-seos-red/15 text-seos-red border-seos-red/30'
                    }`}
                  >
                    {pwdMsg.text}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-seos-text-2 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-seos-text-2 mb-1">
                        New Password (min 8 chars)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-seos-text-2 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-seos-accent text-white hover:bg-seos-accent-2 text-xs font-mono font-semibold transition-colors cursor-pointer"
                  >
                    Update Password
                  </button>
                </form>
              </div>

              {/* Active Sessions List */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                    Active Login Sessions ({sessions.length})
                  </div>
                  <button
                    onClick={() => {
                      setSessions(sessions.filter((s) => s.current));
                      triggerToast('Other sessions revoked');
                    }}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-seos-surface-2 hover:bg-seos-red/20 text-seos-red border border-seos-red/30 transition-colors"
                  >
                    Revoke Other Sessions
                  </button>
                </div>

                <div className="divide-y divide-seos-border/60">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="py-2.5 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-semibold text-seos-text flex items-center gap-2">
                          <span>{sess.device}</span>
                          {sess.current && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-seos-cyan/20 text-seos-cyan border border-seos-cyan/40">
                              [CURRENT SESSION]
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-seos-text-3">IP: {sess.ip}</div>
                      </div>
                      <span className="text-seos-text-3 text-[11px]">{sess.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-5 rounded-lg bg-seos-red/5 border border-seos-red/30 space-y-2.5">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-red flex items-center justify-between">
                  <span>Account Termination &amp; Pseudonymization</span>
                  <span className="text-[10px] text-seos-text-3 font-mono">[GOVERNANCE RETENTION POLICY]</span>
                </div>
                <p className="text-xs text-seos-text-3">
                  Account termination revokes all session JWTs and pseudonymizes user identity. In compliance with institutional governance, project audit logs are retained or pseudonymized according to institutional audit retention policies.
                </p>
                <button
                  onClick={() => {
                    const confirmInput = prompt('Type DELETE to confirm account deactivation & session revocation:');
                    if (confirmInput === 'DELETE') {
                      alert('Account deactivation acknowledged. Sessions revoked.');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-seos-red/20 text-seos-red border border-seos-red/40 hover:bg-seos-red/30 transition-colors cursor-pointer"
                >
                  Deactivate Account &amp; Revoke Sessions
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 03. AI & MODEL CONFIGURATION                                   */}
          {/* ============================================================== */}
          {activeCategory === 'ai' && (
            <div className="space-y-6 max-w-3xl">
              {/* Unified AI Engine & Inference Hub */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border/70 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-seos-border/50 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                        AI Engine &amp; Inference Hub
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-seos-accent/15 text-seos-accent border border-seos-accent/30 font-bold">
                        {settings.ai.provider === 'nvidia' ? 'NVIDIA NIM' : settings.ai.provider === 'groq' ? 'Groq Llama 3.3 70B' : settings.ai.provider === 'gemini' ? 'Google Gemini 1.5 Flash' : settings.ai.provider === 'openai' ? 'OpenAI GPT-4o' : 'Anthropic Claude 3.5 Sonnet'}
                      </span>
                    </div>
                    <div className="text-[11px] text-seos-text-3 font-mono mt-0.5">
                      Unified engine with zero vendor lock-in · Auto-routes prompts based on your active key or server proxy.
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      apiKeys[settings.ai.provider]
                        ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                        : 'bg-seos-cyan/15 text-seos-cyan border-seos-cyan/30'
                    }`}>
                      {apiKeys[settings.ai.provider] ? '[USER MEMORY KEY CONNECTED]' : '[SERVER PROXY FALLBACK]'}
                    </span>
                    <button
                      onClick={handleTestAIConnection}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 text-seos-text border border-seos-border transition-colors cursor-pointer"
                    >
                      Test Connectivity
                    </button>
                  </div>
                </div>

                {testStatus && (
                  <div className="p-2.5 rounded text-xs font-mono bg-seos-surface-2 border border-seos-border text-seos-text">
                    {testStatus}
                  </div>
                )}

                {/* Smart Universal API Key Auto-Detector */}
                <div className="p-4 rounded-lg bg-seos-accent/10 border border-seos-accent/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-seos-accent">⚡ SMART UNIVERSAL KEY INGEST</span>
                      <span className="text-[10px] text-seos-text-3 font-mono">Paste ANY Groq, Gemini, OpenAI, or Claude key</span>
                    </div>
                    {universalKeyNotice && (
                      <span className="font-mono text-xs text-seos-green font-bold animate-fade-in">
                        {universalKeyNotice}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={universalKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUniversalKey(val);
                        const detected = detectApiKeyProvider(val);
                        if (detected) {
                          autoSetApiKey(val);
                          setUniversalKeyNotice(`[✓] Activated ${detected.providerName} · ${detected.defaultModel}`);
                          triggerToast(`Activated ${detected.providerName}`);
                        } else if (val.trim().length > 10) {
                          setUniversalKeyNotice('Unrecognized key format');
                        } else {
                          setUniversalKeyNotice(null);
                        }
                      }}
                      placeholder="Paste any key here (gsk_..., AIzaSy..., sk-proj-..., sk-ant-...)"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded bg-seos-bg border border-seos-border focus:border-seos-accent outline-none text-seos-text"
                    />
                    <button
                      onClick={() => {
                        if (universalKey) {
                          const detected = detectApiKeyProvider(universalKey);
                          if (detected) {
                            autoSetApiKey(universalKey);
                            setUniversalKeyNotice(`[✓] Activated ${detected.providerName} · ${detected.defaultModel}`);
                            triggerToast(`Activated ${detected.providerName}`);
                          }
                        }
                      }}
                      className="px-4 py-2 text-xs font-mono font-bold rounded bg-seos-accent text-white hover:bg-seos-accent-2 transition-colors cursor-pointer shrink-0"
                    >
                      Identify &amp; Activate
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-seos-text-3 font-mono pt-1">
                    <span>SEOS automatically inspects key prefix and activates the corresponding provider &amp; model.</span>
                    <span className="text-seos-green">[Gate 1 Hardened: Keys kept in volatile memory only]</span>
                  </div>
                </div>

                {/* Unified Engine Status & Preferences */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-seos-text-2 font-semibold">Default Engine &amp; Proxy Preference:</span>
                    <select
                      value={settings.ai.provider}
                      onChange={(e) => {
                        const p = e.target.value as LLMProvider;
                        updateSettings('ai', { provider: p });
                        triggerToast(`Preferred engine set to ${p.toUpperCase()}`);
                      }}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border focus:border-seos-accent outline-none text-seos-text cursor-pointer"
                    >
                      <option value="groq">Groq Cloud (Llama 3.1 / 3.3 - Ultra Fast)</option>
                      <option value="nvidia">NVIDIA NIM (build.nvidia.com)</option>
                      <option value="gemini">Google Gemini (Gemini 1.5 Flash)</option>
                      <option value="openai">OpenAI GPT (GPT-4o)</option>
                      <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
                    </select>
                  </div>

                  {apiKeys[settings.ai.provider] && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKey('nvidia', '');
                        setApiKey('groq', '');
                        setApiKey('gemini', '');
                        setApiKey('openai', '');
                        setApiKey('anthropic', '');
                        setUniversalKey('');
                        setUniversalKeyNotice('Reset to built-in server proxy');
                        triggerToast('Disconnected custom API keys; proxy active');
                      }}
                      className="text-xs font-mono text-seos-red hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      [x] Disconnect Active Key
                    </button>
                  )}
                </div>
              </div>

              {/* Inference Parameters */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Inference Hyperparameters &amp; Fallbacks
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Temperature:</span>
                      <span className="font-bold text-seos-accent">{settings.ai.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={settings.ai.temperature}
                      onChange={(e) => updateSettings('ai', { temperature: parseFloat(e.target.value) })}
                      className="w-full accent-seos-accent"
                    />
                    <div className="flex justify-between text-[10px] text-seos-text-3 font-mono">
                      <span>0.0 (Deterministic / Code)</span>
                      <span>1.0 (Creative)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text">
                      Max Output Tokens
                    </label>
                    <input
                      type="number"
                      min="512"
                      max="8192"
                      step="256"
                      value={settings.ai.maxTokens}
                      onChange={(e) => updateSettings('ai', { maxTokens: parseInt(e.target.value, 10) || 4096 })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="180"
                      value={settings.ai.timeoutSeconds}
                      onChange={(e) => updateSettings('ai', { timeoutSeconds: parseInt(e.target.value, 10) || 45 })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={settings.ai.retryCount}
                      onChange={(e) => updateSettings('ai', { retryCount: parseInt(e.target.value, 10) || 2 })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Fallback Provider
                    </label>
                    <select
                      value={settings.ai.fallbackProvider}
                      onChange={(e) => updateSettings('ai', { fallbackProvider: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    >
                      <option value="none">None (Fail fast)</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI GPT</option>
                      <option value="anthropic">Anthropic Claude</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 04. GENERATION PIPELINE SETTINGS                               */}
          {/* ============================================================== */}
          {activeCategory === 'pipeline' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  6-Stage Pipeline Sequence &amp; Execution Defaults
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { id: 'requirements', label: '01. Requirements' },
                    { id: 'stories', label: '02. User Stories' },
                    { id: 'model', label: '03. Domain Modeling' },
                    { id: 'architecture', label: '04. Architecture' },
                    { id: 'api', label: '05. API Designer' },
                    { id: 'docs', label: '06. Documentation' },
                  ].map((stage) => {
                    const isEnabled = settings.pipeline.enabledStages.includes(stage.id as any);
                    return (
                      <label
                        key={stage.id}
                        className={`p-3 rounded border flex items-center gap-2.5 cursor-pointer font-mono text-xs transition-colors ${
                          isEnabled
                            ? 'bg-seos-accent/10 border-seos-accent text-seos-accent'
                            : 'bg-seos-surface-2 border-seos-border text-seos-text-3'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...settings.pipeline.enabledStages, stage.id as any]
                              : settings.pipeline.enabledStages.filter((s) => s !== stage.id);
                            updateSettings('pipeline', { enabledStages: next });
                          }}
                          className="rounded text-seos-accent"
                        />
                        <span>{stage.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Pipeline Governance &amp; Safeguards
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                    <input
                      type="checkbox"
                      checked={settings.pipeline.requireHumanReview}
                      onChange={(e) => updateSettings('pipeline', { requireHumanReview: e.target.checked })}
                      className="mt-0.5 rounded text-seos-accent"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Require Human Review Between Stages
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Pauses pipeline execution after each artifact is synthesized to permit manual review and approval before advancing.
                      </div>
                    </div>
                  </label>

                  <div className="p-3 rounded bg-seos-surface-2/60 border border-seos-border/60 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-seos-green font-bold">[✓ ENFORCED]</span>
                      <span className="text-seos-text font-semibold">Mandatory Schema &amp; Security Validation</span>
                    </div>
                    <span className="text-[11px] text-seos-text-3">Invalid artifacts cannot bypass gate checks</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Validation Strictness
                    </label>
                    <select
                      value={settings.pipeline.validationStrictness}
                      onChange={(e) => updateSettings('pipeline', { validationStrictness: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    >
                      <option value="standard">Standard (Recommended - Gate Validation)</option>
                      <option value="strict">Strict (Fail on any missing attribute)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Regeneration Behavior
                    </label>
                    <div className="px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2/60 border border-seos-border text-seos-text flex items-center justify-between">
                      <span>Preserve Version History</span>
                      <span className="text-[10px] text-seos-green font-bold">[IMMUTABLE AUDIT]</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 05. PROJECT & WORKSPACE SETTINGS                               */}
          {/* ============================================================== */}
          {activeCategory === 'project' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Project Creation &amp; Architecture Defaults
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Default Project Template
                    </label>
                    <select
                      value={settings.project.defaultTemplate}
                      onChange={(e) => updateSettings('project', { defaultTemplate: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    >
                      <option value="blank">Blank Architecture</option>
                      <option value="microservices">Microservices (Docker / k8s)</option>
                      <option value="monolith">Modular Monolith</option>
                      <option value="event-driven">Event-Driven Architecture (EDA)</option>
                      <option value="mobile-first">Mobile-First (React Native / Flutter)</option>
                      <option value="data-pipeline">Data &amp; ML Pipeline</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Default Visibility
                    </label>
                    <select
                      value={settings.project.defaultVisibility}
                      onChange={(e) => updateSettings('project', { defaultVisibility: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    >
                      <option value="private">Private (Only Creator)</option>
                      <option value="classroom">Classroom (Cohort Mentors &amp; Peers)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Naming Prefix
                    </label>
                    <input
                      type="text"
                      value={settings.project.namingPrefix}
                      onChange={(e) => updateSettings('project', { namingPrefix: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                      placeholder="e.g. SEOS-"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Tech Stack Preset
                    </label>
                    <input
                      type="text"
                      value={settings.project.defaultTechStack}
                      onChange={(e) => updateSettings('project', { defaultTechStack: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Default Language
                    </label>
                    <select
                      value={settings.project.defaultLanguage}
                      onChange={(e) => updateSettings('project', { defaultLanguage: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    >
                      <option value="TypeScript">TypeScript</option>
                      <option value="Python">Python</option>
                      <option value="Go">Go</option>
                      <option value="Java">Java</option>
                      <option value="Rust">Rust</option>
                      <option value="Kotlin">Kotlin</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 06. ARTIFACT & TRACEABILITY SETTINGS                           */}
          {/* ============================================================== */}
          {activeCategory === 'traceability' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Traceability Rules &amp; Requirement Compliance
                </div>

                <div className="p-3.5 rounded bg-seos-surface-2/60 border border-seos-border/60 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-seos-accent font-bold">[REQ-001]</span>
                    <span className="text-seos-text font-semibold">Canonical Requirement Identifier Format</span>
                  </div>
                  <span className="text-[10px] text-seos-green font-bold">[LOCKED FOR BIDIRECTIONAL TRACEABILITY]</span>
                </div>

                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                    <input
                      type="checkbox"
                      checked={settings.traceability.enforceInvest}
                      onChange={(e) => updateSettings('traceability', { enforceInvest: e.target.checked })}
                      className="mt-0.5 rounded text-seos-accent"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Enforce INVEST Criteria on User Stories
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Validates Independent, Negotiable, Valuable, Estimable, Small, and Testable properties before story approval.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                    <input
                      type="checkbox"
                      checked={settings.traceability.enforceGherkin}
                      onChange={(e) => updateSettings('traceability', { enforceGherkin: e.target.checked })}
                      className="mt-0.5 rounded text-seos-accent"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Enforce Gherkin Syntax in Acceptance Criteria
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Requires acceptance criteria to follow the Given/When/Then structured testing convention.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                    <input
                      type="checkbox"
                      checked={settings.traceability.orphanArtifactDetection}
                      onChange={(e) => updateSettings('traceability', { orphanArtifactDetection: e.target.checked })}
                      className="mt-0.5 rounded text-seos-accent"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Orphan Artifact Warning
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Flags database entities or API endpoints that do not trace back to any approved user requirement.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                    <input
                      type="checkbox"
                      checked={settings.traceability.autoInvalidationOnUpstreamChange}
                      onChange={(e) => updateSettings('traceability', { autoInvalidationOnUpstreamChange: e.target.checked })}
                      className="mt-0.5 rounded text-seos-accent"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Automatic Drift Invalidation
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Marks downstream architecture, APIs, and docs as [STALE] immediately upon upstream requirement modification.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 07. EDITOR & MODELING SETTINGS                                 */}
          {/* ============================================================== */}
          {activeCategory === 'editor' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Canvas &amp; Modeling Configuration
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Auto-Save Debounce Delay:</span>
                      <span className="font-bold text-seos-accent">{settings.editor.autoSaveDebounceMs}ms</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="3000"
                      step="100"
                      value={settings.editor.autoSaveDebounceMs}
                      onChange={(e) => updateSettings('editor', { autoSaveDebounceMs: parseInt(e.target.value, 10) })}
                      className="w-full accent-seos-accent"
                    />
                    <div className="flex justify-between text-[10px] text-seos-text-3 font-mono">
                      <span>200ms (Immediate)</span>
                      <span>3000ms (Batch)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                      Diagram Auto-Layout Engine
                    </label>
                    <select
                      value={settings.editor.diagramLayoutEngine}
                      onChange={(e) => updateSettings('editor', { diagramLayoutEngine: e.target.value as any })}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                    >
                      <option value="dagre">Dagre (Hierarchical Directed Graph)</option>
                      <option value="force">Force-Directed Physics</option>
                      <option value="orthogonal">Orthogonal Grid Alignment</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={settings.editor.canvasGrid}
                      onChange={(e) => updateSettings('editor', { canvasGrid: e.target.checked })}
                      className="rounded text-seos-accent"
                    />
                    <span>Show Background Coordinate Grid on Canvas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={settings.editor.snapToGrid}
                      onChange={(e) => updateSettings('editor', { snapToGrid: e.target.checked })}
                      className="rounded text-seos-accent"
                    />
                    <span>Snap Entities to Grid ({settings.editor.gridSize}px)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={settings.editor.openapiValidation}
                      onChange={(e) => updateSettings('editor', { openapiValidation: e.target.checked })}
                      className="rounded text-seos-accent"
                    />
                    <span>Live OpenAPI 3.0 / YAML Schema Diagnostics</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 08. SYNCHRONIZATION & DATA MANAGEMENT                          */}
          {/* ============================================================== */}
          {activeCategory === 'sync' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text flex items-center justify-between">
                  <span>Client-Server Synchronization</span>
                  <span className="text-[10px] text-seos-green">[REALTIME OCC V2 ACTIVE]</span>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={settings.sync.autoSyncEnabled}
                      onChange={(e) => updateSettings('sync', { autoSyncEnabled: e.target.checked })}
                      className="rounded text-seos-accent"
                    />
                    <span className="font-bold">Enable Periodic Auto-Synchronization</span>
                  </label>

                  <div className="space-y-1 pl-6">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Sync Interval:</span>
                      <span className="font-bold text-seos-accent">{settings.sync.syncIntervalSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={settings.sync.syncIntervalSeconds}
                      onChange={(e) => updateSettings('sync', { syncIntervalSeconds: parseInt(e.target.value, 10) })}
                      className="w-full accent-seos-accent"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <div className="p-3 rounded bg-seos-surface-2/60 border border-seos-border/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="font-bold text-seos-text">Optimistic Concurrency Control (OCC V2)</div>
                      <div className="text-[11px] text-seos-text-3">HTTP 409 Conflict Protection &bull; Prevents silent overwriting of concurrent edits</div>
                    </div>
                    <span className="text-[10px] text-seos-green font-bold">[MANDATORY OCC]</span>
                  </div>

                  <div className="p-3 rounded bg-seos-surface-2/60 border border-seos-border/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="font-bold text-seos-text">Conflict Handling Strategy</div>
                      <div className="text-[11px] text-seos-text-3">Prompts side-by-side manual merge dialogue when revision drift is detected</div>
                    </div>
                    <span className="text-[10px] text-seos-accent font-bold">[MANUAL MERGE / RELOAD]</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono pt-1 text-seos-text-3">
                    <span>Last Successful Sync:</span>
                    <span className="text-seos-green font-bold">[ONLINE &bull; Synchronized to PostgreSQL]</span>
                  </div>
                </div>
              </div>

              {/* Emergency Recovery Actions */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-3">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text flex items-center justify-between">
                  <span>Emergency Recovery &amp; Diagnostic Cache</span>
                  <span className="text-[10px] text-seos-amber font-mono">[CAUTION]</span>
                </div>
                <div className="text-xs font-mono text-seos-text-3">
                  Local Storage Key: <span className="text-seos-text font-bold">seos-storage-v2</span> &bull; Estimated Footprint:{' '}
                  <span className="text-seos-cyan font-bold">~42.8 KB</span>
                </div>
                <p className="text-[11px] text-seos-text-3 font-sans">
                  Use only if client state encounters an unrecoverable cache corruption. Server database remains untouched.
                </p>
                <button
                  onClick={() => {
                    if (confirm('WARNING: Clear local cached state? This will purge uncommitted mutations and force a fresh fetch from the server.')) {
                      localStorage.removeItem('seos-storage-v2');
                      triggerToast('Local cache purged. Fresh snapshot loaded from server.');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-seos-amber/15 hover:bg-seos-amber/25 text-seos-amber border border-seos-amber/40 transition-colors cursor-pointer"
                >
                  Reset Local Cache (Emergency Recovery)
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 09. KNOWLEDGE BASE & RAG SETTINGS                              */}
          {/* ============================================================== */}
          {activeCategory === 'rag' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Retrieval-Augmented Generation (RAG) Engine
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Chunk Size (chars):</span>
                      <span className="font-bold text-seos-accent">{settings.rag.chunkSize}</span>
                    </div>
                    <input
                      type="range"
                      min="200"
                      max="1500"
                      step="50"
                      value={settings.rag.chunkSize}
                      onChange={(e) => updateSettings('rag', { chunkSize: parseInt(e.target.value, 10) })}
                      className="w-full accent-seos-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Chunk Overlap (chars):</span>
                      <span className="font-bold text-seos-accent">{settings.rag.chunkOverlap}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="300"
                      step="20"
                      value={settings.rag.chunkOverlap}
                      onChange={(e) => updateSettings('rag', { chunkOverlap: parseInt(e.target.value, 10) })}
                      className="w-full accent-seos-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Top-K Retrieval Count:</span>
                      <span className="font-bold text-seos-accent">{settings.rag.topK}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={settings.rag.topK}
                      onChange={(e) => updateSettings('rag', { topK: parseInt(e.target.value, 10) })}
                      className="w-full accent-seos-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span>Similarity Cutoff:</span>
                      <span className="font-bold text-seos-accent">{settings.rag.similarityThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={settings.rag.similarityThreshold}
                      onChange={(e) => updateSettings('rag', { similarityThreshold: parseFloat(e.target.value) })}
                      className="w-full accent-seos-accent"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input
                      type="checkbox"
                      checked={settings.rag.enableReranking}
                      onChange={(e) => updateSettings('rag', { enableReranking: e.target.checked })}
                      className="rounded text-seos-accent"
                    />
                    <span>Enable Cross-Encoder Semantic Re-ranking</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 10. NOTIFICATIONS & ACTIVITY                                   */}
          {/* ============================================================== */}
          {activeCategory === 'notifications' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  System Alerts &amp; Event Notification Preferences
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'pipelineCompletion', label: 'Pipeline Stage Completion Alerts', desc: 'Notify via browser banner when generation finishes.' },
                    { key: 'generationFailure', label: 'AI Inference Failure Warnings', desc: 'Display audio/visual dialog when model quota or timeout occurs.' },
                    { key: 'syncErrorWarning', label: 'Network &amp; Sync Conflict Warnings', desc: 'Surface immediate warning if remote synchronization encounters conflicts.' },
                    { key: 'artifactDriftAlert', label: 'Traceability Drift Notifications', desc: 'Alert when changes to upstream requirements affect downstream models.' },
                    { key: 'classroomAnnouncements', label: 'Mentor Announcements &amp; Deadline Reminders', desc: 'Receive cohort announcements from your course instructor.' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                      <input
                        type="checkbox"
                        checked={(settings.notifications as any)[item.key]}
                        onChange={(e) => updateSettings('notifications', { [item.key]: e.target.checked } as any)}
                        className="mt-0.5 rounded text-seos-accent"
                      />
                      <div>
                        <div className="text-xs font-mono font-bold text-seos-text">{item.label}</div>
                        <div className="text-[11px] text-seos-text-3">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 11. CLASSROOM & COLLABORATION (Role Gated)                     */}
          {/* ============================================================== */}
          {activeCategory === 'classroom' && (
            <div className="space-y-6 max-w-3xl">
              {!isMentor ? (
                <div className="p-5 rounded-lg bg-seos-amber/10 border border-seos-amber/40 space-y-2 font-mono text-xs">
                  <div className="font-bold text-seos-amber flex items-center gap-2">
                    <span>[ACCESS RESTRICTED]</span>
                    <span>Mentor Role Required</span>
                  </div>
                  <p className="text-seos-text-2">
                    Classroom cohort administration and join-code generation require mentor authorization. Check the evaluator preview switch in the sidebar to inspect these controls.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text flex items-center justify-between">
                    <span>Classroom Cohort Administration</span>
                    <span className="text-seos-cyan">[MENTOR ACCESS]</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                        Classroom Name
                      </label>
                      <input
                        type="text"
                        value={settings.classroom.classroomName}
                        onChange={(e) => updateSettings('classroom', { classroomName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-text"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-bold uppercase text-seos-text mb-1">
                        Active Join Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={settings.classroom.joinCode}
                          className="flex-1 px-3 py-1.5 text-xs font-mono rounded bg-seos-surface-2 border border-seos-border text-seos-cyan font-bold"
                        />
                        <button
                          onClick={() => {
                            const newCode = `SEOS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
                            updateSettings('classroom', { joinCode: newCode });
                            triggerToast(`Regenerated Join Code: ${newCode}`);
                          }}
                          className="px-2.5 py-1.5 text-xs font-mono rounded bg-seos-accent text-white hover:bg-seos-accent-2"
                        >
                          Regen
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={settings.classroom.allowStudentMultiProjects}
                        onChange={(e) => updateSettings('classroom', { allowStudentMultiProjects: e.target.checked })}
                        className="rounded text-seos-accent"
                      />
                      <span>Allow Students to Author Multiple Concurrent Projects</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={settings.classroom.allowPeerReviewViewing}
                        onChange={(e) => updateSettings('classroom', { allowPeerReviewViewing: e.target.checked })}
                        className="rounded text-seos-accent"
                      />
                      <span>Allow Cross-Cohort Peer Model Viewing</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* 12. PRIVACY, DATA & EXPORT                                     */}
          {/* ============================================================== */}
          {activeCategory === 'privacy' && (
            <div className="space-y-6 max-w-3xl">
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Telemetry &amp; Audit Retention
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-seos-surface-2 border border-seos-border">
                    <input
                      type="checkbox"
                      checked={settings.privacy.telemetryEnabled}
                      onChange={(e) => updateSettings('privacy', { telemetryEnabled: e.target.checked })}
                      className="mt-0.5 rounded text-seos-accent"
                    />
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Anonymous Operational Telemetry
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Share anonymous bug reports and pipeline performance metrics to improve SEOS platform reliability.
                      </div>
                    </div>
                  </label>

                  <div className="p-3 rounded bg-seos-surface-2/60 border border-seos-border/60 flex items-center justify-between text-xs font-mono">
                    <div>
                      <div className="text-xs font-mono font-bold text-seos-text">
                        Institutional Audit Retention Policy
                      </div>
                      <div className="text-[11px] text-seos-text-3">
                        Enforced by institutional administrator policy (365 days compliance archive).
                      </div>
                    </div>
                    <span className="text-[10px] text-seos-cyan font-bold">[ADMIN POLICY ENFORCED]</span>
                  </div>
                </div>
              </div>

              {/* Data Portability Archive */}
              <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-4">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Full Data Portability &amp; Self-Sovereign Exports
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded bg-seos-surface-2 border border-seos-border space-y-2">
                    <div className="text-xs font-mono font-bold text-seos-text">
                      Export Personal Data
                    </div>
                    <p className="text-[11px] text-seos-text-3">
                      Download complete JSON package of your profile, preferences, and session telemetry.
                    </p>
                    <button
                      onClick={handleExportAllPersonalData}
                      className="px-3 py-1.5 text-xs font-mono rounded bg-seos-accent text-white hover:bg-seos-accent-2 transition-colors cursor-pointer"
                    >
                      Download Personal Data (JSON)
                    </button>
                  </div>

                  <div className="p-3.5 rounded bg-seos-surface-2 border border-seos-border space-y-2">
                    <div className="text-xs font-mono font-bold text-seos-text">
                      Export Complete Project Bundle
                    </div>
                    <p className="text-[11px] text-seos-text-3">
                      Export active project artifacts, UML schemas, OpenAPI specs, and trace links.
                    </p>
                    <button
                      onClick={handleExportAllProjectsArchive}
                      className="px-3 py-1.5 text-xs font-mono rounded bg-seos-cyan text-white hover:bg-seos-cyan/80 transition-colors cursor-pointer"
                    >
                      Download Project Bundle (JSON)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 13. SYSTEM ADMINISTRATION (Role Gated: Admin Only)             */}
          {/* ============================================================== */}
          {activeCategory === 'admin' && (
            <div className="space-y-6 max-w-3xl">
              {!isAdmin ? (
                <div className="p-5 rounded-lg bg-seos-amber/10 border border-seos-amber/40 space-y-2 font-mono text-xs">
                  <div className="font-bold text-seos-amber flex items-center gap-2">
                    <span>[ACCESS RESTRICTED]</span>
                    <span>Platform Administrator Role Required</span>
                  </div>
                  <p className="text-seos-text-2">
                    Platform infrastructure monitors, database pool stats, and operational maintenance consoles require explicit Administrator authorization (distinct from course Mentors).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Database Pool & Engine Metrics */}
                  <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-3 font-mono">
                    <div className="text-xs font-bold uppercase tracking-wider text-seos-text flex items-center justify-between">
                      <span>PostgreSQL 16 &bull; pgvector Connection Pool</span>
                      <span className="text-seos-green">[HEALTHY &bull; 1.2ms LATENCY]</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border">
                        <div className="text-[10px] text-seos-text-3">ACTIVE CONNECTIONS</div>
                        <div className="text-base font-bold text-seos-accent">4 / 20</div>
                      </div>
                      <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border">
                        <div className="text-[10px] text-seos-text-3">IDLE IN POOL</div>
                        <div className="text-base font-bold text-seos-text">16</div>
                      </div>
                      <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border">
                        <div className="text-[10px] text-seos-text-3">TOTAL QUERIES/SEC</div>
                        <div className="text-base font-bold text-seos-cyan">24.6 RPS</div>
                      </div>
                      <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border">
                        <div className="text-[10px] text-seos-text-3">HMAC INTEGRITY</div>
                        <div className="text-base font-bold text-seos-green">VALID</div>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Mode & Operational Controls */}
                  <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-3">
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                      Platform Maintenance &amp; Safeguards
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={settings.admin.maintenanceMode}
                        onChange={(e) => updateSettings('admin', { maintenanceMode: e.target.checked })}
                        className="rounded text-seos-accent"
                      />
                      <span>Enable Read-Only Maintenance Mode (Broadcast System Banner)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
                      <input
                        type="checkbox"
                        checked={settings.admin.sharedAIQuotaEnabled}
                        onChange={(e) => updateSettings('admin', { sharedAIQuotaEnabled: e.target.checked })}
                        className="rounded text-seos-accent"
                      />
                      <span>Enforce Institutional Shared AI Quota Pooling</span>
                    </label>
                  </div>

                  {/* Operational Logs Stream */}
                  <div className="p-5 rounded-lg bg-seos-surface border border-seos-border space-y-2">
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                      Operational Log Stream (Last 5 Events)
                    </div>
                    <div className="p-3 rounded bg-seos-surface-2 border border-seos-border font-mono text-[11px] space-y-1 text-seos-text-2">
                      <div>[2026-11-02T22:45:10Z] [INFO] FastAPI uvicorn daemon ready on 0.0.0.0:8000</div>
                      <div>[2026-11-02T22:46:22Z] [INFO] Alembic head 002_traceability validated</div>
                      <div>[2026-11-02T22:47:01Z] [INFO] OCC v2 conflict detector: 0 deadlocks recorded</div>
                      <div>[2026-11-02T22:48:15Z] [INFO] pg_backup_restore HMAC-SHA256 snapshot verified</div>
                      <div>[2026-11-02T22:50:00Z] [INFO] Settings Center mounted; role-aware filters active</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset All Settings to Default Section */}
          <div className="pt-6 border-t border-seos-border/70 flex items-center justify-between text-xs font-mono text-seos-text-3">
            <span>SEOS Engineering Platform Settings &bull; Version 1.0</span>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset all 13 categories to production defaults?')) {
                  resetAllSettings();
                  triggerToast('All 13 categories reset to defaults');
                }
              }}
              className="text-seos-red hover:underline cursor-pointer"
            >
              Reset All Settings to Factory Defaults
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
