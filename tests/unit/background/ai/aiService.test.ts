import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { AIService } from '@/background/services/ai/aiService';

describe('AIService', () => {
  let ensureMock: Mock<[], Promise<void>>;
  let service: AIService;

  beforeEach(() => {
    vi.restoreAllMocks();
    ensureMock = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
    service = new AIService(() => ensureMock());
  });

  it('returns ChatResponse on 200', async () => {
    const mockJson = vi.fn().mockResolvedValue({
      id: 'resp-1',
      model: 'gpt-4o-mini',
      choices: [{ message: { role: 'assistant', content: 'hi' } }],
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
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
    expect(ensureMock).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries then throws on HTTP error', async () => {
    const mockText = vi.fn().mockResolvedValue('bad');
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
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
    expect(ensureMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('awaits Ollama CORS bypass before issuing fetch', async () => {
    let resolveBypass: (() => void) | undefined;
    const ensurePromise = new Promise<void>(resolve => {
      resolveBypass = resolve;
    });
    ensureMock.mockReturnValueOnce(ensurePromise);

    const fetchSpy = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          model: 'ollama:qwen',
          choices: [{ message: { role: 'assistant', content: 'hi' } }],
        }),
    } as unknown as Response);

    const promise = service.makeRequest({
      apiUrl: 'http://localhost:11434/api/chat',
      model: 'ollama:qwen',
      messages: [{ role: 'user', content: 'ping' }],
    });

    expect(ensureMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();

    resolveBypass?.();

    const result = await promise;
    expect(result.model).toBe('ollama:qwen');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
