import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Requirement, UserStory, UMLNode, UMLEdge, AIMessage, DocSection } from './types';


// ─────── API Keys & Model ───────

export type LLMProvider = 'openai' | 'gemini' | 'anthropic';

export interface APIKeys {
  openai: string;
  gemini: string;
  anthropic: string;
}

// Fallback labels until a call reports the exact model in use (see activeModel)
const MODEL_MAP: Record<LLMProvider, string> = {
  openai: 'GPT-4o',
  gemini: 'Gemini Flash',
  anthropic: 'Claude Sonnet',
};

// ─────── Generation pipeline ───────

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

  // === Settings ===
  apiKeys: APIKeys;
  selectedProvider: LLMProvider;
  theme: 'light' | 'dark';

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

      // === Settings ===
      apiKeys: { openai: '', gemini: '', anthropic: '' },
      selectedProvider: 'gemini',
      theme: 'dark',

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
      setDocs: (docs) => set({ docs }),
      setOpenapiYaml: (yaml) => set({ openapiYaml: yaml }),
      setArchitecture: (arch) => set({ architecture: arch }),

      // === Actions — Chat ===
      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setMessages: (msgs) => set({ messages: msgs }),
      setIsThinking: (val) => set({ isThinking: val }),

      // === Actions — Settings ===
      setApiKey: (provider, key) =>
        set((s) => ({ apiKeys: { ...s.apiKeys, [provider]: key } })),
      setSelectedProvider: (provider) => set({ selectedProvider: provider, activeModel: null }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setTheme: (theme) => set({ theme }),

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
      // Persist full project state so refresh keeps everything in sync!
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
        apiKeys: state.apiKeys,
        selectedProvider: state.selectedProvider,
        messages: state.messages,
        theme: state.theme,
      }),
    },
  ),
);
