import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, DEFAULT_SETTINGS } from '../store';

describe('SEOS Settings Center & Governance Architecture', () => {
  beforeEach(() => {
    useStore.getState().resetAllSettings();
  });

  it('initializes with all 13 categories in production-grade default configuration', () => {
    const { settings } = useStore.getState();

    // 01. General
    expect(settings.general.displayName).toBe('Software Engineer');
    expect(settings.general.theme).toBe('dark');
    expect(settings.general.defaultLandingPage).toBe('overview');

    // 02. Account
    expect(settings.account.twoFactorEnabled).toBe(false);
    expect(settings.account.emailVerified).toBe(true);

    // 03. AI
    expect(settings.ai.provider).toBe('gemini');
    expect(settings.ai.temperature).toBe(0.2);
    expect(settings.ai.maxTokens).toBe(4096);
    expect(settings.ai.timeoutSeconds).toBe(45);

    // 04. Pipeline
    expect(settings.pipeline.enabledStages).toHaveLength(6);
    expect(settings.pipeline.requireHumanReview).toBe(true);

    // 05. Project
    expect(settings.project.defaultTemplate).toBe('microservices');
    expect(settings.project.defaultLanguage).toBe('TypeScript');

    // 06. Traceability
    expect(settings.traceability.enforceInvest).toBe(true);
    expect(settings.traceability.enforceGherkin).toBe(true);
    expect(settings.traceability.orphanArtifactDetection).toBe(true);

    // 07. Editor
    expect(settings.editor.defaultEditorMode).toBe('split');
    expect(settings.editor.autoSaveDebounceMs).toBe(800);
    expect(settings.editor.openapiValidation).toBe(true);

    // 08. Sync
    expect(settings.sync.autoSyncEnabled).toBe(true);
    expect(settings.sync.conflictResolution).toBe('server_wins');

    // 09. RAG
    expect(settings.rag.chunkSize).toBe(600);
    expect(settings.rag.chunkOverlap).toBe(100);
    expect(settings.rag.topK).toBe(3);

    // 10. Notifications
    expect(settings.notifications.pipelineCompletion).toBe(true);
    expect(settings.notifications.syncErrorWarning).toBe(true);

    // 11. Classroom
    expect(settings.classroom.joinCode).toBe('SEOS-CS301-A');
    expect(settings.classroom.allowStudentMultiProjects).toBe(true);

    // 12. Privacy
    expect(settings.privacy.telemetryEnabled).toBe(false);
    expect(settings.privacy.auditRetentionDays).toBe(90);

    // 13. Admin
    expect(settings.admin.maintenanceMode).toBe(false);
    expect(settings.admin.sharedAIQuotaEnabled).toBe(true);
  });

  it('updates category settings reactively and immutably', () => {
    const { updateSettings } = useStore.getState();

    updateSettings('ai', { temperature: 0.7, timeoutSeconds: 60 });
    expect(useStore.getState().settings.ai.temperature).toBe(0.7);
    expect(useStore.getState().settings.ai.timeoutSeconds).toBe(60);

    updateSettings('editor', { autoSaveDebounceMs: 1200, snapToGrid: false });
    expect(useStore.getState().settings.editor.autoSaveDebounceMs).toBe(1200);
    expect(useStore.getState().settings.editor.snapToGrid).toBe(false);

    updateSettings('traceability', { requirementPrefix: 'SRS-' });
    expect(useStore.getState().settings.traceability.requirementPrefix).toBe('SRS-');
  });

  it('keeps theme synchronized between settings and global theme state', () => {
    const { updateSettings, setTheme, toggleTheme } = useStore.getState();

    // Changing via updateSettings synchronizes root theme
    updateSettings('general', { theme: 'light' });
    expect(useStore.getState().theme).toBe('light');
    expect(useStore.getState().settings.general.theme).toBe('light');

    // Changing via setTheme synchronizes settings.general.theme
    setTheme('dark');
    expect(useStore.getState().theme).toBe('dark');
    expect(useStore.getState().settings.general.theme).toBe('dark');

    // Toggling theme synchronizes both
    toggleTheme();
    expect(useStore.getState().theme).toBe('light');
    expect(useStore.getState().settings.general.theme).toBe('light');
  });

  it('keeps AI provider synchronized between settings and selectedProvider', () => {
    const { updateSettings, setSelectedProvider } = useStore.getState();

    updateSettings('ai', { provider: 'openai' });
    expect(useStore.getState().selectedProvider).toBe('openai');
    expect(useStore.getState().settings.ai.provider).toBe('openai');

    setSelectedProvider('anthropic');
    expect(useStore.getState().selectedProvider).toBe('anthropic');
    expect(useStore.getState().settings.ai.provider).toBe('anthropic');
  });

  it('resets a single category to default without affecting other categories', () => {
    const { updateSettings, resetSettingsCategory } = useStore.getState();

    updateSettings('ai', { temperature: 0.95 });
    updateSettings('rag', { chunkSize: 1200 });

    expect(useStore.getState().settings.ai.temperature).toBe(0.95);
    expect(useStore.getState().settings.rag.chunkSize).toBe(1200);

    resetSettingsCategory('ai');
    expect(useStore.getState().settings.ai.temperature).toBe(DEFAULT_SETTINGS.ai.temperature);
    // RAG should remain modified
    expect(useStore.getState().settings.rag.chunkSize).toBe(1200);
  });

  it('resets all 13 categories to factory defaults on resetAllSettings', () => {
    const { updateSettings, resetAllSettings } = useStore.getState();

    updateSettings('general', { displayName: 'Custom Lead Architect' });
    updateSettings('project', { defaultTemplate: 'event-driven' });
    updateSettings('pipeline', { requireHumanReview: false });

    resetAllSettings();

    expect(useStore.getState().settings.general.displayName).toBe(DEFAULT_SETTINGS.general.displayName);
    expect(useStore.getState().settings.project.defaultTemplate).toBe(DEFAULT_SETTINGS.project.defaultTemplate);
    expect(useStore.getState().settings.pipeline.requireHumanReview).toBe(DEFAULT_SETTINGS.pipeline.requireHumanReview);
  });

  it('maintains Gate 1 memory-only isolation for API keys (no keys in settings state)', () => {
    const { setApiKey } = useStore.getState();

    setApiKey('openai', 'sk-proj-test1234567890');
    expect(useStore.getState().apiKeys.openai).toBe('sk-proj-test1234567890');

    // Verify settings object has NO api keys stored inside it
    const settings = useStore.getState().settings as any;
    expect(settings.ai.openai_key).toBeUndefined();
    expect(settings.ai.key).toBeUndefined();
    expect(JSON.stringify(settings)).not.toContain('sk-proj-test1234567890');
  });
});
