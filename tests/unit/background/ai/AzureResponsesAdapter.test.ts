import { describe, it, expect } from 'vitest';
import { AzureResponsesAdapter } from '@/background/services/ai/AzureResponsesAdapter';
import type { ChatMessage } from '@/types/ai';

describe('AzureResponsesAdapter', () => {
  const adapter = new AzureResponsesAdapter();

  it('builds headers with api-key', () => {
    const headers = adapter.getHeaders('abc123');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['api-key']).toBe('abc123');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('builds headers with Bearer token', () => {
    const headers = adapter.getHeaders('Bearer sk-xyz789');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Authorization']).toBe('Bearer sk-xyz789');
    expect(headers['api-key']).toBeUndefined();
  });

  it('uses input instead of messages for Responses API', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];
    const body = adapter.processRequestBody(
      messages,
      { temperature: 0.2, max_tokens: 100 },
      'gpt-5-mini'
    ) as Record<string, unknown>;

    expect(body.input).toEqual(messages); // Key difference: 'input' not 'messages'
    expect(body.messages).toBeUndefined();
    expect(body.model).toBe('gpt-5-mini');
    expect(body.temperature).toBe(0.2);
    expect(body.max_completion_tokens).toBe(100); // Renamed from max_tokens
    expect(body.max_tokens).toBeUndefined();
  });

  it('normalizes response with id and role', () => {
    const raw = {
      id: 'resp-1',
      model: 'gpt-5-mini',
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    };
    const res = adapter.responseToChatResponse(raw);
    expect(res.id).toBe('resp-1');
    expect(res.model).toBe('gpt-5-mini');
    expect(res.choices?.[0]?.message.role).toBe('assistant');
    expect(res.choices?.[0]?.message.content).toBe('ok');
  });

  it('maps output array (Responses API) into choices', () => {
    const raw = {
      model: 'gpt-5-mini',
      output: [
        { type: 'reasoning', summary: [] },
        {
          id: 'msg_1',
          type: 'message',
          role: 'assistant',
          content: [
            { type: 'output_text', text: 'Hello!' },
            { type: 'output_text', text: 'How can I help?' },
          ],
        },
      ],
    } as unknown;

    const res = adapter.responseToChatResponse(raw);
    expect(res.model).toBe('gpt-5-mini');
    expect(res.choices).toHaveLength(1);
    expect(res.choices?.[0]?.message.role).toBe('assistant');
    expect(res.choices?.[0]?.message.content).toBe('Hello! How can I help?');
  });
});
