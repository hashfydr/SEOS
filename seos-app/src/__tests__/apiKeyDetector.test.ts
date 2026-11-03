import { describe, it, expect, beforeEach } from 'vitest';
import { detectApiKeyProvider } from '../lib/apiKeyDetector';
import { useStore } from '../store';

describe('Universal Smart API Key Detector & Auto-Activation', () => {
  beforeEach(() => {
    useStore.getState().resetAllSettings();
  });

  it('correctly identifies NVIDIA NIM API key by nvapi- prefix', () => {
    const key = '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';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('nvidia');
    expect(detected?.providerName).toBe('NVIDIA NIM');
  });

  it('correctly identifies Groq Cloud API key by gsk_ prefix', () => {
    const key = 'gsk_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('groq');
    expect(detected?.providerName).toBe('Groq Cloud');
    expect(detected?.defaultModel).toBe('Llama 3.3 70B');
  });

  it('correctly identifies Google Gemini API key by AIzaSy prefix', () => {
    const key = 'AIzaSyDbZq1234567890abcdefghijklmnopqr';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('gemini');
    expect(detected?.providerName).toBe('Google Gemini');
  });

  it('correctly identifies new Google Gemini API key by AQ. prefix', () => {
    const key = 'AQ.Ab8MockKeyExample1234567890abcdefghijklmnopqrstuv';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('gemini');
    expect(detected?.providerName).toBe('Google Gemini');
  });

  it('correctly identifies Anthropic Claude API key by sk-ant- prefix', () => {
    const key = 'sk-ant-api03-abcdef1234567890xyzABCD';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('anthropic');
    expect(detected?.providerName).toBe('Anthropic Claude');
    expect(detected?.defaultModel).toBe('Claude 3.5 Sonnet');
  });

  it('correctly identifies OpenAI Project API key by sk-proj- prefix', () => {
    const key = 'sk-proj-abcde1234567890fghijABCDE';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('openai');
    expect(detected?.providerName).toBe('OpenAI GPT');
    expect(detected?.defaultModel).toBe('GPT-4o');
  });

  it('correctly identifies standard OpenAI Secret Key by sk- prefix', () => {
    const key = 'sk-1234567890abcdefghijklmnopqrstuv';
    const detected = detectApiKeyProvider(key);
    expect(detected).not.toBeNull();
    expect(detected?.provider).toBe('openai');
    expect(detected?.defaultModel).toBe('GPT-4o');
  });

  it('returns null for empty, invalid, or too short strings', () => {
    expect(detectApiKeyProvider('')).toBeNull();
    expect(detectApiKeyProvider('   ')).toBeNull();
    expect(detectApiKeyProvider('sk-short')).toBeNull();
    expect(detectApiKeyProvider('invalid-key-token')).toBeNull();
  });

  it('autoSetApiKey dynamically routes to provider, stores key in memory, and activates model', () => {
    const { autoSetApiKey } = useStore.getState();

    const geminiKey = 'AIzaSyTestKey9876543210zyxwvutsrqponmlkj';
    const res = autoSetApiKey(geminiKey);

    expect(res).not.toBeNull();
    expect(res?.provider).toBe('gemini');
    expect(useStore.getState().selectedProvider).toBe('gemini');
    expect(useStore.getState().apiKeys.gemini).toBe(geminiKey);
    expect(useStore.getState().activeModel).toBe('Gemini 1.5 Flash');
    expect(useStore.getState().settings.ai.provider).toBe('gemini');

    // Now switch with Anthropic key
    const claudeKey = 'sk-ant-api03-test-claude-key-999';
    const res2 = autoSetApiKey(claudeKey);

    expect(res2?.provider).toBe('anthropic');
    expect(useStore.getState().selectedProvider).toBe('anthropic');
    expect(useStore.getState().apiKeys.anthropic).toBe(claudeKey);
    expect(useStore.getState().activeModel).toBe('Claude 3.5 Sonnet');
    expect(useStore.getState().settings.ai.provider).toBe('anthropic');

    // Now switch with Groq key
    const groqKey = 'gsk_testgroqkey1234567890abcdefghijklmnopqrstuvwxyz';
    const res3 = autoSetApiKey(groqKey);

    expect(res3?.provider).toBe('groq');
    expect(useStore.getState().selectedProvider).toBe('groq');
    expect(useStore.getState().apiKeys.groq).toBe(groqKey);
    expect(useStore.getState().activeModel).toBe('Llama 3.3 70B');
    expect(useStore.getState().settings.ai.provider).toBe('groq');

    // Now switch with NVIDIA NIM key
    const nvidiaKey = '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';
    const res4 = autoSetApiKey(nvidiaKey);

    expect(res4?.provider).toBe('nvidia');
    expect(useStore.getState().selectedProvider).toBe('nvidia');
    expect(useStore.getState().apiKeys.nvidia).toBe(nvidiaKey);
    expect(useStore.getState().settings.ai.provider).toBe('nvidia');
  });
});
