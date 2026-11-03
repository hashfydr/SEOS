import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import { clearProjectLayers, STAGES, STAGE_LABEL } from '../lib/pipeline';

describe('SEOS Pipeline Engine', () => {
  beforeEach(() => {
    useStore.getState().resetProject();
  });

  it('defines all 6 pipeline stages in canonical order', () => {
    expect(STAGES).toEqual([
      'requirements',
      'stories',
      'model',
      'architecture',
      'api',
      'docs',
    ]);

    expect(STAGE_LABEL.requirements).toBe('Requirements');
    expect(STAGE_LABEL.stories).toBe('User stories');
    expect(STAGE_LABEL.model).toBe('System model');
    expect(STAGE_LABEL.architecture).toBe('Architecture');
    expect(STAGE_LABEL.api).toBe('API specification');
    expect(STAGE_LABEL.docs).toBe('Documentation');
  });

  it('clearProjectLayers resets all generated artifacts to empty', () => {
    // Populate store with mock artifacts
    useStore.getState().setRequirements([
      {
        id: 'REQ-101',
        type: 'Functional',
        priority: 'High',
        description: 'Test requirement',
        status: 'draft',
      },
    ]);
    useStore.getState().setUserStories([
      {
        id: 'US-101',
        reqId: 'REQ-101',
        role: 'User',
        action: 'browse',
        benefit: 'buy',
        criteria: ['given a user'],
        status: 'draft',
      },
    ]);
    useStore.getState().setOpenapiYaml('openapi: 3.1.0\n');
    useStore.getState().setDocs([
      { id: 'srs', title: 'SRS', type: 'SRS', content: '# SRS' },
    ]);

    expect(useStore.getState().requirements.length).toBe(1);
    expect(useStore.getState().userStories.length).toBe(1);
    expect(useStore.getState().openapiYaml).toBeTruthy();
    expect(useStore.getState().docs.length).toBe(1);

    // Call clearProjectLayers
    clearProjectLayers();

    expect(useStore.getState().requirements).toEqual([]);
    expect(useStore.getState().userStories).toEqual([]);
    expect(useStore.getState().umlNodes).toEqual([]);
    expect(useStore.getState().umlEdges).toEqual([]);
    expect(useStore.getState().openapiYaml).toBe('');
    expect(useStore.getState().docs).toEqual([]);
    expect(useStore.getState().architecture.pattern).toBe('None');
  });
});
