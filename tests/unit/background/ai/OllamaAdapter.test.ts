import { describe, it, expect } from 'vitest';
import { OllamaAdapter } from '@/background/services/ai/OllamaAdapter';
import type { ChatMessage } from '@/types/ai';

describe('OllamaAdapter', () => {
  const adapter = new OllamaAdapter();

  it('builds headers without api-key', () => {
    const headers = adapter.getHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['api-key']).toBeUndefined();
  });

  it('processes request body includes stream=false', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'hello' }];
    const body = adapter.processRequestBody(messages, {
      temperature: 0.5,
    }) as Record<string, unknown>;
    expect(body.stream).toBe(false);
    expect(Array.isArray(body.messages)).toBe(true);
    expect((body.messages as unknown[]).length).toBe(1);
    expect(body.temperature).toBe(0.5);
  });

  it('normalizes response to ChatResponse', () => {
    const raw = { model: 'ollama:llama3.1', message: { role: 'assistant', content: 'ok' } };
    const res = adapter.responseToChatResponse(raw);
    expect(res.model).toBe('ollama:llama3.1');
    expect(res.choices?.[0]?.message.role).toBe('assistant');
    expect(res.choices?.[0]?.message.content).toBe('ok');
  });
});
