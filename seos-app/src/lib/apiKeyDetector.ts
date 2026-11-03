import type { LLMProvider } from '../types';

export interface DetectedApiKey {
  provider: LLMProvider;
  providerName: string;
  defaultModel: string;
  formatDescription: string;
  confidence: 'high' | 'medium';
}

/**
 * Automatically inspects the character structure, prefix, and pattern of a raw
 * API key string to determine whether it belongs to NVIDIA NIM, Groq, Google Gemini, OpenAI, or Anthropic.
 */
export function detectApiKeyProvider(rawKey: string): DetectedApiKey | null {
  const key = rawKey.trim();
  if (!key || key.length < 15) return null;

  // 1. NVIDIA NIM / AI Foundation: starts with "nvapi-"
  if (key.startsWith('nvapi-')) {
    return {
      provider: 'nvidia',
      providerName: 'NVIDIA NIM',
      defaultModel: 'NVIDIA NIM (Llama / Mistral)',
      formatDescription: 'NVIDIA NIM API Key (nvapi-*)',
      confidence: 'high',
    };
  }

  // 2. Groq Cloud: always starts with "gsk_"
  if (key.startsWith('gsk_')) {
    return {
      provider: 'groq',
      providerName: 'Groq Cloud',
      defaultModel: 'Llama 3.3 70B',
      formatDescription: 'Groq Cloud API Key (gsk_*)',
      confidence: 'high',
    };
  }

  // 3. Anthropic Claude: always starts with "sk-ant-"
  if (key.startsWith('sk-ant-')) {
    return {
      provider: 'anthropic',
      providerName: 'Anthropic Claude',
      defaultModel: 'Claude 3.5 Sonnet',
      formatDescription: 'Anthropic Claude API Key (sk-ant-*)',
      confidence: 'high',
    };
  }

  // 4. Google Gemini: legacy format "AIzaSy" (39 chars) or new format "AQ."
  if (key.startsWith('AIzaSy') || key.startsWith('AIza') || key.startsWith('AQ.')) {
    return {
      provider: 'gemini',
      providerName: 'Google Gemini',
      defaultModel: 'Gemini 1.5 Flash',
      formatDescription: 'Google AI Studio / Gemini API Key (AIzaSy* / AQ.*)',
      confidence: 'high',
    };
  }

  // 5. OpenAI GPT:
  // - Project keys: "sk-proj-*"
  // - Service account / Admin keys: "sk-admin-*"
  // - Legacy / User keys: "sk-*" (and not sk-ant- / sk-or-)
  if (key.startsWith('sk-proj-') || key.startsWith('sk-admin-')) {
    return {
      provider: 'openai',
      providerName: 'OpenAI GPT',
      defaultModel: 'GPT-4o',
      formatDescription: 'OpenAI Project API Key (sk-proj-*)',
      confidence: 'high',
    };
  }

  if (key.startsWith('sk-') && !key.startsWith('sk-or-')) {
    return {
      provider: 'openai',
      providerName: 'OpenAI GPT',
      defaultModel: 'GPT-4o',
      formatDescription: 'OpenAI Secret API Key (sk-*)',
      confidence: 'high',
    };
  }

  // 6. Fallback heuristic: 39-character alphanumeric base64url string without "sk-" is typically Google Cloud/Gemini
  if (key.length === 39 && /^[A-Za-z0-9_-]{39}$/.test(key)) {
    return {
      provider: 'gemini',
      providerName: 'Google Gemini',
      defaultModel: 'Gemini 1.5 Flash',
      formatDescription: 'Google Gemini API Key (39-char pattern)',
      confidence: 'medium',
    };
  }

  return null;
}

export interface KeyValidationResult {
  detected: DetectedApiKey | null;
  isValid: boolean;
  statusMessage: string;
  modelsFound?: number;
}

/**
 * Live Online API Key Verifier:
 * Queries the remote provider endpoints in real time to verify authentication,
 * check whether the key is active in provider catalogs, and inspect available models.
 */
export async function validateApiKeyOnline(rawKey: string): Promise<KeyValidationResult> {
  const key = rawKey.trim();
  const detected = detectApiKeyProvider(key);

  if (detected?.provider === 'nvidia') {
    try {
      let resp = await fetch('/api/nvidia/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!resp.ok) {
        resp = await fetch('https://integrate.api.nvidia.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
      }
      if (resp.ok) {
        const data = await resp.json();
        const count = data.data?.length || 0;
        return {
          detected,
          isValid: true,
          modelsFound: count,
          statusMessage: `[✓ Verified] NVIDIA NIM Key Authenticated (${count} catalog models found)`,
        };
      }
      if (resp.status === 401) {
        return {
          detected,
          isValid: false,
          statusMessage: '[❌ Error] NVIDIA NIM rejected this key (401 Unauthorized)',
        };
      }
    } catch {
      // offline / network fallback
    }
    return {
      detected,
      isValid: true,
      statusMessage: `[✓ Identified] NVIDIA NIM API Key`,
    };
  }

  if (detected?.provider === 'groq') {
    try {
      let resp = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!resp.ok) {
        resp = await fetch('/api/groq/openai/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
      }
      if (resp.ok) {
        const data = await resp.json();
        const count = data.data?.length || 0;
        return {
          detected,
          isValid: true,
          modelsFound: count,
          statusMessage: `[✓ Verified] Groq Cloud Key Authenticated (${count} models found)`,
        };
      }
      if (resp.status === 401) {
        return {
          detected,
          isValid: false,
          statusMessage: '[❌ Error] Groq rejected this key (401 Invalid API Key)',
        };
      }
    } catch {
      // offline fallback
    }
    return {
      detected,
      isValid: true,
      statusMessage: `[✓ Identified] Groq Cloud API Key`,
    };
  }

  if (detected?.provider === 'gemini') {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=5`);
      if (resp.ok) {
        return {
          detected,
          isValid: true,
          statusMessage: '[✓ Verified] Google Gemini Key Authenticated',
        };
      }
      if (resp.status === 400 || resp.status === 403) {
        return {
          detected,
          isValid: false,
          statusMessage: '[❌ Error] Gemini rejected this key (400/403 Invalid API Key)',
        };
      }
    } catch {
      // offline
    }
    return {
      detected,
      isValid: true,
      statusMessage: `[✓ Identified] Google Gemini API Key`,
    };
  }

  if (detected?.provider === 'openai') {
    try {
      const resp = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (resp.ok) {
        return {
          detected,
          isValid: true,
          statusMessage: '[✓ Verified] OpenAI Key Authenticated',
        };
      }
      if (resp.status === 401) {
        return {
          detected,
          isValid: false,
          statusMessage: '[❌ Error] OpenAI rejected this key (401 Invalid API Key)',
        };
      }
    } catch {
      // offline
    }
    return {
      detected,
      isValid: true,
      statusMessage: `[✓ Identified] OpenAI API Key`,
    };
  }

  // Active live probe across known provider endpoints for unrecognized keys
  if (key.length >= 20) {
    try {
      const r = await fetch('/api/nvidia/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      if (r.ok) {
        return {
          detected: {
            provider: 'nvidia',
            providerName: 'NVIDIA NIM',
            defaultModel: 'NVIDIA NIM (Llama / Mistral)',
            formatDescription: 'Verified via live NVIDIA NIM endpoint probe',
            confidence: 'high',
          },
          isValid: true,
          statusMessage: '[✓ Live Probed] Verified on NVIDIA NIM Database',
        };
      }
    } catch {}

    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      if (r.ok) {
        return {
          detected: {
            provider: 'groq',
            providerName: 'Groq Cloud',
            defaultModel: 'Llama 3.1 8B',
            formatDescription: 'Verified via live Groq endpoint probe',
            confidence: 'high',
          },
          isValid: true,
          statusMessage: '[✓ Live Probed] Verified on Groq Cloud Database',
        };
      }
    } catch {}

    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=1`);
      if (r.ok) {
        return {
          detected: {
            provider: 'gemini',
            providerName: 'Google Gemini',
            defaultModel: 'Gemini 1.5 Flash',
            formatDescription: 'Verified via live Gemini endpoint probe',
            confidence: 'high',
          },
          isValid: true,
          statusMessage: '[✓ Live Probed] Verified on Google Gemini Database',
        };
      }
    } catch {}
  }

  return {
    detected: null,
    isValid: false,
    statusMessage: 'Unrecognized key (not found in NVIDIA, Groq, Gemini, or OpenAI catalogs)',
  };
}
