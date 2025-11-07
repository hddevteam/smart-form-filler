import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchModels, healthCheck } from '@/popup/apis/backend';

describe('popup/apis/backend', () => {
  const originalFetch = (globalThis as any).fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).fetch = vi.fn();
  });

  it('fetchModels returns data on 200', async () => {
    (globalThis as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue([{ id: 'g1', name: 'GPT' }]),
    });
    const data = await fetchModels('http://localhost:3001');
    expect(data).toEqual([{ id: 'g1', name: 'GPT' }]);
  });

  it('fetchModels returns [] on error', async () => {
    (globalThis as any).fetch.mockResolvedValue({ ok: false, status: 500, json: vi.fn() });
    const data = await fetchModels('http://localhost:3001');
    expect(data).toEqual([]);
  });

  it('healthCheck success true on 200 + success payload', async () => {
    (globalThis as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    const res = await healthCheck('http://localhost:3001');
    expect(res).toEqual({ success: true });
  });

  it('healthCheck returns error on non-200', async () => {
    (globalThis as any).fetch.mockResolvedValue({ ok: false, status: 404, json: vi.fn() });
    const res = await healthCheck('http://localhost:3001');
    expect(res.success).toBe(false);
    expect(res.error).toContain('HTTP');
  });

  it('healthCheck returns network error on exception', async () => {
    (globalThis as any).fetch.mockRejectedValue(new Error('boom'));
    const res = await healthCheck('http://localhost:3001');
    expect(res.success).toBe(false);
    expect(res.error).toContain('boom');
  });

  it('restores fetch', () => {
    (globalThis as any).fetch = originalFetch;
    expect((globalThis as any).fetch).toBe(originalFetch);
  });
});
