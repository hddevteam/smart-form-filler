// Backend API helpers used by popup components
export type ModelItem = {
  id: string;
  name?: string;
  description?: string;
  source?: string; // e.g., 'ollama' for local models
};

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type FetchInit = { method?: string } | undefined;
type FetchLike = (input: string, init?: FetchInit) => Promise<FetchResponse>;

function getFetch(): FetchLike | undefined {
  const g = globalThis as { fetch?: unknown };
  if (typeof g.fetch === 'function') {
    const bound = (g.fetch as (input: string, init?: unknown) => Promise<unknown>).bind(globalThis);
    return bound as unknown as FetchLike;
  }
  return undefined;
}

export async function fetchModels(baseUrl?: string): Promise<ModelItem[]> {
  if (!baseUrl) return [];
  const f = getFetch();
  if (!f) return [];
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/extension/models`;
    const res = await f(url);
    if (!res.ok) return [];
    const data = (await res.json()) as ModelItem[];
    if (!Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

export async function healthCheck(baseUrl: string): Promise<{ success: boolean; error?: string }> {
  const f = getFetch();
  if (!f) return { success: false, error: 'fetch unavailable' };
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/extension/health`;
    const res = await f(url, { method: 'GET' });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { success?: boolean };
    return { success: !!data?.success };
  } catch (error) {
    const msg = (error as { message?: string })?.message ?? 'network error';
    return { success: false, error: msg };
  }
}
