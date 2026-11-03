import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import {
  importProjectFromJSON,
  PRESET_CASE_STUDIES,
} from '../lib/projectManager';

describe('Project Manager & Reference Case Studies', () => {
  beforeEach(() => {
    useStore.getState().resetProject();
  });

  it('rejects invalid JSON string', () => {
    const res = importProjectFromJSON('not a json');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('imports a valid project bundle', () => {
    const bundle = JSON.stringify({
      version: '1.0',
      projectName: 'TestApp',
      productIdea: 'A test application',
      requirements: [
        {
          id: 'REQ-101',
          type: 'Functional',
          priority: 'High',
          description: 'The system shall authenticate users.',
          status: 'approved',
        },
      ],
      userStories: [],
      umlNodes: [],
      umlEdges: [],
      architecture: {
        pattern: 'Modular Monolith',
        rationale: 'Simple setup',
        components: [],
        tradeoffs: [],
      },
      openapiYaml: 'openapi: 3.1.0\n',
      docs: [],
    });

    const res = importProjectFromJSON(bundle);
    expect(res.success).toBe(true);
    expect(useStore.getState().projectName).toBe('TestApp');
    expect(useStore.getState().requirements.length).toBe(1);
    expect(useStore.getState().architecture.pattern).toBe('Modular Monolith');
  });

  it('loads the FoodDash reference case study', () => {
    const foodDashPreset = PRESET_CASE_STUDIES.find((p) => p.id === 'fooddash');
    expect(foodDashPreset).toBeDefined();

    foodDashPreset?.load();
    const state = useStore.getState();

    expect(state.projectName).toBe('FoodDash');
    expect(state.requirements.length).toBeGreaterThanOrEqual(6);
    expect(state.userStories.length).toBeGreaterThanOrEqual(4);
    expect(state.umlNodes.length).toBe(6);
    expect(state.architecture.pattern).toContain('Microservices');
    expect(state.openapiYaml).toContain('/restaurants');
  });

  it('loads the CarePulse healthcare reference case study', () => {
    const carePulsePreset = PRESET_CASE_STUDIES.find((p) => p.id === 'carepulse');
    expect(carePulsePreset).toBeDefined();

    carePulsePreset?.load();
    const state = useStore.getState();

    expect(state.projectName).toBe('CarePulse');
    expect(state.requirements.length).toBe(5);
    expect(state.architecture.pattern).toContain('Modular Monolith');
    expect(state.openapiYaml).toContain('/patients');
  });
});
