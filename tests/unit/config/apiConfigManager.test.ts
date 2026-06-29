import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal type for test
type ApiConfig = {
  provider: 'azure' | 'ollama';
  name: string;
  endpoint: string;
  apiKey?: string;
  model?: string;
};

// We'll implement the real manager later; for now use dynamic import path
import('@/config/apiConfigManager').catch(() => undefined);

describe('ApiConfigManager (TDD)', () => {
  let storage: typeof chrome.storage.local;

  beforeEach(() => {
    storage = chrome.storage.local;
    vi.clearAllMocks();
    storage.get = vi.fn().mockResolvedValue({});
    storage.set = vi.fn().mockResolvedValue(undefined);
    storage.remove = vi.fn().mockResolvedValue(undefined);
  });

  it('should save and retrieve Azure config with encrypted key', async () => {
    const { ApiConfigManager } = await import('@/config/apiConfigManager');
    const mgr = new ApiConfigManager();
    const cfg: ApiConfig = {
      provider: 'azure',
      name: 'My Azure',
      endpoint: 'https://example.azure.com',
      apiKey: 'sk-test',
      model: 'gpt-4o',
    };

    await mgr.saveConfig(cfg);

    // Ensure storage.set called with encrypted key
    expect(storage.set).toHaveBeenCalled();
    const args = (storage.set as any).mock.calls[0][0];
    const stored = args['apiConfigs'];
    expect(stored['My Azure'].apiKey).not.toBe('sk-test');

    const loaded = await mgr.getConfig('My Azure');
    expect(loaded?.apiKey).toBe('sk-test');
  });

  it('should reject invalid config', async () => {
    const { ApiConfigManager } = await import('@/config/apiConfigManager');
    const mgr = new ApiConfigManager();
    const invalid = { provider: 'invalid', name: '', endpoint: '' } as unknown as ApiConfig;
    await expect(mgr.saveConfig(invalid)).rejects.toThrow();
  });

  it('should delete config', async () => {
    const { ApiConfigManager } = await import('@/config/apiConfigManager');
    const mgr = new ApiConfigManager();
    const cfg: ApiConfig = {
      provider: 'ollama',
      name: 'Local',
      endpoint: 'http://localhost:11434',
    };
    await mgr.saveConfig(cfg);
    await mgr.deleteConfig('Local');

    // Simulate storage response after deletion
    (storage.get as any).mockResolvedValueOnce({ apiConfigs: {} });
    const loaded = await mgr.getConfig('Local');
    expect(loaded).toBeUndefined();
  });
});
