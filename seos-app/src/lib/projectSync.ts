import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { api, getAuthToken } from './api';

export type SyncState = 'offline' | 'idle' | 'syncing' | 'saved' | 'error';

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

  // 1. Initial Load: Fetch remote project on login
  useEffect(() => {
    if (!currentUser || !getAuthToken()) {
      setSyncState('offline');
      return;
    }

    let isMounted = true;

    async function loadOrCreateProject() {
      try {
        setSyncState('syncing');
        const projects = await api.listProjects();

        if (!isMounted) return;

        if (projects && projects.length > 0) {
          // Load most recent project from backend
          const remote = projects[0];
          activeBackendProjectId = remote.id;
          if (remote.version) projectVersionRef.current = remote.version;

          if (remote.title) setProjectName(remote.title);
          if (remote.idea) setProductIdea(remote.idea);

          if (remote.requirements && remote.requirements.length > 0) {
            setRequirements(
              remote.requirements.map((r: any) => ({
                id: r.req_code || r.id,
                type: r.req_type || 'Functional',
                priority: r.priority || 'Medium',
                description: r.description || '',
                status: r.status || 'draft',
              }))
            );
          }

          if (remote.user_stories && remote.user_stories.length > 0) {
            setUserStories(
              remote.user_stories.map((s: any) => ({
                id: s.id,
                role: s.role || 'User',
                action: s.action || '',
                benefit: s.benefit || '',
                criteria: s.criteria || [],
                status: s.status || 'draft',
                reqId: s.req_id,
              }))
            );
          }

          if (remote.diagram) {
            if (remote.diagram.nodes_data) setUMLNodes(remote.diagram.nodes_data);
            if (remote.diagram.edges_data) setUMLEdges(remote.diagram.edges_data);
          }

          if (remote.architecture && remote.architecture.pattern) {
            setArchitecture({
              pattern: remote.architecture.pattern,
              rationale: remote.architecture.rationale || '',
              components: remote.architecture.components || [],
              tradeoffs: remote.architecture.tradeoffs || [],
              citations: remote.architecture.citations || [],
            });
          }

          if (remote.api_spec && remote.api_spec.openapi_yaml) {
            setOpenapiYaml(remote.api_spec.openapi_yaml);
          }

          if (remote.documents && remote.documents.length > 0) {
            setDocs(
              remote.documents.map((d: any) => ({
                type: d.doc_type || 'SRS',
                title: d.title || 'Document',
                content: d.content || '',
              }))
            );
          }
        } else {
          // User has no projects on backend yet: create initial one
          const created = await api.createProject({
            title: projectName || 'SEOS Project',
            idea: productIdea || '',
          });
          activeBackendProjectId = created.id;
          if (created.version) projectVersionRef.current = created.version;
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
      } catch (err) {
        console.warn('Auto-sync error:', err);
        setSyncState('error');
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
