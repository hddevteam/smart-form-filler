import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '@/background/services/ai/aiService';

describe('AIService', () => {
  const service = new AIService();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ChatResponse on 200', async () => {
    const mockJson = vi.fn().mockResolvedValue({
      id: 'resp-1',
      model: 'gpt-4o-mini',
      choices: [{ message: { role: 'assistant', content: 'hi' } }],
    });
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: mockJson,
    } as unknown as Response);

    const res = await service.makeRequest({
      apiUrl:
        'https://example.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-06-01',
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'hello' }],
      params: { temperature: 0.2 },
    });

    expect(res.model).toBe('gpt-4o-mini');
    expect(res.choices?.[0]?.message.content).toBe('hi');
  });

  it('retries then throws on HTTP error', async () => {
    const mockText = vi.fn().mockResolvedValue('bad');
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: mockText,
    } as unknown as Response);

    await expect(
      service.makeRequest({
        apiUrl: 'http://localhost:11434/api/chat',
        model: 'ollama:llama3.1',
        messages: [{ role: 'user', content: 'ping' }],
      })
    ).rejects.toThrow('bad');
    expect(mockText).toHaveBeenCalled();
  });
});
