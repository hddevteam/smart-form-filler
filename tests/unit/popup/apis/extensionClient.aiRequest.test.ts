import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtensionClient } from '@/popup/apis/extensionClient';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';
import type { ChatResponse } from '@/types/ai';

describe('ExtensionClient.sendAIRequest', () => {
  let client: ExtensionClient;

  beforeEach(() => {
    client = new ExtensionClient();
    vi.restoreAllMocks();
  });

  it('returns response and empty logs when background sends direct response', async () => {
    const mockResp: ChatResponse = {
      model: 'test-model',
      choices: [{ message: { role: 'assistant', content: 'hi' } }],
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      msg: unknown,
      optionsOrCb?: unknown,
      maybeCb?: unknown
    ) => {
      // Expect AI_REQUEST action message
      expect((msg as { action?: string }).action).toBe('AI_REQUEST');
      const cb = (typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb) as
        | ((resp: unknown) => void)
        | undefined;
      setTimeout(() => cb?.(mockResp), 0);
      return undefined;
    }) as any as typeof chrome.runtime.sendMessage);

    const options = { apiUrl: 'http://x', model: 'm', messages: [] } as MakeRequestOptions;
    const { response, logs } = await client.sendAIRequest(options);
    expect(response).toEqual(mockResp);
    expect(logs).toEqual([]);
  });

  it('unwraps { success, data, logs } when background wraps response', async () => {
    const mockData: ChatResponse = {
      model: 'wrapped-model',
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      msg: unknown,
      optionsOrCb?: unknown,
      maybeCb?: unknown
    ) => {
      expect((msg as { action?: string }).action).toBe('AI_REQUEST');
      const cb = (typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb) as
        | ((resp: unknown) => void)
        | undefined;
      setTimeout(() => cb?.({ success: true, data: mockData, logs: ['log-1'] }), 0);
      return undefined;
    }) as any as typeof chrome.runtime.sendMessage);

    const options = { apiUrl: 'http://y', model: 'm2', messages: [] } as MakeRequestOptions;
    const { response, logs } = await client.sendAIRequest(options);
    expect(response).toEqual(mockData);
    expect(logs).toEqual(['log-1']);
  });

  it('rejects with error containing logs when background reports failure', async () => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      msg: unknown,
      optionsOrCb?: unknown,
      maybeCb?: unknown
    ) => {
      expect((msg as { action?: string }).action).toBe('AI_REQUEST');
      const cb = (typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb) as
        | ((resp: unknown) => void)
        | undefined;
      setTimeout(() => cb?.({ success: false, error: 'boom', logs: ['err-log'] }), 0);
      return undefined;
    }) as any as typeof chrome.runtime.sendMessage);

    const options = { apiUrl: 'http://z', model: 'm3', messages: [] } as MakeRequestOptions;
    await expect(client.sendAIRequest(options)).rejects.toMatchObject({
      message: 'boom',
      logs: ['err-log'],
    });
  });
});
