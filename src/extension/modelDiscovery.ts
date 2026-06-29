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
    const res = await f(url, { method: 'GET' });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { models?: Array<{ name?: string; details?: unknown }> };
    const models = Array.isArray(data?.models) ? data.models : [];
    const mapped = models
      .filter(m => typeof m?.name === 'string' && !!m.name)
      .map(m => ({ id: `ollama:${m.name as string}`, name: m.name as string, source: 'ollama' }));
    return mapped;
  } catch {
    return [];
  }
}

export async function getAvailableModelsAuto(): Promise<ModelItem[]> {
  // For now, only auto-discover Ollama. Cloud models can be provided via separate flows.
  const local = await fetchOllamaModels();
  return local;
}
