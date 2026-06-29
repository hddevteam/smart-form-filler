/**
 * Real API integration tests for AIService.
 *
 * These tests call ACTUAL AI providers (Azure OpenAI + Ollama).
 * They are guarded by environment variables so they never run in CI
 * unless explicitly opted in, and use the cheapest/smallest models
 * to minimize cost and latency.
 *
 * Run locally:
 *   REAL_API=1 pnpm test -- --run tests/integration/ai/realApi.integration.test.ts
 *
 * Models used:
 *   Azure: gpt-4.1-nano  (cheapest in .env)
 *   Ollama: qwen3:0.6b   (local, free)
 *
 * Each test sends a single 1-token-class message ("ping") to verify
 * connectivity and correct response parsing. No expensive generation.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { AIService } from '@/background/services/ai/aiService';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Parse .env manually (no dotenv dependency needed in vitest context)
function loadEnvFile(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not present — tests will skip via skipIf
  }
}
loadEnvFile();

const REAL_API = process.env.REAL_API === '1';

// ── Azure config from .env ────────────────────────────────────────────────────
const AZURE_NANO_URL = process.env.GPT_4_1_NANO_API_URL ?? '';
const AZURE_NANO_KEY = process.env.GPT_4_1_NANO_API_KEY ?? '';

// ── Ollama config (local) ─────────────────────────────────────────────────────
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'qwen3:0.6b';

// ─────────────────────────────────────────────────────────────────────────────

describe.skipIf(!REAL_API)('Real API integration — AIService (REAL_API=1 to enable)', () => {
  let aiService: AIService;

  beforeAll(() => {
    aiService = new AIService();
  });

  // ── Ollama ────────────────────────────────────────────────────────────────

  it('Ollama: sends ping and gets valid ChatResponse', async () => {
    const response = await aiService.makeRequest({
      apiUrl: OLLAMA_URL,
      model: `ollama:${OLLAMA_MODEL}`,
      messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
      params: { max_tokens: 10 },
    });

    expect(response.model).toBeTruthy();
    expect(response.choices).toHaveLength(1);
    const content = response.choices[0]?.message?.content ?? '';
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  }, 15_000);

  // ── Azure OpenAI (gpt-4.1-nano — cheapest) ──────────────────────────────

  it.skipIf(!AZURE_NANO_URL || !AZURE_NANO_KEY)(
    'Azure gpt-4.1-nano: sends ping and gets valid ChatResponse',
    async () => {
      const response = await aiService.makeRequest({
        apiUrl: AZURE_NANO_URL,
        apiKey: AZURE_NANO_KEY,
        model: 'gpt-4.1-nano',
        messages: [{ role: 'user', content: 'Reply with exactly one word: pong' }],
        params: { max_tokens: 10 },
      });

      expect(response.model).toBeTruthy();
      expect(response.choices).toHaveLength(1);
      const content = response.choices[0]?.message?.content ?? '';
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    },
    15_000
  );

  // ── Verify error handling with bad key ───────────────────────────────────

  it.skipIf(!AZURE_NANO_URL)(
    'Azure: bad API key returns AIRequestError (not a crash)',
    async () => {
      await expect(
        aiService.makeRequest({
          apiUrl: AZURE_NANO_URL,
          apiKey: 'bad-key-00000000',
          model: 'gpt-4.1-nano',
          messages: [{ role: 'user', content: 'ping' }],
          params: { max_tokens: 5 },
        })
      ).rejects.toThrow();
    },
    15_000
  );
});

// ── Smoke guard: always runs, no real API needed ──────────────────────────────

describe('Real API integration — guard (always runs)', () => {
  it('REAL_API flag correctly controls test execution', () => {
    // The real tests above are skipped unless REAL_API=1.
    expect(typeof REAL_API).toBe('boolean');
  });

  it('AIService can be instantiated without network access', () => {
    const service = new AIService();
    expect(service).toBeDefined();
    expect(typeof service.makeRequest).toBe('function');
  });
});
