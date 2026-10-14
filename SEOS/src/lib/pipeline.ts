/**
 * The SEOS generation pipeline: idea → requirements → user stories →
 * system model → architecture → OpenAPI → documentation.
 *
 * Each stage is one focused LLM call that reads the layers above it from the
 * store and writes its own layer back, so every view fills in as soon as its
 * stage finishes.
 */

import { useStore, type PipelineStage, type ArchRecommendation } from '../store';
import type { Requirement, UserStory, UMLNode, UMLEdge, DocSection } from '../types';
import { complete, parseJSON, LLMError } from './llm';

export const STAGES: PipelineStage[] = ['requirements', 'stories', 'model', 'architecture', 'api', 'docs'];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  requirements: 'Requirements',
  stories: 'User stories',
  model: 'System model',
  architecture: 'Architecture',
  api: 'API specification',
  docs: 'Documentation',
};

const SYSTEM = `You are the engine of SEOS, a software engineering workspace.
You produce precise, realistic software engineering artifacts for the product described.
Be specific to the domain — never generic placeholders like "Item" or "Entity1".
Follow the requested output format exactly.`;

// ─── Context from layers already generated ───

function context(include: { reqs?: boolean; stories?: boolean; model?: boolean; arch?: boolean }) {
  const s = useStore.getState();
  const parts = [`PROJECT: ${s.projectName}`, `PRODUCT IDEA: ${s.productIdea}`];
  if (include.reqs) {
    parts.push(
      'REQUIREMENTS:\n' +
        s.requirements.map((r) => `- [${r.id}] (${r.type}, ${r.priority}) ${r.description}`).join('\n'),
    );
  }
  if (include.stories) {
    parts.push(
      'USER STORIES:\n' +
        s.userStories.map((u) => `- [${u.id} → ${u.reqId}] As a ${u.role}, I want to ${u.action}, so that ${u.benefit}`).join('\n'),
    );
  }
  if (include.model) {
    parts.push(
      'DOMAIN MODEL:\n' +
        s.umlNodes
          .map((n) => `- ${n.name} (${n.type}): ${n.fields.map((f) => `${f.name}:${f.type}${f.pk ? ' PK' : ''}${f.fk ? ' FK' : ''}`).join(', ')}`)
          .join('\n') +
        '\nRELATIONSHIPS:\n' +
        s.umlEdges
          .map((e) => {
            const from = s.umlNodes.find((n) => n.id === e.from)?.name;
            const to = s.umlNodes.find((n) => n.id === e.to)?.name;
            return `- ${from} ${e.label} ${to} (${e.cardinalityFrom ?? '1'}..${e.cardinalityTo ?? '*'})`;
          })
          .join('\n'),
    );
  }
  if (include.arch) {
    parts.push(
      `ARCHITECTURE: ${s.architecture.pattern}\n` +
        s.architecture.components.map((c) => `- ${c.name} [${c.tech}]: ${c.purpose}`).join('\n'),
    );
  }
  return parts.join('\n\n');
}

async function askJSON<T>(prompt: string, maxTokens = 8192): Promise<T> {
  const { text } = await complete({ system: SYSTEM, messages: [{ role: 'user', content: prompt }], json: true, maxTokens, temperature: 0.6 });
  return parseJSON<T>(text);
}

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

// ─── Stages ───

async function generateRequirements(opts: PipelineOptions) {
  const s = useStore.getState();
  const out = await askJSON<{ projectName?: string; requirements: Partial<Requirement>[] }>(`${context({})}

Write the software requirements for this product.
Return JSON:
{
  "projectName": "short product name (keep the current one if it is already specific)",
  "requirements": [
    { "id": "REQ-101", "type": "Functional" | "Non-Functional", "priority": "Critical" | "High" | "Medium" | "Low", "description": "The system shall ..." }
  ]
}
Rules: 8 to 12 requirements, roughly two thirds Functional; ids REQ-101, REQ-102, … in order;
each description is one testable "The system shall …" sentence; Non-Functional ones are measurable (numbers, standards).`);

  const requirements: Requirement[] = (out.requirements || []).map((r, i) => ({
    id: r.id || `REQ-${101 + i}`,
    type: oneOf(r.type, ['Functional', 'Non-Functional'] as const, 'Functional'),
    priority: oneOf(r.priority, ['Critical', 'High', 'Medium', 'Low'] as const, 'Medium'),
    description: r.description || '',
    status: 'draft',
  }));
  if (!requirements.length) throw new LLMError('No requirements came back. Try again.');

  const genericName = opts.rename || !s.projectName || s.projectName === 'New Project';
  if (out.projectName && genericName) s.setProjectName(out.projectName);
  s.setRequirements(requirements);
}

async function generateStories() {
  const s = useStore.getState();
  const approved = s.requirements.filter((r) => r.status === 'approved');
  const basis = approved.length ? 'the APPROVED requirements' : 'the requirements';
  const out = await askJSON<{ userStories: Partial<UserStory>[] }>(`${context({ reqs: true })}

Write agile user stories derived from ${basis}${approved.length ? ` (${approved.map((r) => r.id).join(', ')})` : ''}.
Return JSON:
{
  "userStories": [
    { "id": "US-101", "reqId": "REQ-101", "role": "specific user role", "action": "what they want to do", "benefit": "why it matters", "criteria": ["Given/When/Then style acceptance criterion", "..."] }
  ]
}
Rules: one story per Functional requirement (plus Non-Functional ones that affect a user directly); reqId must be an existing id;
3 to 4 concrete, testable acceptance criteria each; "action" and "benefit" start lowercase and read naturally after "I want to" / "so that".`);

  const reqIds = new Set(s.requirements.map((r) => r.id));
  const stories: UserStory[] = (out.userStories || []).map((u, i) => ({
    id: u.id || `US-${101 + i}`,
    reqId: u.reqId && reqIds.has(u.reqId) ? u.reqId : s.requirements[0]?.id || '',
    role: u.role || 'User',
    action: u.action || '',
    benefit: u.benefit || '',
    criteria: Array.isArray(u.criteria) ? u.criteria.map(String) : [],
    status: 'draft',
  }));
  if (!stories.length) throw new LLMError('No user stories came back. Try again.');
  s.setUserStories(stories);
}

interface ModelOut {
  entities: { name: string; type?: string; fields?: { name: string; type: string; pk?: boolean; fk?: boolean }[]; methods?: string[] }[];
  relationships: { from: string; to: string; label?: string; cardinalityFrom?: string; cardinalityTo?: string }[];
}

/** Grid layout sized to each node's content so cards don't overlap. */
function layoutNodes(entities: ModelOut['entities']): UMLNode[] {
  const COLS = 3;
  const COL_W = 320;
  const GAP_Y = 70;
  const nodeHeight = (e: ModelOut['entities'][number]) => 48 + (e.fields?.length || 0) * 28 + (e.methods?.length ? 12 + e.methods.length * 16 : 0);
  const nodes: UMLNode[] = [];
  let y = 50;
  for (let row = 0; row * COLS < entities.length; row++) {
    const rowItems = entities.slice(row * COLS, row * COLS + COLS);
    rowItems.forEach((e, col) => {
      nodes.push({
        id: `node-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: e.name,
        type: oneOf(e.type, ['entity', 'actor', 'service'] as const, 'entity'),
        x: 60 + col * COL_W,
        y,
        fields: (e.fields || []).map((f) => ({ name: f.name, type: f.type, pk: !!f.pk, fk: !!f.fk })),
        methods: (e.methods || []).map((m) => (m.endsWith(')') ? m : `${m}()`)),
      });
    });
    y += Math.max(...rowItems.map(nodeHeight)) + GAP_Y;
  }
  return nodes;
}

async function generateModel() {
  const s = useStore.getState();
  const out = await askJSON<ModelOut>(`${context({ reqs: true, stories: true })}

Design the domain model (ER / class diagram) that supports these requirements and stories.
Return JSON:
{
  "entities": [
    { "name": "PascalCaseName", "type": "entity" | "actor" | "service", "fields": [ { "name": "id", "type": "UUID", "pk": true }, { "name": "ownerId", "type": "UUID", "fk": true }, { "name": "title", "type": "VARCHAR" } ], "methods": ["approve()", "close()"] }
  ],
  "relationships": [
    { "from": "EntityName", "to": "OtherEntity", "label": "verb phrase", "cardinalityFrom": "1", "cardinalityTo": "0..*" }
  ]
}
Rules: 5 to 8 entities; 3 to 6 fields each with SQL-style types; every entity has a primary key;
foreign keys match the relationships; 0 to 2 methods per entity; relationships reference entity names exactly.`);

  if (!out.entities?.length) throw new LLMError('No entities came back. Try again.');
  const nodes = layoutNodes(out.entities);
  const byName = new Map(nodes.map((n) => [n.name.toLowerCase(), n.id]));
  const edges: UMLEdge[] = (out.relationships || [])
    .map((r, i) => ({
      id: `e${i + 1}`,
      from: byName.get(r.from?.toLowerCase()) || '',
      to: byName.get(r.to?.toLowerCase()) || '',
      label: r.label || '',
      cardinalityFrom: r.cardinalityFrom || '1',
      cardinalityTo: r.cardinalityTo || '0..*',
    }))
    .filter((e) => e.from && e.to && e.from !== e.to);
  s.setUMLNodes(nodes);
  s.setUMLEdges(edges);
}

async function generateArchitecture() {
  const s = useStore.getState();
  const out = await askJSON<Partial<ArchRecommendation>>(`${context({ reqs: true, model: true })}

Recommend a software architecture for this system. Ground the choice in the Non-Functional requirements and the expected scale;
prefer the simplest pattern that satisfies them (a modular monolith is a valid answer).
Return JSON:
{
  "pattern": "e.g. Modular Monolith, Event-Driven Microservices, Serverless, Layered",
  "rationale": "3-4 sentences referencing specific requirement ids",
  "components": [ { "name": "Component", "tech": "Concrete technology", "purpose": "What it does" } ],
  "tradeoffs": [ { "pro": "benefit", "con": "matching cost" } ]
}
Rules: 5 to 8 components with concrete technologies; exactly 3 trade-offs.`);

  if (!out.pattern) throw new LLMError('No architecture came back. Try again.');
  s.setArchitecture({
    pattern: out.pattern,
    rationale: out.rationale || '',
    components: (out.components || []).map((c) => ({ name: c.name, tech: c.tech, purpose: c.purpose })),
    tradeoffs: (out.tradeoffs || []).map((t) => ({ pro: t.pro, con: t.con })),
  });
}

async function generateApi() {
  const s = useStore.getState();
  const { text } = await complete({
    system: SYSTEM,
    temperature: 0.4,
    maxTokens: 16384,
    messages: [
      {
        role: 'user',
        content: `${context({ reqs: true, stories: true, model: true, arch: true })}

Write an OpenAPI 3.1 specification in YAML for this system's public REST API.
Rules: derive resources from the domain model and operations from the user stories; base paths like /api/v1/<resource>;
include info, servers, paths (each operation with summary, operationId, parameters, requestBody where relevant, and responses)
and components.schemas matching the entities; 8 to 16 operations; keep it under 300 lines; 2-space indentation.
Output ONLY the YAML — no explanation, no code fences.`,
      },
    ],
  });
  const yaml = text.replace(/^```(?:ya?ml)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (!/^openapi:/m.test(yaml)) throw new LLMError('The API specification came back in an unexpected format. Try again.');
  s.setOpenapiYaml(yaml + '\n');
}

async function generateDocs() {
  const s = useStore.getState();
  const out = await askJSON<{ srs: string; sdd: string; readme: string }>(
    `${context({ reqs: true, stories: true, model: true, arch: true })}

Write three Markdown documents for this project.
Return JSON: { "srs": "markdown", "sdd": "markdown", "readme": "markdown" }
- srs: Software Requirements Specification (IEEE 830 style): Introduction (purpose, scope, definitions), Overall description, Functional requirements (cite REQ ids), Non-functional requirements, Constraints.
- sdd: Software Design Document: Architecture overview, Components (from the architecture), Data design (from the domain model), API overview, Deployment.
- readme: project README: one-line summary, features, tech stack, getting started, project structure.
Markdown rules: use #, ##, ### headings, "- " bullets, **bold**, and simple pipe tables; no HTML. Keep each document focused (roughly 300-600 words).`,
    16384,
  );
  const docs: DocSection[] = [
    { id: 'srs', title: 'Software Requirements Specification', type: 'SRS', content: out.srs || '' },
    { id: 'sdd', title: 'Software Design Document', type: 'SDD', content: out.sdd || '' },
    { id: 'readme', title: 'README', type: 'README', content: out.readme || '' },
  ].filter((d) => d.content.trim()) as DocSection[];
  if (!docs.length) throw new LLMError('No documentation came back. Try again.');
  s.setDocs(docs);
}

const RUNNERS: Record<PipelineStage, (opts: PipelineOptions) => Promise<void>> = {
  requirements: generateRequirements,
  stories: generateStories,
  model: generateModel,
  architecture: generateArchitecture,
  api: generateApi,
  docs: generateDocs,
};

// ─── Orchestration ───

export interface PipelineOptions {
  /** New idea to start from; replaces the stored idea */
  idea?: string;
  projectName?: string;
  /** Stages to run (default: all, in order) */
  stages?: PipelineStage[];
  /** Let the model name the project even if it already has a name */
  rename?: boolean;
  /** Post a summary to the assistant chat when finished */
  announce?: boolean;
}

export function isPipelineRunning() {
  return useStore.getState().pipeline.running;
}

export async function runPipeline(opts: PipelineOptions = {}): Promise<boolean> {
  const store = useStore.getState();
  if (store.pipeline.running) return false;

  if (opts.projectName) store.setProjectName(opts.projectName);
  if (opts.idea) store.setProductIdea(opts.idea);
  if (!useStore.getState().productIdea.trim()) {
    store.setPipeline({ error: 'Describe the product idea first.' });
    return false;
  }

  const planned = STAGES.filter((st) => !opts.stages || opts.stages.includes(st));
  store.setPipeline({ running: true, stage: planned[0], planned, done: [], error: null });

  try {
    for (const stage of planned) {
      useStore.getState().setPipeline({ stage });
      await RUNNERS[stage](opts);
      const p = useStore.getState().pipeline;
      useStore.getState().setPipeline({ done: [...p.done, stage] });
    }
    useStore.getState().setPipeline({ running: false, stage: null });
    if (opts.announce !== false) announce(planned);
    return true;
  } catch (err) {
    const failedStage = useStore.getState().pipeline.stage;
    const message = err instanceof LLMError ? err.message : err instanceof Error ? err.message : String(err);
    console.error('[SEOS pipeline]', err);
    useStore.getState().setPipeline({ running: false, error: `${failedStage ? STAGE_LABEL[failedStage] + ': ' : ''}${message}` });
    useStore.getState().addMessage({
      id: `pipeline-${Date.now()}`,
      role: 'assistant',
      content: `❌ **Generation stopped at ${failedStage ? STAGE_LABEL[failedStage] : 'start'}:** ${message}\n\nLayers finished before this point were kept. Ask me to "continue generating" or press Generate again.`,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/** Resume from the first stage that hasn't finished (after an error). */
export function resumePipeline() {
  const { planned, done } = useStore.getState().pipeline;
  const remaining = (planned.length ? planned : STAGES).filter((st) => !done.includes(st));
  return runPipeline({ stages: remaining.length ? remaining : STAGES });
}

function announce(stages: PipelineStage[]) {
  const s = useStore.getState();
  const ops = (s.openapiYaml.match(/^\s{4}(get|post|put|patch|delete):/gm) || []).length;
  const summary: Record<PipelineStage, string> = {
    requirements: `${s.requirements.length} requirements`,
    stories: `${s.userStories.length} user stories`,
    model: `${s.umlNodes.length} entities and ${s.umlEdges.length} relationships`,
    architecture: `a **${s.architecture.pattern}** architecture`,
    api: `${ops} API operations`,
    docs: `${s.docs.length} documents (${s.docs.map((d) => d.type).join(', ')})`,
  };
  s.addMessage({
    id: `pipeline-${Date.now()}`,
    role: 'assistant',
    content: `✅ **${s.projectName}** — generated ${stages.map((st) => summary[st]).join(', ')}.`,
    timestamp: new Date().toISOString(),
  });
}

/** Empty every generated layer so a new idea starts clean. */
export function clearProjectLayers() {
  const s = useStore.getState();
  s.setRequirements([]);
  s.setUserStories([]);
  s.setUMLNodes([]);
  s.setUMLEdges([]);
  s.setOpenapiYaml('');
  s.setDocs([]);
  s.setArchitecture({ pattern: 'None', rationale: 'Provide a project idea to get architecture recommendations.', components: [], tradeoffs: [] });
}
