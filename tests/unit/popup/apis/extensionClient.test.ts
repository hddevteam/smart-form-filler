import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtensionClient } from '@/popup/apis/extensionClient';
import { fetchOllamaModels } from '@/extension/modelDiscovery';

vi.mock('@/extension/modelDiscovery', () => ({
  fetchOllamaModels: vi
    .fn()
    .mockResolvedValue([{ id: 'ollama:test', name: 'Test Model', source: 'ollama' }]),
}));

const fetchOllamaModelsMock = vi.mocked(fetchOllamaModels);

describe('ExtensionClient error handling', () => {
  let originalChrome: typeof chrome | undefined;

  beforeEach(() => {
    originalChrome = (globalThis as { chrome?: typeof chrome }).chrome;
    const sendMessage = vi.fn();
    const storageLocal = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof chrome.storage.local;
    const runtime = {
      sendMessage,
      lastError: undefined,
    } as unknown as typeof chrome.runtime;
    const chromeMock = {
      runtime,
      storage: { local: storageLocal },
    } as unknown as typeof chrome;
    (globalThis as { chrome?: typeof chrome }).chrome = chromeMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
    if (originalChrome) {
      (globalThis as { chrome?: typeof chrome }).chrome = originalChrome;
    } else {
      delete (globalThis as { chrome?: typeof chrome }).chrome;
    }
  });

  it('falls back to local model discovery when runtime reports lastError', async () => {
    const sendMessage = vi.fn((_message: unknown, callback: (resp: unknown) => void) => {
      const runtime = globalThis.chrome.runtime as unknown as {
        lastError?: { message: string };
      };
      runtime.lastError = { message: 'Service worker unavailable' };
      callback(undefined);
      delete runtime.lastError;
    });
    Object.assign(globalThis.chrome.runtime as unknown as Record<string, unknown>, {
      sendMessage,
    });

    const client = new ExtensionClient();
    const models = await client.getAvailableModels();

    expect(sendMessage).toHaveBeenCalledWith(
      { action: 'getAvailableModels' },
      expect.any(Function)
    );
    expect(fetchOllamaModelsMock).toHaveBeenCalledTimes(1);
    expect(models).toEqual([{ id: 'ollama:test', name: 'Test Model', source: 'ollama' }]);
  });

  it('propagates AI request errors with background logs', async () => {
    const logs = ['Attempt 1 failed', 'Attempt 2 failed'];
    const sendMessage = vi.fn((_message: unknown, callback: (resp: unknown) => void) => {
      callback({ success: false, error: 'AI request failed', logs });
    });
    Object.assign(globalThis.chrome.runtime as unknown as Record<string, unknown>, {
      sendMessage,
    });

    const client = new ExtensionClient();

    await expect(
      client.sendAIRequest({
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'ollama:test',
        messages: [{ role: 'user', content: 'ping' }],
      } as any)
    ).rejects.toMatchObject({ message: 'AI request failed', logs });
  });
});
