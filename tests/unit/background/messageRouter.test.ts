import { describe, it, expect } from 'vitest';
import { MessageRouter } from '@/background/messageRouter';

describe('MessageRouter', () => {
  it('routes to registered handler by type', async () => {
    const router = new MessageRouter();
    router.register('PING', async () => Promise.resolve({ ok: true }));

    const resp = await router.handle({ type: 'PING' }, {
      id: 'test',
    } as chrome.runtime.MessageSender);
    expect(resp).toEqual({ ok: true });
  });

  it('throws when handler missing', async () => {
    const router = new MessageRouter();
    await expect(
      router.handle({ type: 'UNKNOWN' }, {
        id: 'test',
      } as chrome.runtime.MessageSender)
    ).rejects.toThrow('No handler for message type: UNKNOWN');
  });

  it('rejects non-string type values', async () => {
    const router = new MessageRouter();
    await expect(
      router.handle(
        { type: 123 } as unknown,
        {
          id: 'test',
        } as chrome.runtime.MessageSender
      )
    ).rejects.toThrow('No handler for message type: unknown');
  });
});
