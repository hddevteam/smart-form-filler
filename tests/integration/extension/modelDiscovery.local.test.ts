import { describe, it, expect } from 'vitest';
import { fetchOllamaModels } from '../../../src/extension/modelDiscovery';

// Simple connectivity check to localhost Ollama with a short timeout
async function isOllamaReachable(baseUrl: string, timeoutMs = 1500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

describe('modelDiscovery (local integration)', () => {
  it('attempts to fetch models from current host (localhost:11434) when available', async () => {
    const baseUrl = 'http://localhost:11434';
    const reachable = await isOllamaReachable(baseUrl);

    if (!reachable) {
      // Not a failure: environment may not have Ollama running. This test is informational.
      expect(true).toBe(true);
      return;
    }

    const list = await fetchOllamaModels(baseUrl);
    // When reachable, expect an array (possibly non-empty depending on local models)
    expect(Array.isArray(list)).toBe(true);
    // If at least one model exists locally, IDs should start with 'ollama:'
    if (list.length > 0) {
      expect(list[0]?.id.startsWith('ollama:')).toBe(true);
    }
  });
});
