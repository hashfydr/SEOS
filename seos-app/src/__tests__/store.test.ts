import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';

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
    expect(state.staleArtifacts).toEqual({ api: false, docs: false, architecture: false });
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
});
