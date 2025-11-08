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

  it('returns raw ChatResponse when background sends direct response', async () => {
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
    const res = await client.sendAIRequest(options);
    expect(res).toEqual(mockResp);
  });

  it('unwraps { success, data } when background wraps response', async () => {
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
      setTimeout(() => cb?.({ success: true, data: mockData }), 0);
      return undefined;
    }) as any as typeof chrome.runtime.sendMessage);

    const options = { apiUrl: 'http://y', model: 'm2', messages: [] } as MakeRequestOptions;
    const res = await client.sendAIRequest(options);
    expect(res).toEqual(mockData);
  });
});
