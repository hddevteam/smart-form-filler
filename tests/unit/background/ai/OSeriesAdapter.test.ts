import { describe, it, expect } from 'vitest';
import { OSeriesAdapter } from '@/background/services/ai/OSeriesAdapter';
import type { ChatMessage } from '@/types/ai';

describe('OSeriesAdapter', () => {
  const adapter = new OSeriesAdapter();

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

  it('processes request body with params', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];
    const body = adapter.processRequestBody(messages, {
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 128,
      custom: 'x',
    }) as Record<string, unknown>;

    expect(Array.isArray(body.messages)).toBe(true);
    expect((body.messages as unknown[]).length).toBe(1);
    expect(body.temperature).toBe(0.2);
    expect(body.top_p).toBe(0.9);
    expect(body.max_tokens).toBe(128);
    expect(body.custom).toBe('x');
    expect(body.model).toBeUndefined(); // No model when not provided
  });

  it('includes model in request body when provided', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];
    const body = adapter.processRequestBody(messages, { temperature: 0.2 }, 'gpt-4o') as Record<
      string,
      unknown
    >;

    expect(body.model).toBe('gpt-4o'); // Model included for unified endpoints
    expect(body.temperature).toBe(0.2);
  });

  it('normalizes response with id and role', () => {
    const raw = {
      id: 'resp-1',
      model: 'gpt-4o-mini',
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    };
    const res = adapter.responseToChatResponse(raw);
    expect(res.id).toBe('resp-1');
    expect(res.model).toBe('gpt-4o-mini');
    expect(res.choices?.[0]?.message.role).toBe('assistant');
    expect(res.choices?.[0]?.message.content).toBe('ok');
  });

  it('normalizes response without id', () => {
    const raw = {
      model: 'gpt-4o-mini',
      choices: [{ message: { role: 'unknown', content: 'ok' } }],
    };
    const res = adapter.responseToChatResponse(raw);
    expect(res.id).toBeUndefined();
    expect(res.model).toBe('gpt-4o-mini');
    expect(res.choices?.[0]?.message.role).toBe('assistant');
  });
});
