/**
 * SEOS REST API Client
 * Provides typed, authenticated communication with the FastAPI backend.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '') : '') + '/api/v1';

export type UserRole = 'solo_dev' | 'student' | 'mentor';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  classroom_code?: string | null;
  classroom_name?: string | null;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  name: string;
}

export interface Classroom {
  id: string;
  mentor_id: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  student_count: number;
  mentor_name?: string | null;
}

export interface RosterProjectSummary {
  id: string;
  title: string;
  status: string;
  version: number;
  requirements_count: number;
  stories_count: number;
  has_model: boolean;
  has_architecture: boolean;
  has_api: boolean;
  has_docs: boolean;
  created_at: string;
}

export interface RosterStudent {
  id: string;
  name: string;
  email: string;
  enrolled_at: string;
  projects: RosterProjectSummary[];
}

export interface ClassroomRoster {
  classroom: Classroom;
  students: RosterStudent[];
}

let storedToken: string | null = null;
try {
  storedToken = localStorage.getItem('seos_auth_token');
} catch {
  // localStorage may be restricted
}

export function setAuthToken(token: string | null): void {
  storedToken = token;
  try {
    if (token) {
      localStorage.setItem('seos_auth_token', token);
    } else {
      localStorage.removeItem('seos_auth_token');
    }
  } catch {
    // Ignore storage issues
  }
}

export function getAuthToken(): string | null {
  return storedToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Body not JSON
    }
    throw new Error(errorDetail);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Health
  checkHealth: async () => {
    try {
      return await request<{ status: string }>('/health');
    } catch {
      return null;
    }
  },

  // Auth
  register: (payload: { name: string; email: string; password: string; role: UserRole; join_code?: string; mentor_passcode?: string }) =>
    request<UserProfile>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: async (payload: { email: string; password: string }) => {
    const data = await request<AuthTokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(data.access_token);
    return data;
  },

  getMe: () => request<UserProfile>('/auth/me'),

  // Classrooms
  listClassrooms: () => request<Classroom[]>('/classrooms'),

  createClassroom: (payload: { name: string; description?: string; custom_code?: string }) =>
    request<Classroom>('/classrooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  joinClassroom: (code: string) =>
    request<Classroom>('/classrooms/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  getClassroomRoster: (classroomId: string) =>
    request<ClassroomRoster>(`/classrooms/${classroomId}/roster`),

  // Projects
  listProjects: () => request<any[]>('/projects'),

  createProject: (payload: { title: string; idea?: string }) =>
    request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProject: (projectId: string) => request<any>(`/projects/${projectId}`),

  // Artifact Sync
  syncRequirements: (projectId: string, requirements: any[]) =>
    request<any>(`/projects/${projectId}/artifacts/requirements`, {
      method: 'PUT',
      body: JSON.stringify(requirements),
    }),

  syncStories: (projectId: string, stories: any[]) =>
    request<any>(`/projects/${projectId}/artifacts/stories`, {
      method: 'PUT',
      body: JSON.stringify(stories),
    }),

  syncDiagram: (projectId: string, diagram: any) =>
    request<any>(`/projects/${projectId}/artifacts/diagram`, {
      method: 'PUT',
      body: JSON.stringify(diagram),
    }),

  syncArchitecture: (projectId: string, architecture: any) =>
    request<any>(`/projects/${projectId}/artifacts/architecture`, {
      method: 'PUT',
      body: JSON.stringify(architecture),
    }),

  syncApiSpec: (projectId: string, spec: any) =>
    request<any>(`/projects/${projectId}/artifacts/api-spec`, {
      method: 'PUT',
      body: JSON.stringify(spec),
    }),

  syncDocs: (projectId: string, docs: any[]) =>
    request<any>(`/projects/${projectId}/artifacts/docs`, {
      method: 'PUT',
      body: JSON.stringify(docs),
    }),

  // Full Atomic Project Sync
  syncFullProject: (projectId: string, data: any) =>
    request<any>(`/projects/${projectId}/sync-full`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Document Upload & RAG
  uploadDocument: async (file: File, topic?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (topic) {
      formData.append('topic', topic);
    }
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/knowledge/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || `Upload failed with status ${res.status}`);
    }
    return res.json() as Promise<{ file_name: string; chunks_count: number; topic: string; message: string }>;
  },

  listMyDocuments: () =>
    request<{ file_name: string; topic: string; source_book: string; chunks_count: number }[]>('/knowledge/my-documents'),

  deleteDocument: (fileName: string) =>
    request<{ message: string }>(`/knowledge/documents/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    }),

  searchKnowledge: (q: string, limit = 6) =>
    request<{ id: string; topic: string; source_book: string; chapter_or_page: string; chunk_text: string }[]>(
      `/knowledge/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
};
