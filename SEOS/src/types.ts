export type ViewId =
  | 'overview'
  | 'requirements'
  | 'user-stories'
  | 'modeling'
  | 'architecture'
  | 'api-designer'
  | 'documentation'
  | 'learning';

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
