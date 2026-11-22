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
});
