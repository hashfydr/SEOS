/**
 * The SEOS chat assistant. It answers questions about the project and can act
 * on it through tools — most importantly by starting the generation pipeline.
 */

import { useStore } from '../store';
import type { PipelineStage } from '../store';
import type { Requirement, UserStory } from '../types';
import { complete, LLMError, type ChatTurn, type ToolSpec, type ToolCall } from './llm';
import { runPipeline, resumePipeline, isPipelineRunning, clearProjectLayers, STAGES, STAGE_LABEL } from './pipeline';

function systemPrompt(): string {
  const s = useStore.getState();
  const reqs = s.requirements.map((r) => `[${r.id}] (${r.type}, ${r.priority}, ${r.status}) ${r.description}`).join('\n');
  const stories = s.userStories.map((u) => `[${u.id} → ${u.reqId}] As a ${u.role}, I want to ${u.action}, so that ${u.benefit}`).join('\n');
  return `You are the SEOS AI Assistant inside a software engineering workspace.
The workspace holds one connected project: idea → requirements → user stories → system model → architecture → OpenAPI spec → documentation.

CURRENT PROJECT
Name: ${s.projectName}
Idea: ${s.productIdea || '(none yet)'}
Requirements (${s.requirements.length}):
${reqs || '(none yet)'}
User stories (${s.userStories.length}):
${stories || '(none yet)'}
Entities: ${s.umlNodes.map((n) => n.name).join(', ') || '(none yet)'}
Architecture: ${s.architecture.pattern}
Generation in progress: ${s.pipeline.running ? `yes (${s.pipeline.stage})` : 'no'}

TOOLS
- When the user describes something they want to build, call start_project with a specific product name and a 2-4 sentence product description expanded from what they said. This generates every layer.
- To rebuild particular layers after changes, call regenerate_layers.
- If generation stopped with an error and the user asks to continue, call continue_generation.
- Use add_requirement / add_user_story for small additions.
After calling a tool, briefly tell the user what is happening. Otherwise answer concisely, grounded in the project above, citing REQ/US ids where useful.`;
}

const TOOLS: ToolSpec[] = [
  {
    name: 'start_project',
    description: 'Start a new project from an idea: sets the name and description, then generates requirements, user stories, system model, architecture, API spec and documentation.',
    parameters: {
      type: 'object',
      properties: {
        projectName: { type: 'string', description: 'Short, specific product name' },
        productIdea: { type: 'string', description: '2-4 sentence product description expanded from the user request' },
      },
      required: ['projectName', 'productIdea'],
    },
  },
  {
    name: 'regenerate_layers',
    description: 'Regenerate one or more project layers from the layers above them.',
    parameters: {
      type: 'object',
      properties: {
        layers: { type: 'array', items: { type: 'string', enum: STAGES }, description: 'Layers to regenerate' },
      },
      required: ['layers'],
    },
  },
  {
    name: 'continue_generation',
    description: 'Resume generation from the layer where it previously stopped.',
    // Gemini rejects object schemas with no properties
    parameters: { type: 'object', properties: { note: { type: 'string', description: 'Optional note' } } },
  },
  {
    name: 'add_requirement',
    description: 'Add a single requirement to the project.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Next free id, e.g. REQ-113' },
        type: { type: 'string', enum: ['Functional', 'Non-Functional'] },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
        description: { type: 'string', description: '"The system shall …" sentence' },
      },
      required: ['id', 'type', 'priority', 'description'],
    },
  },
  {
    name: 'add_user_story',
    description: 'Add a single user story linked to an existing requirement.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Next free id, e.g. US-113' },
        reqId: { type: 'string' },
        role: { type: 'string' },
        action: { type: 'string' },
        benefit: { type: 'string' },
        criteria: { type: 'array', items: { type: 'string' } },
      },
      required: ['id', 'reqId', 'role', 'action', 'benefit', 'criteria'],
    },
  },
];

function runTool(call: ToolCall): string {
  const store = useStore.getState();
  const a = call.args;
  switch (call.name) {
    case 'start_project': {
      if (isPipelineRunning()) return 'Generation is already running — wait for it to finish.';
      // Fresh project: clear layers so stale ones from a previous idea don't linger
      clearProjectLayers();
      void runPipeline({ projectName: String(a.projectName || ''), idea: String(a.productIdea || '') });
      return `Started generating **${a.projectName}** — watch the layers fill in (progress is shown in the top bar).`;
    }
    case 'regenerate_layers': {
      if (isPipelineRunning()) return 'Generation is already running — wait for it to finish.';
      const layers = (Array.isArray(a.layers) ? a.layers : []).filter((l): l is PipelineStage => STAGES.includes(l as PipelineStage));
      if (!layers.length) return 'No valid layers given.';
      void runPipeline({ stages: layers });
      return `Regenerating ${layers.map((l) => STAGE_LABEL[l]).join(', ')}.`;
    }
    case 'continue_generation': {
      if (isPipelineRunning()) return 'Generation is already running.';
      void resumePipeline();
      return 'Resuming generation from where it stopped.';
    }
    case 'add_requirement': {
      const req: Requirement = {
        id: String(a.id),
        type: a.type === 'Non-Functional' ? 'Non-Functional' : 'Functional',
        priority: (['Critical', 'High', 'Medium', 'Low'].includes(String(a.priority)) ? a.priority : 'Medium') as Requirement['priority'],
        description: String(a.description || ''),
        status: 'draft',
      };
      store.addRequirement(req);
      return `Added requirement ${req.id}.`;
    }
    case 'add_user_story': {
      const story: UserStory = {
        id: String(a.id),
        reqId: String(a.reqId || ''),
        role: String(a.role || ''),
        action: String(a.action || ''),
        benefit: String(a.benefit || ''),
        criteria: Array.isArray(a.criteria) ? a.criteria.map(String) : [],
        status: 'draft',
      };
      store.addUserStory(story);
      return `Added user story ${story.id}.`;
    }
    default:
      return `Unknown action: ${call.name}`;
  }
}

export async function sendChatMessage(userMessage: string): Promise<string> {
  const { messages } = useStore.getState();

  // Last 20 turns; drop our own status/error lines so they don't confuse the model
  let history: ChatTurn[] = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.id.startsWith('pipeline-'))
    .slice(-20)
    .map((m) => ({ role: m.role as ChatTurn['role'], content: m.content }));
  if (!history.length || history[history.length - 1].content !== userMessage) {
    history.push({ role: 'user', content: userMessage });
  }
  // Providers require alternating roles starting with the user
  const turns: ChatTurn[] = [];
  for (const turn of history) {
    const last = turns[turns.length - 1];
    if (last && last.role === turn.role) last.content += '\n\n' + turn.content;
    else turns.push({ ...turn });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  history = turns;

  try {
    const { text, toolCalls } = await complete({ system: systemPrompt(), messages: history, tools: TOOLS, maxTokens: 4096 });
    const results = toolCalls.map(runTool);
    const reply = [text.trim(), ...results].filter(Boolean).join('\n\n');
    return reply || 'Done.';
  } catch (err) {
    const message = err instanceof LLMError || err instanceof Error ? err.message : String(err);
    console.error('[SEOS assistant]', err);
    return `❌ ${message}`;
  }
}
