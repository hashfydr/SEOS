import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Requirement, UserStory, UMLNode, UMLEdge, AIMessage, DocSection, Citation, SEOSSettingsState } from './types';
import type { UserProfile } from './lib/api';
import { setAuthToken } from './lib/api';
import { detectApiKeyProvider, type DetectedApiKey } from './lib/apiKeyDetector';


// ─────── API Keys & Model ───────

export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | 'groq' | 'nvidia';

export interface APIKeys {
  openai: string;
  gemini: string;
  anthropic: string;
  groq: string;
  nvidia: string;
}

// Fallback labels until a call reports the exact model in use (see activeModel)
const MODEL_MAP: Record<LLMProvider, string> = {
  groq: 'Llama 3.1 8B',
  nvidia: 'NVIDIA NIM',
  openai: 'GPT-4o',
  gemini: 'Gemini Flash',
  anthropic: 'Claude Sonnet',
};

// ─────── Generation pipeline ───────

export const DEFAULT_SETTINGS: SEOSSettingsState = {
  general: {
    displayName: 'Software Engineer',
    email: '',
    defaultLandingPage: 'overview',
    defaultProjectView: 'overview',
    dateFormat: 'YYYY-MM-DD',
    timeZone: 'UTC',
    language: 'en',
    theme: 'dark',
    defaultEditorLayout: 'split',
  },
  account: {
    twoFactorEnabled: false,
    emailVerified: true,
    activeSessionsCount: 1,
  },
  ai: {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    temperature: 0.2,
    maxTokens: 4096,
    timeoutSeconds: 45,
    retryCount: 2,
    fallbackProvider: 'openai',
  },
  pipeline: {
    enabledStages: ['requirements', 'stories', 'model', 'architecture', 'api', 'docs'],
    stageOverrides: {},
    stageTimeoutSeconds: 30,
    validationStrictness: 'standard',
    continueOnFailure: false,
    requireHumanReview: true,
    regenerationMode: 'preserve',
  },
  project: {
    defaultTemplate: 'microservices',
    defaultVisibility: 'private',
    namingPrefix: 'SEOS-',
    defaultTechStack: 'FastAPI + React + PostgreSQL',
    defaultLanguage: 'TypeScript',
    defaultExportFormat: 'markdown',
  },
  traceability: {
    requirementPrefix: 'REQ-',
    idPaddingDigits: 3,
    enforceInvest: true,
    enforceGherkin: true,
    mandatoryTraceLinks: true,
    orphanArtifactDetection: true,
    autoInvalidationOnUpstreamChange: true,
  },
  editor: {
    defaultEditorMode: 'split',
    autoSaveDebounceMs: 800,
    yamlValidation: true,
    jsonValidation: true,
    openapiValidation: true,
    diagramLayoutEngine: 'dagre',
    canvasGrid: true,
    snapToGrid: true,
    gridSize: 20,
  },
  sync: {
    autoSyncEnabled: true,
    syncIntervalSeconds: 10,
    conflictResolution: 'server_wins',
  },
  rag: {
    supportedExtensions: ['.md', '.txt', '.pdf', '.json', '.yaml'],
    maxUploadSizeBytes: 10485760,
    chunkSize: 600,
    chunkOverlap: 100,
    topK: 3,
    similarityThreshold: 0.75,
    enableReranking: true,
  },
  notifications: {
    pipelineCompletion: true,
    generationFailure: true,
    syncErrorWarning: true,
    artifactDriftAlert: true,
    classroomAnnouncements: true,
  },
  classroom: {
    classroomName: 'SE-301: Advanced Software Systems',
    joinCode: 'SEOS-CS301-A',
    codeExpiryPolicy: '30_days',
    allowStudentMultiProjects: true,
    allowPeerReviewViewing: false,
    restrictAIToQuota: true,
    submissionDeadline: '2026-12-15T23:59',
    peerReviewVisibility: 'anonymous',
  },
  privacy: {
    telemetryEnabled: false,
    auditRetentionDays: 90,
  },
  admin: {
    maintenanceMode: false,
    sharedAIQuotaEnabled: true,
    maxConcurrentGenerations: 10,
    dbPoolTargetSize: 20,
  },
};

export type PipelineStage = 'requirements' | 'stories' | 'model' | 'architecture' | 'api' | 'docs';

export interface PipelineState {
  running: boolean;
  stage: PipelineStage | null;
  /** Stages planned for the current run, in order */
  planned: PipelineStage[];
  done: PipelineStage[];
  error: string | null;
}

// ─────── Architecture type ───────

export interface ArchComponent {
  name: string;
  tech: string;
  purpose: string;
}

export interface ArchTradeoff {
  pro: string;
  con: string;
}

export interface ArchRecommendation {
  pattern: string;
  rationale: string;
  components: ArchComponent[];
  tradeoffs: ArchTradeoff[];
  citations?: Citation[];
}

// ─────── Store State & Actions ───────

interface SEOSState {
  // === Project Data ===
  projectName: string;
  productIdea: string;
  requirements: Requirement[];
  userStories: UserStory[];
  umlNodes: UMLNode[];
  umlEdges: UMLEdge[];
  docs: DocSection[];
  openapiYaml: string;
  architecture: ArchRecommendation;

  // === AI Chat ===
  messages: AIMessage[];
  isThinking: boolean;

  // === Generation (not persisted) ===
  pipeline: PipelineState;
  /** Transient provider status shown in the UI, e.g. "Gemini is busy — retrying in 4s" */
  llmNotice: string | null;
  setLlmNotice: (notice: string | null) => void;
  /** Exact model id the last successful call used, e.g. "gemini-3.8-flash" */
  activeModel: string | null;
  setPipeline: (patch: Partial<PipelineState>) => void;
  setActiveModel: (model: string | null) => void;

  // === Stale Artifact Tracking ===
  /** Tracks which downstream artifacts are outdated after upstream edits */
  staleArtifacts: { api: boolean; docs: boolean; architecture: boolean };
  setStaleArtifacts: (patch: Partial<{ api: boolean; docs: boolean; architecture: boolean }>) => void;
  clearStaleArtifacts: () => void;

  // === Authentication & Role ===
  currentUser: UserProfile | null;
  authModalOpen: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  setAuthModalOpen: (open: boolean) => void;
  logout: () => void;

  // === Settings ===
  apiKeys: APIKeys;
  selectedProvider: LLMProvider;
  theme: 'light' | 'dark';
  settings: SEOSSettingsState;
  updateSettings: <K extends keyof SEOSSettingsState>(category: K, patch: Partial<SEOSSettingsState[K]>) => void;
  resetSettingsCategory: (category: keyof SEOSSettingsState) => void;
  resetAllSettings: () => void;

  // === Actions — Project Data ===
  setProjectName: (name: string) => void;
  setProductIdea: (idea: string) => void;
  setRequirements: (reqs: Requirement[]) => void;
  addRequirement: (req: Requirement) => void;
  updateRequirement: (id: string, patch: Partial<Requirement>) => void;
  deleteRequirement: (id: string) => void;

  setUserStories: (stories: UserStory[]) => void;
  addUserStory: (story: UserStory) => void;

  setUMLNodes: (nodes: UMLNode[]) => void;
  setUMLEdges: (edges: UMLEdge[]) => void;

  setDocs: (docs: DocSection[]) => void;
  setOpenapiYaml: (yaml: string) => void;
  setArchitecture: (arch: ArchRecommendation) => void;

  // === Actions — AI Chat ===
  addMessage: (msg: AIMessage) => void;
  setMessages: (msgs: AIMessage[]) => void;
  setIsThinking: (val: boolean) => void;

  // === Actions — Settings ===
  setApiKey: (provider: LLMProvider, key: string) => void;
  autoSetApiKey: (rawKey: string, detectedOverride?: DetectedApiKey) => DetectedApiKey | null;
  setSelectedProvider: (provider: LLMProvider) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  /** Start over: clears every project layer and the chat; keeps API keys, provider and theme */
  resetProject: () => void;

  // === Utility ===
  getModelLabel: () => string;
  hasApiKey: () => boolean;
}

const emptyArchitecture = (): ArchRecommendation => ({
  pattern: 'None',
  rationale: 'Provide a project idea to get architecture recommendations.',
  components: [],
  tradeoffs: [],
});

const greeting = (): AIMessage => ({
  id: '1',
  role: 'assistant',
  content: 'Hello! I am your SEOS AI Assistant. Tell me what kind of app or system you want to build, and I will generate the requirements, architecture, and user stories for you!',
  timestamp: new Date().toISOString(),
});

export const useStore = create<SEOSState>()(
  persist(
    (set, get) => ({
      // === Initial Project Data ===
      projectName: 'New Project',
      productIdea: '',
      requirements: [],
      userStories: [],
      umlNodes: [],
      umlEdges: [],
      docs: [],
      openapiYaml: '',
      architecture: emptyArchitecture(),

      // === AI Chat ===
      messages: [greeting()],
      isThinking: false,

      // === Generation ===
      pipeline: { running: false, stage: null, planned: [], done: [], error: null },
      activeModel: null,
      llmNotice: null,
      setLlmNotice: (notice) => set({ llmNotice: notice }),
      setPipeline: (patch) => set((s) => ({ pipeline: { ...s.pipeline, ...patch } })),
      setActiveModel: (model) => set({ activeModel: model }),

      // === Stale Artifact Tracking ===
      staleArtifacts: { api: false, docs: false, architecture: false },
      setStaleArtifacts: (patch) => set((s) => ({ staleArtifacts: { ...s.staleArtifacts, ...patch } })),
      clearStaleArtifacts: () => set({ staleArtifacts: { api: false, docs: false, architecture: false } }),

      // === Authentication & Role ===
      currentUser: null,
      authModalOpen: false,
      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthModalOpen: (open) => set({ authModalOpen: open }),
      logout: () => {
        setAuthToken(null);
        set({ currentUser: null });
      },

      // === Settings ===
      apiKeys: { openai: '', gemini: '', anthropic: '', groq: '', nvidia: '' },
      selectedProvider: 'gemini',
      theme: 'dark',
      settings: DEFAULT_SETTINGS,

      updateSettings: (category, patch) =>
        set((s) => {
          const currentCategory = s.settings[category] || DEFAULT_SETTINGS[category];
          const updatedCategory = { ...currentCategory, ...patch };
          const nextSettings = { ...s.settings, [category]: updatedCategory };
          const extraPatch: Partial<SEOSState> = {};
          if (category === 'general' && (patch as any).theme) {
            extraPatch.theme = (patch as any).theme;
          }
          if (category === 'ai' && (patch as any).provider) {
            extraPatch.selectedProvider = (patch as any).provider;
          }
          return { settings: nextSettings, ...extraPatch };
        }),

      resetSettingsCategory: (category) =>
        set((s) => ({
          settings: { ...s.settings, [category]: { ...DEFAULT_SETTINGS[category] } },
        })),

      resetAllSettings: () =>
        set({ settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) }),

      // === Actions — Requirements ===
      setProjectName: (name) => set({ projectName: name }),
      setProductIdea: (idea) => set({ productIdea: idea }),
      setRequirements: (reqs) => set({ requirements: reqs }),
      addRequirement: (req) => set((s) => ({ requirements: [...s.requirements, req] })),
      updateRequirement: (id, patch) =>
        set((s) => ({
          requirements: s.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRequirement: (id) =>
        set((s) => ({ requirements: s.requirements.filter((r) => r.id !== id) })),

      // === Actions — User Stories ===
      setUserStories: (stories) => set({ userStories: stories }),
      addUserStory: (story) => set((s) => ({ userStories: [...s.userStories, story] })),

      // === Actions — UML ===
      setUMLNodes: (nodes) => set({ umlNodes: nodes }),
      setUMLEdges: (edges) => set({ umlEdges: edges }),

      // === Actions — Docs ===
      setDocs: (docs) => set((s) => ({ docs, staleArtifacts: { ...s.staleArtifacts, docs: false } })),
      setOpenapiYaml: (yaml) => set((s) => ({ openapiYaml: yaml, staleArtifacts: { ...s.staleArtifacts, api: false } })),
      setArchitecture: (arch) => set((s) => ({ architecture: arch, staleArtifacts: { ...s.staleArtifacts, architecture: false } })),

      // === Actions — Chat ===
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setMessages: (msgs) => set({ messages: msgs }),
      setIsThinking: (val) => set({ isThinking: val }),

      // === Actions — Settings ===
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      autoSetApiKey: (rawKey: string, detectedOverride?: DetectedApiKey) => {
        const detected = detectedOverride || detectApiKeyProvider(rawKey);
        if (!detected) return null;
        const { provider, defaultModel } = detected;
        set((s) => ({
          apiKeys: { ...s.apiKeys, [provider]: rawKey.trim() },
          selectedProvider: provider,
          activeModel: defaultModel,
          settings: {
            ...s.settings,
            ai: { ...s.settings.ai, provider, model: defaultModel },
          },
        }));
        return detected;
      },
      setSelectedProvider: (provider) =>
        set((s) => ({
          selectedProvider: provider,
          activeModel: null,
          settings: { ...s.settings, ai: { ...s.settings.ai, provider } },
        })),
      toggleTheme: () =>
        set((s) => {
          const nextTheme = s.theme === 'dark' ? 'light' : 'dark';
          return {
            theme: nextTheme,
            settings: { ...s.settings, general: { ...s.settings.general, theme: nextTheme } },
          };
        }),
      setTheme: (theme) =>
        set((s) => ({
          theme,
          settings: { ...s.settings, general: { ...s.settings.general, theme } },
        })),

      resetProject: () =>
        set({
          projectName: 'New Project',
          productIdea: '',
          requirements: [],
          userStories: [],
          umlNodes: [],
          umlEdges: [],
          docs: [],
          openapiYaml: '',
          architecture: emptyArchitecture(),
          messages: [greeting()],
          staleArtifacts: { api: false, docs: false, architecture: false },
          pipeline: { running: false, stage: null, planned: [], done: [], error: null },
          llmNotice: null,
        }),

      // === Utility ===
      getModelLabel: () => get().activeModel || MODEL_MAP[get().selectedProvider],
      hasApiKey: () => {
        const { apiKeys, selectedProvider } = get();
        return !!apiKeys[selectedProvider]?.trim();
      },
    }),
    {
      name: 'seos-storage-v2',
      // Security Hardening (Gate 1): Provider API keys are strictly memory-only
      // and NOT persisted into localStorage to prevent XSS / local exfiltration.
      partialize: (state) => ({
        projectName: state.projectName,
        productIdea: state.productIdea,
        requirements: state.requirements,
        userStories: state.userStories,
        umlNodes: state.umlNodes,
        umlEdges: state.umlEdges,
        docs: state.docs,
        openapiYaml: state.openapiYaml,
        architecture: state.architecture,
        staleArtifacts: state.staleArtifacts,
        selectedProvider: state.selectedProvider,
        messages: state.messages,
        theme: state.theme,
        currentUser: state.currentUser,
        settings: state.settings,
      }),
    },
  ),
);
