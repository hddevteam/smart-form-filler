// Model discovery utilities for the background script
// Auto-discovers local Ollama models without requiring any saved configuration.

export type ModelItem = {
  id: string;
  name?: string;
  description?: string;
  source?: string; // e.g., 'ollama' for local models
};

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type FetchInit = { method?: string; headers?: Record<string, string>; body?: string } | undefined;
type FetchLike = (input: string, init?: FetchInit) => Promise<FetchResponse>;

function getFetch(): FetchLike | undefined {
  const g = globalThis as { fetch?: unknown };
  if (typeof g.fetch === 'function') {
    const bound = (g.fetch as (input: string, init?: unknown) => Promise<unknown>).bind(globalThis);
    return bound as unknown as FetchLike;
  }
  return undefined;
}

// Ollama: GET /api/tags returns list of local models
// Docs: https://github.com/ollama/ollama/blob/main/docs/api.md#list-local-models
export async function fetchOllamaModels(baseUrl = 'http://localhost:11434'): Promise<ModelItem[]> {
  const f = getFetch();
  if (!f) return [];
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
    // eslint-disable-next-line no-console
    console.debug('[modelDiscovery] Fetching Ollama tags:', url);
    const res = await f(url, { method: 'GET' });
    // eslint-disable-next-line no-console
    console.debug('[modelDiscovery] Ollama /api/tags status:', res.ok, res.status);
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn('[modelDiscovery] Non-OK response from Ollama:', res.status);
      return [];
    }
    const data = (await res.json()) as { models?: Array<{ name?: string; details?: unknown }> };
    const models = Array.isArray(data?.models) ? data.models : [];
    const mapped = models
      .filter(m => typeof m?.name === 'string' && !!m.name)
      .map(m => ({ id: `ollama:${m.name as string}`, name: m.name as string, source: 'ollama' }));
    // eslint-disable-next-line no-console
    console.debug(
      '[modelDiscovery] Discovered Ollama models:',
      mapped.map(m => m.id)
    );
    return mapped;
  } catch {
    // eslint-disable-next-line no-console
    console.error('[modelDiscovery] Failed to fetch Ollama models');
    return [];
  }
}

export async function getAvailableModelsAuto(): Promise<ModelItem[]> {
  // For now, only auto-discover Ollama. Cloud models can be provided via separate flows.
  const local = await fetchOllamaModels();
  // eslint-disable-next-line no-console
  console.debug('[modelDiscovery] getAvailableModelsAuto -> count:', local.length);
  return local;
}
