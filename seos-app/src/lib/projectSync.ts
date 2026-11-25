import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api, getAuthToken, isAuthenticated } from './api';

export type SyncState = 'offline' | 'idle' | 'syncing' | 'saved' | 'error' | 'conflict';

let syncTimeout: any = null;
let activeBackendProjectId: string | null = null;

export function getActiveBackendProjectId(): string | null {
  return activeBackendProjectId;
}

export function setActiveBackendProjectId(id: string | null): void {
  activeBackendProjectId = id;
}

/**
 * Hook to manage two-way background synchronization between Zustand and FastAPI backend.
 * Provides resilient, debounced persistence ensuring zero data loss on browser cache resets.
 */
export function useProjectSync() {
  const currentUser = useStore((s) => s.currentUser);
  const projectName = useStore((s) => s.projectName);
  const productIdea = useStore((s) => s.productIdea);
  const requirements = useStore((s) => s.requirements);
  const userStories = useStore((s) => s.userStories);
  const umlNodes = useStore((s) => s.umlNodes);
  const umlEdges = useStore((s) => s.umlEdges);
  const architecture = useStore((s) => s.architecture);
  const openapiYaml = useStore((s) => s.openapiYaml);
  const docs = useStore((s) => s.docs);

  const setProjectName = useStore((s) => s.setProjectName);
  const setProductIdea = useStore((s) => s.setProductIdea);
  const setRequirements = useStore((s) => s.setRequirements);
  const setUserStories = useStore((s) => s.setUserStories);
  const setUMLNodes = useStore((s) => s.setUMLNodes);
  const setUMLEdges = useStore((s) => s.setUMLEdges);
  const setArchitecture = useStore((s) => s.setArchitecture);
  const setOpenapiYaml = useStore((s) => s.setOpenapiYaml);
  const setDocs = useStore((s) => s.setDocs);

  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const initialLoadDone = useRef(false);
  const projectVersionRef = useRef<number>(1);
  const lastUserIdRef = useRef<string | null>(null);

  // 1. Initial Load: Fetch remote project on login
  useEffect(() => {
    if (syncTimeout) {
      clearTimeout(syncTimeout);
      syncTimeout = null;
    }

    if (!isAuthenticated() || !currentUser) {
      activeBackendProjectId = null;
      initialLoadDone.current = false;
      projectVersionRef.current = 1;
      lastUserIdRef.current = null;
      setSyncState('offline');
      return;
    }

    if (lastUserIdRef.current !== currentUser.id) {
      activeBackendProjectId = null;
      initialLoadDone.current = false;
      projectVersionRef.current = 1;
      useStore.getState().resetProject();
      lastUserIdRef.current = currentUser.id;
    }

    let isMounted = true;

    async function loadOrCreateProject() {
      if (!isAuthenticated()) {
        setSyncState('offline');
        return;
      }
      try {
        setSyncState('syncing');
        const projects = await api.listProjects();

        if (!isMounted) return;

        if (projects && projects.length > 0) {
          // Load most recent project from backend and hydrate all layers unconditionally
          const remote = projects[0];
          activeBackendProjectId = remote.id;
          projectVersionRef.current = remote.version || 1;

          setProjectName(remote.title || 'New Project');
          setProductIdea(remote.idea || '');

          setRequirements(
            (remote.requirements || []).map((r: any) => ({
              id: r.req_code || r.id,
              type: r.req_type || 'Functional',
              priority: r.priority || 'Medium',
              description: r.description || '',
              status: r.status || 'draft',
            }))
          );

          setUserStories(
            (remote.user_stories || []).map((s: any) => ({
              id: s.id,
              role: s.role || 'User',
              action: s.action || '',
              benefit: s.benefit || '',
              criteria: s.criteria || [],
              status: s.status || 'draft',
              reqId: s.req_id,
            }))
          );

          setUMLNodes(remote.diagram?.nodes_data || []);
          setUMLEdges(remote.diagram?.edges_data || []);

          setArchitecture(
            remote.architecture && remote.architecture.pattern
              ? {
                  pattern: remote.architecture.pattern,
                  rationale: remote.architecture.rationale || '',
                  components: remote.architecture.components || [],
                  tradeoffs: remote.architecture.tradeoffs || [],
                  citations: remote.architecture.citations || [],
                }
              : {
                  pattern: 'None',
                  rationale: 'Provide a project idea to get architecture recommendations.',
                  components: [],
                  tradeoffs: [],
                }
          );

          setOpenapiYaml(remote.api_spec?.openapi_yaml || '');

          setDocs(
            (remote.documents || []).map((d: any) => ({
              type: d.doc_type || 'SRS',
              title: d.title || 'Document',
              content: d.content || '',
            }))
          );
        } else {
          // User has no projects on backend yet: create a clean initial one
          const created = await api.createProject({
            title: 'New Project',
            idea: '',
          });
          activeBackendProjectId = created.id;
          projectVersionRef.current = created.version || 1;
        }

        setSyncState('saved');
        setLastSaved(new Date());
        initialLoadDone.current = true;
      } catch (err) {
        console.warn('Project remote load error:', err);
        setSyncState('error');
      }
    }

    loadOrCreateProject();

    return () => {
      isMounted = false;
      if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
      }
    };
  }, [currentUser]);

  // 2. Debounced auto-save listener on state changes
  useEffect(() => {
    if (!currentUser || !getAuthToken() || !activeBackendProjectId || !initialLoadDone.current) {
      return;
    }

    setSyncState('syncing');
    if (syncTimeout) clearTimeout(syncTimeout);

    syncTimeout = setTimeout(async () => {
      try {
        const payload = {
          title: projectName,
          idea: productIdea,
          base_version: projectVersionRef.current,
          requirements: requirements.map((r) => ({
            req_code: r.id,
            req_type: r.type,
            priority: r.priority,
            description: r.description,
            status: r.status,
          })),
          user_stories: userStories.map((s) => ({
            req_id: s.reqId,
            role: s.role,
            action: s.action,
            benefit: s.benefit,
            criteria: s.criteria || [],
            status: s.status,
          })),
          nodes_data: umlNodes,
          edges_data: umlEdges,
          architecture_pattern: architecture.pattern,
          architecture_rationale: architecture.rationale,
          architecture_components: architecture.components,
          architecture_tradeoffs: architecture.tradeoffs,
          architecture_citations: architecture.citations,
          openapi_yaml: openapiYaml,
          documents: docs.map((d) => ({
            doc_type: d.type,
            title: d.title,
            content: d.content,
          })),
        };

        const updated = await api.syncFullProject(activeBackendProjectId!, payload);
        if (updated && updated.version) {
          projectVersionRef.current = updated.version;
        }
        setSyncState('saved');
        setLastSaved(new Date());
      } catch (err: any) {
        if (err?.status === 409 || String(err?.message || '').toLowerCase().includes('conflict')) {
          console.warn('Optimistic concurrency lock conflict (409):', err);
          setSyncState('conflict');
          // Do not retry automatically to prevent infinite thrashing loops
        } else {
          console.warn('Auto-sync error:', err);
          setSyncState('error');
        }
      }
    }, 1500);

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [
    projectName,
    productIdea,
    requirements,
    userStories,
    umlNodes,
    umlEdges,
    architecture,
    openapiYaml,
    docs,
  ]);

  return { syncState, lastSaved };
}
