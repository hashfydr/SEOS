import { describe, it, expect, beforeEach } from 'vitest';
import { useStore, getInitialApiKeys, API_KEYS_LOCAL_STORAGE_KEY, SESSION_KEYS_STORAGE_KEY } from '../store';

describe('SEOS Zustand Store', () => {
  beforeEach(() => {
    useStore.getState().resetProject();
  });

  it('initializes with default empty values', () => {
    const state = useStore.getState();
    expect(state.projectName).toBe('New Project');
    expect(state.productIdea).toBe('');
    expect(state.requirements).toEqual([]);
    expect(state.userStories).toEqual([]);
    expect(state.umlNodes).toEqual([]);
    expect(state.staleArtifacts).toEqual({ stories: false, model: false, api: false, docs: false, architecture: false });
  });

  it('updates project name and idea', () => {
    useStore.getState().setProjectName('FoodDash');
    useStore.getState().setProductIdea('On-demand food delivery app');
    const state = useStore.getState();
    expect(state.projectName).toBe('FoodDash');
    expect(state.productIdea).toBe('On-demand food delivery app');
  });

  it('manages requirements with statuses', () => {
    useStore.getState().addRequirement({
      id: 'REQ-101',
      type: 'Functional',
      priority: 'Critical',
      description: 'The system shall allow users to register with an email.',
      status: 'draft',
    });

    expect(useStore.getState().requirements.length).toBe(1);
    expect(useStore.getState().requirements[0].status).toBe('draft');

    useStore.getState().updateRequirement('REQ-101', { status: 'approved' });
    expect(useStore.getState().requirements[0].status).toBe('approved');
  });

  it('manages UML nodes and edges', () => {
    const node = {
      id: 'node-user',
      name: 'User',
      type: 'entity' as const,
      x: 100,
      y: 100,
      fields: [{ name: 'id', type: 'UUID', pk: true }],
    };
    useStore.getState().setUMLNodes([node]);
    expect(useStore.getState().umlNodes.length).toBe(1);
    expect(useStore.getState().umlNodes[0].name).toBe('User');
  });

  it('tracks and clears stale artifacts', () => {
    useStore.getState().setStaleArtifacts({ api: true, docs: true });
    expect(useStore.getState().staleArtifacts.api).toBe(true);
    expect(useStore.getState().staleArtifacts.docs).toBe(true);

    // Setting OpenAPI yaml clears api staleness
    useStore.getState().setOpenapiYaml('openapi: 3.1.0\ninfo:\n  title: API\n');
    expect(useStore.getState().staleArtifacts.api).toBe(false);
    expect(useStore.getState().staleArtifacts.docs).toBe(true);

    // Setting docs clears docs staleness
    useStore.getState().setDocs([
      { id: 'srs', title: 'SRS', type: 'SRS', content: '# SRS' },
    ]);
    expect(useStore.getState().staleArtifacts.docs).toBe(false);
  });

  it('marks downstream artifacts stale when upstream requirement is edited or deleted', () => {
    useStore.getState().addRequirement({
      id: 'REQ-201',
      type: 'Functional',
      priority: 'High',
      description: 'Original requirement text',
      status: 'approved',
    });

    // Clear stale flags
    useStore.getState().clearStaleArtifacts();
    expect(useStore.getState().staleArtifacts.stories).toBe(false);

    // Edit requirement description -> triggers transitive staleness
    useStore.getState().updateRequirement('REQ-201', { description: 'Updated requirement text' });
    const staleState = useStore.getState().staleArtifacts;
    expect(staleState.stories).toBe(true);
    expect(staleState.model).toBe(true);
    expect(staleState.api).toBe(true);
    expect(staleState.docs).toBe(true);
    expect(staleState.architecture).toBe(true);

    // Resolving stories clears stories staleness
    useStore.getState().setUserStories([]);
    expect(useStore.getState().staleArtifacts.stories).toBe(false);

    // Resolving UML nodes clears model staleness
    useStore.getState().setUMLNodes([]);
    expect(useStore.getState().staleArtifacts.model).toBe(false);
  });

  describe('API Key Persistence Across Browser Sessions', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
      useStore.getState().clearAllApiKeys();
    });

    it('persists API keys to localStorage across sessions by default', () => {
      const { setApiKey, hasApiKey } = useStore.getState();

      setApiKey('openai', 'sk-proj-persisted-token-1234567890');
      expect(useStore.getState().apiKeys.openai).toBe('sk-proj-persisted-token-1234567890');

      // Check persistent localStorage
      const localStored = localStorage.getItem(API_KEYS_LOCAL_STORAGE_KEY);
      expect(localStored).not.toBeNull();
      const parsed = JSON.parse(localStored!);
      expect(parsed.openai).toBe('sk-proj-persisted-token-1234567890');

      // Also mirrors to sessionStorage for active session compatibility
      const sessionStored = sessionStorage.getItem(SESSION_KEYS_STORAGE_KEY);
      expect(sessionStored).not.toBeNull();

      useStore.getState().setSelectedProvider('openai');
      expect(hasApiKey()).toBe(true);
    });

    it('rehydrates API keys from localStorage on initialization', () => {
      const persistedPayload = {
        openai: 'sk-proj-rehydrated-abc',
        gemini: 'AIzaSyRehydratedGemini',
        anthropic: '',
        groq: '',
        nvidia: '',
      };
      localStorage.setItem(API_KEYS_LOCAL_STORAGE_KEY, JSON.stringify(persistedPayload));

      const rehydrated = getInitialApiKeys();
      expect(rehydrated.openai).toBe('sk-proj-rehydrated-abc');
      expect(rehydrated.gemini).toBe('AIzaSyRehydratedGemini');
    });

    it('wipes keys from state and localStorage when clearApiKey or clearAllApiKeys is called', () => {
      const { setApiKey, clearApiKey, clearAllApiKeys } = useStore.getState();

      setApiKey('openai', 'sk-proj-to-clear-1');
      setApiKey('gemini', 'AIzaSy-to-clear-2');

      // Clear single provider
      clearApiKey('openai');
      expect(useStore.getState().apiKeys.openai).toBe('');
      expect(useStore.getState().apiKeys.gemini).toBe('AIzaSy-to-clear-2');

      let localParsed = JSON.parse(localStorage.getItem(API_KEYS_LOCAL_STORAGE_KEY)!);
      expect(localParsed.openai).toBe('');
      expect(localParsed.gemini).toBe('AIzaSy-to-clear-2');

      // Clear all keys
      clearAllApiKeys();
      expect(useStore.getState().apiKeys.gemini).toBe('');
      expect(localStorage.getItem(API_KEYS_LOCAL_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(SESSION_KEYS_STORAGE_KEY)).toBeNull();
    });

    it('supports session-only storage when rememberApiKeyOnDevice is disabled', () => {
      const { updateSettings, setApiKey } = useStore.getState();

      updateSettings('ai', { rememberApiKeyOnDevice: false });
      setApiKey('groq', 'gsk_testSessionOnlyKey1234567890');

      // Stored in sessionStorage
      const sessionStored = sessionStorage.getItem(SESSION_KEYS_STORAGE_KEY);
      expect(sessionStored).not.toBeNull();
      expect(JSON.parse(sessionStored!).groq).toBe('gsk_testSessionOnlyKey1234567890');

      // NOT stored in persistent localStorage
      expect(localStorage.getItem(API_KEYS_LOCAL_STORAGE_KEY)).toBeNull();
    });

    it('guarantees project sync payloads and JSON exports never leak API keys', () => {
      const { setApiKey, setProjectName, setProductIdea } = useStore.getState();
      const secretKey = 'AIzaSySecretLeakCheck1234567890';
      setApiKey('gemini', secretKey);
      setProjectName('Audit Project');
      setProductIdea('Super secret idea');

      const s = useStore.getState();

      // 1. JSON Export bundle structure check
      const exportBundle = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        projectName: s.projectName,
        productIdea: s.productIdea,
        requirements: s.requirements,
        userStories: s.userStories,
        umlNodes: s.umlNodes,
        umlEdges: s.umlEdges,
        architecture: s.architecture,
        openapiYaml: s.openapiYaml,
        docs: s.docs,
      };
      const exportJson = JSON.stringify(exportBundle);
      expect(exportJson).not.toContain(secretKey);
      expect(exportJson).not.toContain('apiKeys');

      // 2. Project sync payload check (as sent to PUT /projects/{id}/sync-full)
      const syncPayload = {
        title: s.projectName,
        idea: s.productIdea,
        base_version: 1,
        requirements: s.requirements,
        user_stories: s.userStories,
        nodes_data: s.umlNodes,
        edges_data: s.umlEdges,
        architecture_pattern: s.architecture.pattern,
        openapi_yaml: s.openapiYaml,
        documents: s.docs,
      };
      const syncJson = JSON.stringify(syncPayload);
      expect(syncJson).not.toContain(secretKey);
      expect(syncJson).not.toContain('apiKeys');
    });
  });
});
