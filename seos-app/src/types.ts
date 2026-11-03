export type ViewId =
  | 'home'
  | 'overview'
  | 'requirements'
  | 'user-stories'
  | 'modeling'
  | 'architecture'
  | 'api-designer'
  | 'documentation'
  | 'learning'
  | 'mentor-roster'
  | 'settings';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  badge?: number;
}

export interface Requirement {
  id: string;
  type: 'Functional' | 'Non-Functional';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  status: 'draft' | 'approved' | 'rejected';
}

export interface UserStory {
  id: string;
  role: string;
  action: string;
  benefit: string;
  criteria: string[];
  status: 'draft' | 'approved' | 'rejected';
  reqId: string;
}

export interface UMLNode {
  id: string;
  name: string;
  type: 'entity' | 'actor' | 'service';
  x: number;
  y: number;
  fields: { name: string; type: string; pk?: boolean; fk?: boolean; isPK?: boolean; isFK?: boolean }[];
  methods?: string[];
}

export interface UMLEdge {
  id?: string;
  from: string;
  to: string;
  label: string;
  cardinalityFrom?: string;
  cardinalityTo?: string;
}

export interface Citation {
  source?: string;
  page?: string;
  title?: string;
  url?: string;
  id?: string;
}

export interface AIMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: string;
  citations?: Citation[];
}

export interface DocSection {
  id: string;
  title: string;
  type: 'SRS' | 'SDD' | 'README';
  content: string;
}

// ─────── Settings Architecture (13 Categories) ───────

export type SettingsCategoryId =
  | 'general'
  | 'account'
  | 'ai'
  | 'pipeline'
  | 'project'
  | 'traceability'
  | 'editor'
  | 'sync'
  | 'rag'
  | 'notifications'
  | 'classroom'
  | 'privacy'
  | 'admin';

export interface GeneralSettings {
  displayName: string;
  email: string;
  defaultLandingPage: ViewId;
  defaultProjectView: 'overview' | 'requirements' | 'documentation';
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
  timeZone: string;
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';
  theme: 'dark' | 'light';
  defaultEditorLayout: 'split' | 'visual' | 'source';
}

export interface AccountSettings {
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  activeSessionsCount: number;
}

export type LLMProvider = 'openai' | 'gemini' | 'anthropic' | 'groq' | 'nvidia';

export interface AISettings {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutSeconds: number;
  retryCount: number;
  fallbackProvider: 'none' | 'openai' | 'gemini' | 'anthropic' | 'groq' | 'nvidia';
}

export interface PipelineConfigSettings {
  enabledStages: ('requirements' | 'stories' | 'model' | 'architecture' | 'api' | 'docs')[];
  stageOverrides: Record<string, string>;
  stageTimeoutSeconds: number;
  validationStrictness: 'lenient' | 'standard' | 'strict';
  continueOnFailure: boolean;
  requireHumanReview: boolean;
  regenerationMode: 'overwrite' | 'preserve';
}

export interface ProjectSettings {
  defaultTemplate: 'blank' | 'microservices' | 'monolith' | 'event-driven' | 'mobile-first' | 'data-pipeline';
  defaultVisibility: 'private' | 'classroom' | 'public';
  namingPrefix: string;
  defaultTechStack: string;
  defaultLanguage: string;
  defaultExportFormat: 'markdown' | 'pdf' | 'json' | 'openapi-yaml';
}

export interface TraceabilitySettings {
  requirementPrefix: string;
  idPaddingDigits: number;
  enforceInvest: boolean;
  enforceGherkin: boolean;
  mandatoryTraceLinks: boolean;
  orphanArtifactDetection: boolean;
  autoInvalidationOnUpstreamChange: boolean;
}

export interface EditorSettings {
  defaultEditorMode: 'visual' | 'source' | 'split';
  autoSaveDebounceMs: number;
  yamlValidation: boolean;
  jsonValidation: boolean;
  openapiValidation: boolean;
  diagramLayoutEngine: 'dagre' | 'force' | 'orthogonal';
  canvasGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface SyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalSeconds: number;
  conflictResolution: 'server_wins' | 'local_wins' | 'manual_merge';
}

export interface RagSettings {
  supportedExtensions: string[];
  maxUploadSizeBytes: number;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  similarityThreshold: number;
  enableReranking: boolean;
}

export interface NotificationSettings {
  pipelineCompletion: boolean;
  generationFailure: boolean;
  syncErrorWarning: boolean;
  artifactDriftAlert: boolean;
  classroomAnnouncements: boolean;
}

export interface ClassroomConfigSettings {
  classroomName: string;
  joinCode: string;
  codeExpiryPolicy: 'never' | '7_days' | '30_days';
  allowStudentMultiProjects: boolean;
  allowPeerReviewViewing: boolean;
  restrictAIToQuota: boolean;
  submissionDeadline: string;
  peerReviewVisibility: 'anonymous' | 'named' | 'disabled';
}

export interface PrivacySettings {
  telemetryEnabled: boolean;
  auditRetentionDays: number;
}

export interface AdminSettings {
  maintenanceMode: boolean;
  sharedAIQuotaEnabled: boolean;
  maxConcurrentGenerations: number;
  dbPoolTargetSize: number;
}

export interface SEOSSettingsState {
  general: GeneralSettings;
  account: AccountSettings;
  ai: AISettings;
  pipeline: PipelineConfigSettings;
  project: ProjectSettings;
  traceability: TraceabilitySettings;
  editor: EditorSettings;
  sync: SyncSettings;
  rag: RagSettings;
  notifications: NotificationSettings;
  classroom: ClassroomConfigSettings;
  privacy: PrivacySettings;
  admin: AdminSettings;
}

