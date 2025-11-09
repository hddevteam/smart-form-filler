import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OLLAMA_CORS_RULE_ID } from '@/background/services/ai/ollamaCorsBypass';

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Background message routing integration', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let updateDynamicRules: ReturnType<typeof vi.fn>;
  let getDynamicRules: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    fetchMock = vi.fn<[], Promise<FetchResponse>>().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        model: 'phi3',
        message: { role: 'assistant', content: 'pong' },
      }),
      text: vi.fn().mockResolvedValue(''),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    updateDynamicRules = vi.fn().mockResolvedValue(undefined);
    getDynamicRules = vi.fn().mockResolvedValue([{ id: OLLAMA_CORS_RULE_ID }]);
    globalThis.chrome.declarativeNetRequest = {
      updateDynamicRules,
      getDynamicRules,
    } as unknown as typeof chrome.declarativeNetRequest;
  });

  it('routes AI_REQUEST messages via runtime listener and inspects dynamic rules', async () => {
    await import('@/background/index');
    await flushPromises();

    expect(updateDynamicRules).toHaveBeenCalledTimes(1);
    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: unknown[][] };
    };
    expect(addListenerMock.mock.calls.length).toBeGreaterThan(0);
    const [listenerArgs] = addListenerMock.mock.calls;
    if (!listenerArgs?.[0]) {
      throw new Error('background listener not registered');
    }
    const listener = listenerArgs[0] as Parameters<typeof chrome.runtime.onMessage.addListener>[0];

    let responsePayload: unknown;
    const sendResponse = vi.fn((payload: unknown) => {
      responsePayload = payload;
    });

    const done = new Promise<void>(resolve => {
      sendResponse.mockImplementation((payload: unknown) => {
        responsePayload = payload;
        resolve();
      });
    });

    const message = {
      type: 'AI_REQUEST',
      options: {
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'ollama:phi3',
        messages: [{ role: 'user', content: 'ping' }],
      },
    } as const;

    const listenerReturn = listener(
      message,
      { id: 'popup-script' } as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(listenerReturn).toBe(true);

    await done;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
      })
    );

    const firstFetchCall = fetchMock.mock.calls[0];
    if (!firstFetchCall) {
      throw new Error('fetch call missing');
    }
    const [, fetchOptions] = firstFetchCall as [string, RequestInit];
    const body = JSON.parse((fetchOptions.body as string) ?? '{}');
    expect(body.model).toBe('phi3');
    expect(body.stream).toBe(false);

    expect(responsePayload).toEqual({
      model: 'phi3',
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'pong',
          },
        },
      ],
    });
    expect(getDynamicRules).toHaveBeenCalledWith({ ruleIds: [OLLAMA_CORS_RULE_ID] });
  });

  it('responds with error payload for unknown message types', async () => {
    await import('@/background/index');
    await flushPromises();

    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: unknown[][] };
    };
    const [listenerArgs] = addListenerMock.mock.calls;
    if (!listenerArgs?.[0]) {
      throw new Error('background listener not registered');
    }
    const listener = listenerArgs[0] as Parameters<typeof chrome.runtime.onMessage.addListener>[0];

    let responsePayload: unknown;
    const sendResponse = vi.fn((payload: unknown) => {
      responsePayload = payload;
    });
    const done = new Promise<void>(resolve => {
      sendResponse.mockImplementation((payload: unknown) => {
        responsePayload = payload;
        resolve();
      });
    });

    const listenerReturn = listener(
      { type: 'UNKNOWN' },
      { id: 'popup-script' } as chrome.runtime.MessageSender,
      sendResponse
    );
    expect(listenerReturn).toBe(true);

    await done;

    expect(responsePayload).toEqual({ error: 'No handler for message type: UNKNOWN' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries AI requests on transient failures before succeeding', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue('bad gateway'),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 504,
        json: vi.fn().mockResolvedValue({}),
        text: vi.fn().mockResolvedValue('gateway timeout'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          model: 'phi3',
          message: { role: 'assistant', content: 'Recovered' },
        }),
        text: vi.fn().mockResolvedValue(''),
      });

    await import('@/background/index');
    await flushPromises();

    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: unknown[][] };
    };
    const [listenerArgs] = addListenerMock.mock.calls;
    if (!listenerArgs?.[0]) {
      throw new Error('background listener not registered');
    }
    const listener = listenerArgs[0] as Parameters<typeof chrome.runtime.onMessage.addListener>[0];

    let responsePayload: unknown;
    const sendResponse = vi.fn((payload: unknown) => {
      responsePayload = payload;
    });
    const done = new Promise<void>(resolve => {
      sendResponse.mockImplementation((payload: unknown) => {
        responsePayload = payload;
        resolve();
      });
    });

    const listenerReturn = listener(
      {
        type: 'AI_REQUEST',
        options: {
          apiUrl: 'http://localhost:11434/api/chat',
          model: 'ollama:phi3',
          messages: [{ role: 'user', content: 'ping' }],
        },
      },
      { id: 'popup-script' } as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(listenerReturn).toBe(true);

    await done;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const payload = responsePayload as { choices: Array<{ message: { content: string } }> };
    expect(payload.choices[0]?.message.content).toBe('Recovered');
  });

  it('propagates AI request failures after retry exhaustion', async () => {
    fetchMock.mockRejectedValue(new Error('Network unreachable'));

    await import('@/background/index');
    await flushPromises();

    const addListenerMock = chrome.runtime.onMessage.addListener as unknown as {
      mock: { calls: unknown[][] };
    };
    const [listenerArgs] = addListenerMock.mock.calls;
    if (!listenerArgs?.[0]) {
      throw new Error('background listener not registered');
    }
    const listener = listenerArgs[0] as Parameters<typeof chrome.runtime.onMessage.addListener>[0];

    let responsePayload: unknown;
    const sendResponse = vi.fn((payload: unknown) => {
      responsePayload = payload;
    });
    const done = new Promise<void>(resolve => {
      sendResponse.mockImplementation((payload: unknown) => {
        responsePayload = payload;
        resolve();
      });
    });

    const listenerReturn = listener(
      {
        type: 'AI_REQUEST',
        options: {
          apiUrl: 'http://localhost:11434/api/chat',
          model: 'ollama:phi3',
          messages: [{ role: 'user', content: 'ping' }],
        },
      },
      { id: 'popup-script' } as chrome.runtime.MessageSender,
      sendResponse
    );

    expect(listenerReturn).toBe(true);

    await done;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(responsePayload).toEqual({ error: 'Network unreachable' });
  });
});
