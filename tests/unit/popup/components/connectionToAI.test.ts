import { describe, it, expect, vi } from 'vitest';
import { ExtensionClient } from '@/popup/apis/extensionClient';
import type { ChatResponse } from '@/types/ai';

describe('Popup -> Background AI_REQUEST integration', () => {
  it('ExtensionClient.sendAIRequest sends runtime message and resolves ChatResponse', async () => {
    const client = new ExtensionClient();

    const mock: ChatResponse = {
      model: 'z',
      choices: [{ message: { role: 'assistant', content: 'hello' } }],
    };

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(((
      _msg: unknown,
      optionsOrCb?: unknown,
      maybeCb?: unknown
    ) => {
      const cb = (typeof optionsOrCb === 'function' ? optionsOrCb : maybeCb) as
        | ((resp: unknown) => void)
        | undefined;
      setTimeout(() => cb?.(mock), 0);
      return undefined;
    }) as any as typeof chrome.runtime.sendMessage);

    const res = await client.sendAIRequest({ apiUrl: 'http://x', model: 'z', messages: [] });
    expect(res).toEqual(mock);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { action: 'AI_REQUEST', options: { apiUrl: 'http://x', model: 'z', messages: [] } },
      expect.any(Function)
    );
  });
});
