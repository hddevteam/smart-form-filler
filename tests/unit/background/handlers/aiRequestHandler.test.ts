import { describe, it, expect, vi } from 'vitest';
import { MessageRouter } from '@/background/messageRouter';
import { registerAIRequestHandler } from '@/background/handlers/aiRequestHandler';

class FakeAIService {
  makeRequest = vi.fn().mockResolvedValue({
    model: 'x',
    choices: [{ message: { role: 'assistant', content: 'ok' } }],
  });
}

describe('registerAIRequestHandler', () => {
  it('delegates to AIService.makeRequest with options', async () => {
    const router = new MessageRouter();
    const fake =
      new FakeAIService() as unknown as import('@/background/services/ai/aiService').AIService;
    registerAIRequestHandler(router, fake);

    const options = {
      apiUrl: 'http://x',
      model: 'test',
      messages: [{ role: 'user', content: 'hi' }],
    } as any;
    const resp = (await router.handle({ type: 'AI_REQUEST', options }, {
      id: 's',
    } as chrome.runtime.MessageSender)) as {
      success: boolean;
      data: unknown;
      logs: string[];
    };

    expect(resp.success).toBe(true);
    expect(resp.data).toEqual({
      model: 'x',
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    });
    expect(Array.isArray(resp.logs)).toBe(true);

    const callArg = (fake.makeRequest as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg).toMatchObject(options);
    expect(typeof callArg.onLog).toBe('function');
  });
});
