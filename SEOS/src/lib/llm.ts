/**
 * LLM provider layer for SEOS.
 *
 * One entry point — `complete()` — over OpenAI, Google Gemini and Anthropic,
 * called directly from the browser:
 *   - OpenAI    → https://api.openai.com (browser CORS supported)
 *   - Gemini    → https://generativelanguage.googleapis.com (browser CORS supported)
 *   - Anthropic → proxied through the Vite dev server (see vite.config.ts)
 *
 * Gemini models are retired on a rolling basis, so the model is never
 * hard-coded: we list the models the key can use, rank them, and if a call
 * says a model is unavailable we follow the replacement the error suggests
 * and fall through to the next candidate.
 */

import { useStore } from '../store';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the arguments */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface Completion {
  text: string;
  toolCalls: ToolCall[];
}

export interface CompleteOptions {
  system: string;
  messages: ChatTurn[];
  tools?: ToolSpec[];
  /** Ask the model for a single JSON object (not combinable with tools) */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

/** An error whose message is safe and useful to show the user as-is. */
export class LLMError extends Error {}

export async function complete(opts: CompleteOptions): Promise<Completion> {
  const { apiKeys, selectedProvider } = useStore.getState();
  const apiKey = apiKeys[selectedProvider]?.trim();
  if (!apiKey) {
    throw new LLMError(
      `No API key configured for ${selectedProvider}. Open the assistant, click the model button under the message box, then "Manage API Keys…".`,
    );
  }
  switch (selectedProvider) {
    case 'gemini':
      return completeGemini(apiKey, opts);
    case 'openai':
      return completeOpenAI(apiKey, opts);
    case 'anthropic':
      return completeAnthropic(apiKey, opts);
  }
}

/** Parse a JSON object out of model output, tolerating code fences and stray prose. */
export function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new LLMError('The model did not return JSON. Try again.');
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    throw new LLMError('The model returned malformed JSON (the answer may have been cut off). Try again.');
  }
}

function errorMessage(body: string): string {
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.message || body;
  } catch {
    return body;
  }
}

// ─── Gemini ───

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Session cache: the model that last worked for this key
let geminiModel: { key: string; model: string } | null = null;
let geminiListing: { key: string; models: string[] } | null = null;

// Variants that can't do plain text + function calling
const GEMINI_EXCLUDE = /(image|tts|audio|live|embed|vision|learnlm|gemma|aqa|robotics|computer|native|imagen|veo)/i;

/** Higher is better: newest version first, Flash over Pro (speed + free-tier limits), stable over preview. */
function rankGeminiModel(name: string): number | null {
  if (GEMINI_EXCLUDE.test(name)) return null;
  const m = name.match(/^gemini-(\d+(?:\.\d+)?)-(flash|pro)(-lite)?(-.+)?$/);
  if (!m) return null;
  const [, version, family, lite, suffix] = m;
  let score = parseFloat(version) * 100;
  if (family === 'flash') score += 20;
  if (lite) score -= 15;
  if (suffix) score -= /^-\d{3}$/.test(suffix) ? 1 : 8; // pinned "-001" is fine; preview/exp less so
  return score;
}

async function listGeminiModels(apiKey: string): Promise<string[]> {
  if (geminiListing?.key === apiKey) return geminiListing.models;
  const resp = await fetch(`${GEMINI_BASE}/models?key=${encodeURIComponent(apiKey)}&pageSize=200`);
  if (!resp.ok) {
    const body = await resp.text();
    if (resp.status === 400 || resp.status === 403) {
      throw new LLMError(`Gemini rejected the API key: ${errorMessage(body)}`);
    }
    return [];
  }
  const data = await resp.json();
  const models: string[] = (data.models || [])
    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: { name: string }) => m.name.replace(/^models\//, ''))
    .map((name: string) => ({ name, score: rankGeminiModel(name) }))
    .filter((m: { score: number | null }) => m.score !== null)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .map((m: { name: string }) => m.name);
  geminiListing = { key: apiKey, models };
  return models;
}

/** Model names an error message recommends instead, e.g. "…use models/gemini-3.8-flash…" */
function suggestedModels(body: string, failed: string): string[] {
  return [...body.matchAll(/models\/(gemini-[\w.-]+)/g)]
    .map((m) => m[1].replace(/[.-]+$/, ''))
    .filter((name) => name !== failed);
}

// Models that answered "not available" for this key — skipped on later calls
const retiredGeminiModels = new Set<string>();

// Waits before retrying the same model when Gemini is overloaded (500/503)
const BUSY_RETRY_DELAYS_MS = [2000, 4000, 8000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Seconds Gemini asks us to wait on a 429, from `"retryDelay": "7s"` if present. */
function retryDelaySeconds(body: string): number | null {
  const m = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(parseFloat(m[1])) : null;
}

/**
 * Calls generateContent, working through candidate models:
 * - retired model (404)        → follow the suggested replacement, else next model
 * - overloaded (500/503)       → retry the same model with backoff, then next model
 * - rate limited (429)         → wait if Gemini asks for a short delay, else next model
 *                                (free-tier quotas are per model)
 */
async function callGemini(apiKey: string, body: unknown): Promise<{ model: string; data: any }> {
  const { setLlmNotice } = useStore.getState();
  const listed = await listGeminiModels(apiKey);
  let queue = [
    ...(geminiModel?.key === apiKey ? [geminiModel.model] : []),
    ...listed,
  ];
  if (queue.length === 0) queue = ['gemini-flash-latest'];
  const tried = new Set<string>();
  let lastTransient: 'busy' | 'limited' | null = null;

  try {
    while (queue.length) {
      const model = queue.shift()!;
      if (tried.has(model) || retiredGeminiModels.has(model)) continue;
      tried.add(model);

      for (let attempt = 0; ; attempt++) {
        const resp = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (resp.ok) {
          geminiModel = { key: apiKey, model };
          return { model, data: await resp.json() };
        }

        const errBody = await resp.text();
        const unavailable =
          resp.status === 404 ||
          (resp.status === 400 && /not (found|available|supported)|no longer|deprecated/i.test(errBody));
        if (unavailable) {
          console.warn(`[SEOS LLM] ${model} unavailable, trying next model`);
          retiredGeminiModels.add(model);
          queue = [...suggestedModels(errBody, model), ...queue];
          break;
        }
        if (resp.status === 400 && /api key/i.test(errBody)) {
          throw new LLMError(`Gemini rejected the API key: ${errorMessage(errBody)}`);
        }

        const busy = resp.status === 500 || resp.status === 503;
        if (busy && attempt < BUSY_RETRY_DELAYS_MS.length) {
          const wait = BUSY_RETRY_DELAYS_MS[attempt];
          console.warn(`[SEOS LLM] ${model} overloaded (${resp.status}), retry ${attempt + 1} in ${wait / 1000}s`);
          setLlmNotice(`Gemini is busy — retrying in ${wait / 1000}s (${attempt + 1}/${BUSY_RETRY_DELAYS_MS.length})`);
          await sleep(wait);
          continue;
        }
        if (resp.status === 429) {
          const delay = retryDelaySeconds(errBody);
          if (attempt === 0 && delay !== null && delay <= 15) {
            setLlmNotice(`Gemini rate limit — waiting ${delay}s`);
            await sleep(delay * 1000);
            continue;
          }
        }
        if (busy || resp.status === 429) {
          lastTransient = busy ? 'busy' : 'limited';
          console.warn(`[SEOS LLM] ${model} ${busy ? 'still overloaded' : 'rate limited'}, switching model`);
          setLlmNotice(`${model} is ${busy ? 'overloaded' : 'rate limited'} — switching model…`);
          break;
        }
        throw new LLMError(`Gemini API error ${resp.status}: ${errorMessage(errBody)}`);
      }
    }
  } finally {
    setLlmNotice(null);
  }

  if (lastTransient === 'limited') {
    throw new LLMError('Gemini free-tier rate limit reached on every available model. Wait about a minute, then press Retry.');
  }
  if (lastTransient === 'busy') {
    throw new LLMError('Gemini is overloaded on every available model right now. Wait a moment, then press Retry — finished layers are kept.');
  }
  throw new LLMError(`None of the Gemini models available to this key worked (tried: ${[...tried].join(', ')}).`);
}

async function completeGemini(apiKey: string, opts: CompleteOptions): Promise<Completion> {
  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: opts.system }] },
    contents: opts.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 8192,
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    },
  };
  if (opts.tools?.length) {
    body.tools = [{ function_declarations: opts.tools }];
  }

  const { model, data } = await callGemini(apiKey, body);
  useStore.getState().setActiveModel(model);

  const candidate = data.candidates?.[0];
  const parts: { text?: string; thought?: boolean; functionCall?: { name: string; args?: Record<string, unknown> } }[] =
    candidate?.content?.parts || [];
  if (!parts.length) {
    const reason = candidate?.finishReason || data.promptFeedback?.blockReason || 'no content';
    throw new LLMError(`Gemini returned an empty answer (${reason}). Try rephrasing or try again.`);
  }
  return {
    text: parts.filter((p) => p.text && !p.thought).map((p) => p.text).join(''),
    toolCalls: parts.filter((p) => p.functionCall).map((p) => ({ name: p.functionCall!.name, args: p.functionCall!.args || {} })),
  };
}

// ─── OpenAI ───

const OPENAI_MODEL = 'gpt-4o';

async function completeOpenAI(apiKey: string, opts: CompleteOptions): Promise<Completion> {
  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: [{ role: 'system', content: opts.system }, ...opts.messages],
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 8192,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools.map((t) => ({ type: 'function', function: t }));
    body.tool_choice = 'auto';
  }
  if (opts.json) body.response_format = { type: 'json_object' };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new LLMError(`OpenAI API error ${resp.status}: ${errorMessage(await resp.text())}`);
  }
  const data = await resp.json();
  useStore.getState().setActiveModel(data.model || OPENAI_MODEL);
  const message = data.choices?.[0]?.message;
  return {
    text: message?.content || '',
    toolCalls: (message?.tool_calls || []).map((tc: { function: { name: string; arguments: string } }) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || '{}'),
    })),
  };
}

// ─── Anthropic ───

const ANTHROPIC_MODEL = 'claude-sonnet-5-5';

async function completeAnthropic(apiKey: string, opts: CompleteOptions): Promise<Completion> {
  const body: Record<string, unknown> = {
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 8192,
    system: opts.json ? `${opts.system}\n\nRespond with a single JSON object and nothing else.` : opts.system,
    messages: opts.messages,
  };
  if (opts.tools?.length) {
    body.tools = opts.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
  }

  // Goes through the Vite proxy to avoid CORS (see vite.config.ts)
  const resp = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    throw new LLMError(`Anthropic API error ${resp.status}: ${errorMessage(await resp.text())}`);
  }
  const data = await resp.json();
  useStore.getState().setActiveModel(data.model || ANTHROPIC_MODEL);
  const blocks: { type: string; text?: string; name?: string; input?: Record<string, unknown> }[] = data.content || [];
  return {
    text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join(''),
    toolCalls: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ name: b.name!, args: b.input || {} })),
  };
}
