import { describe, it, expect, vi } from 'vitest';
import {
  ensureOllamaCorsBypass,
  OLLAMA_CORS_RULE_ID,
} from '@/background/services/ai/ollamaCorsBypass';

describe('ensureOllamaCorsBypass', () => {
  it('registers dynamic rules to neutralize CORS headers', async () => {
    const updateDynamicRules = vi.fn().mockResolvedValue(undefined);
    (globalThis.chrome as any).declarativeNetRequest = {
      updateDynamicRules,
    };

    await ensureOllamaCorsBypass();

    expect(updateDynamicRules).toHaveBeenCalledWith({
      removeRuleIds: [OLLAMA_CORS_RULE_ID],
      addRules: expect.arrayContaining([
        expect.objectContaining({
          id: OLLAMA_CORS_RULE_ID,
          action: expect.objectContaining({
            type: 'modifyHeaders',
            requestHeaders: expect.arrayContaining([
              {
                header: 'origin',
                operation: 'remove',
              },
              {
                header: 'referer',
                operation: 'remove',
              },
            ]),
            responseHeaders: expect.arrayContaining([
              {
                header: 'access-control-allow-origin',
                operation: 'set',
                value: '*',
              },
              {
                header: 'access-control-allow-headers',
                operation: 'set',
                value: '*',
              },
              {
                header: 'access-control-allow-methods',
                operation: 'set',
                value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
              },
            ]),
          }),
          condition: expect.not.objectContaining({ resourceTypes: expect.anything() }),
        }),
      ]),
    });
  });
});
