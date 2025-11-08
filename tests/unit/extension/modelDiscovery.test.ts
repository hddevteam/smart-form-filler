import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchOllamaModels,
  getAvailableModelsAuto,
  type ModelItem,
} from '../../../src/extension/modelDiscovery';

// Helper to set and restore global fetch
const originalFetch = (globalThis as unknown as { fetch?: unknown }).fetch;

describe('modelDiscovery (Ollama auto-discovery)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore original fetch to avoid leaks across tests
    (globalThis as unknown as { fetch?: unknown }).fetch = originalFetch;
  });

  it('returns mapped models when Ollama /api/tags responds OK', async () => {
    const mockModels = [{ name: 'qwen2.5:7b' }, { name: 'deepseek-r1:7b' }];
    const fetchMock = vi.fn((_input: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ models: mockModels }),
      })
    );
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock as unknown as typeof fetch;

    const list = await fetchOllamaModels();
    expect(Array.isArray(list)).toBe(true);
    expect(list.map(m => m.id)).toEqual(['ollama:qwen2.5:7b', 'ollama:deepseek-r1:7b']);
    expect(list.every(m => m.source === 'ollama')).toBe(true);
    expect(list[0]?.name).toBe('qwen2.5:7b');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:11434/api/tags');
  });

  it('uses provided baseUrl and trims trailing slash', async () => {
    const fetchMock = vi.fn((_input: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ models: [{ name: 'tinyllama' }] }),
      })
    );
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock as unknown as typeof fetch;

    const base = 'http://127.0.0.1:11434/';
    const list = await fetchOllamaModels(base);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'ollama:tinyllama',
      name: 'tinyllama',
      source: 'ollama',
    } satisfies ModelItem);
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:11434/api/tags', { method: 'GET' });
  });

  it('returns empty list when response is non-OK', async () => {
    const fetchMock = vi.fn((_input: string) =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })
    );
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock as unknown as typeof fetch;

    const list = await fetchOllamaModels();
    expect(list).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns empty list when fetch throws', async () => {
    const fetchMock = vi.fn((_input: string) => Promise.reject(new Error('network error')));
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock as unknown as typeof fetch;

    const list = await fetchOllamaModels();
    expect(list).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('getAvailableModelsAuto returns Ollama models discovered locally', async () => {
    const fetchMock = vi.fn((_input: string) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ models: [{ name: 'orca-mini' }] }),
      })
    );
    (globalThis as unknown as { fetch?: unknown }).fetch = fetchMock as unknown as typeof fetch;

    const list = await getAvailableModelsAuto();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('ollama:orca-mini');
    expect(list[0]?.source).toBe('ollama');
  });
});
import { describe as d2, it as i2, expect as e2, vi as vi2, beforeEach as b2 } from 'vitest';
import { fetchOllamaModels as f2, getAvailableModelsAuto as g2 } from '@/extension/modelDiscovery';

function mockFetchOnce(status: number, body: unknown) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
  (globalThis as unknown as { fetch: unknown }).fetch = vi.fn().mockResolvedValue(res);
}

d2('modelDiscovery', () => {
  b2(() => {
    vi2.restoreAllMocks();
    delete (globalThis as unknown as { fetch?: unknown }).fetch;
  });

  i2('fetchOllamaModels returns mapped models when /api/tags provides names', async () => {
    mockFetchOnce(200, { models: [{ name: 'llama3' }, { name: 'qwen2' }] });
    const list = await f2('http://localhost:11434');
    e2(list).toEqual([
      { id: 'ollama:llama3', name: 'llama3', source: 'ollama' },
      { id: 'ollama:qwen2', name: 'qwen2', source: 'ollama' },
    ]);
  });

  i2('fetchOllamaModels returns empty on HTTP error', async () => {
    mockFetchOnce(500, {});
    const list = await f2();
    e2(list).toEqual([]);
  });

  i2('getAvailableModelsAuto returns Ollama models only', async () => {
    mockFetchOnce(200, { models: [{ name: 'llama3' }] });
    const list = await g2();
    e2(list.length).toBe(1);
    e2(list[0]?.source).toBe('ollama');
  });
});
