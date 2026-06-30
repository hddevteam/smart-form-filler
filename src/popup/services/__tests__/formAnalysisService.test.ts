/**
 * BDD tests for FormAnalysisService — G-S2-2a + G-S2-2b
 *
 * Spec: Both stages route through chrome.runtime (Background SW → AI),
 * never calling the backend HTTP server directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormAnalysisService } from '../formAnalysisService';
import type { DetectedForm } from '@/content/formDetector';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';
import type { ChatResponse } from '@/types/ai';

// ── helpers ───────────────────────────────────────────────────────────────────

const MOCK_FORMS: DetectedForm[] = [
  {
    index: 0,
    id: 'contactForm',
    fields: [
      { name: 'name', type: 'text', label: 'Full Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      {
        name: 'country',
        type: 'select',
        label: 'Country',
        required: false,
        options: [
          { value: 'us', text: 'United States' },
          { value: 'cn', text: 'China' },
        ],
      },
    ],
  },
];

function makeAIResponse(content: string): ChatResponse {
  return {
    model: 'test',
    choices: [{ message: { role: 'assistant', content } }],
  };
}

const RELEVANCE_JSON = JSON.stringify({
  relevantForms: [{ formId: 'contactForm', relevanceScore: 0.95 }],
  recommendedForm: 'contactForm',
  confidence: 0.9,
  formDescription: 'Contact form for reaching out',
  fieldDescriptions: {
    name: { fieldId: 'name', description: 'Your full name' },
    email: { fieldId: 'email', description: 'Your email address' },
  },
});

const MAPPING_JSON = JSON.stringify({
  fieldMappings: [
    { fieldId: 'name', suggestedValue: 'Ada Lovelace' },
    { fieldId: 'email', suggestedValue: 'ada@example.com' },
    { fieldId: 'country', suggestedValue: 'cn' },
  ],
});

// ── BDD scenarios ─────────────────────────────────────────────────────────────

describe('FormAnalysisService — G-S2-2', () => {
  let sendAIRequest: ReturnType<typeof vi.fn>;
  let service: FormAnalysisService;
  const fetchSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchSpy); // must NOT be called

    sendAIRequest = vi.fn(
      (_opts: MakeRequestOptions): Promise<{ response: ChatResponse; logs: string[] }> =>
        Promise.resolve({ response: makeAIResponse(RELEVANCE_JSON), logs: [] as string[] })
    );

    service = new FormAnalysisService(
      sendAIRequest as (
        opts: MakeRequestOptions
      ) => Promise<{ response: ChatResponse; logs: string[] }>,
      () => Promise.resolve({ apiUrl: 'http://localhost:11434/api/chat' })
    );
  });

  // ── Stage 1 ─────────────────────────────────────────────────────────────────

  it('Stage 1: analyzeFormRelevance() sends AI_REQUEST via sendAIRequest — never fetch', async () => {
    const result = await service.analyzeFormRelevance(
      'My name is Ada',
      MOCK_FORMS,
      'ollama:qwen3',
      'en'
    );

    expect(sendAIRequest).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.recommendedForm).toBe('contactForm');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('Stage 1: prompt includes form field details', async () => {
    await service.analyzeFormRelevance('Content', MOCK_FORMS, 'ollama:qwen3', 'zh');

    const opts = sendAIRequest.mock.calls[0]?.[0] as MakeRequestOptions;
    const userMsg = opts.messages.find(m => m.role === 'user')?.content ?? '';
    expect(userMsg).toContain('contactForm');
    expect(userMsg).toContain('Full Name');
    expect(userMsg).toContain('Country');
  });

  it('Stage 1: includes select options in prompt', async () => {
    await service.analyzeFormRelevance('Content', MOCK_FORMS, 'ollama:qwen3', 'en');

    const opts = sendAIRequest.mock.calls[0]?.[0] as MakeRequestOptions;
    const userMsg = opts.messages.find(m => m.role === 'user')?.content ?? '';
    expect(userMsg).toMatch(/United States|China/);
  });

  it('Stage 1: parses AI JSON response correctly', async () => {
    const result = await service.analyzeFormRelevance('Content', MOCK_FORMS, 'ollama:qwen3', 'en');

    expect(result.recommendedForm).toBe('contactForm');
    expect(result.fieldDescriptions).toBeDefined();
    expect(result.fieldDescriptions?.['name']?.description).toContain('name');
  });

  it('Stage 1: throws typed error on AI failure', async () => {
    sendAIRequest.mockRejectedValueOnce(new Error('Ollama timeout'));

    await expect(
      service.analyzeFormRelevance('Content', MOCK_FORMS, 'ollama:qwen3', 'en')
    ).rejects.toThrow('Ollama timeout');
  });

  // ── Stage 2 ─────────────────────────────────────────────────────────────────

  it('Stage 2: analyzeFieldMapping() sends AI_REQUEST via sendAIRequest — never fetch', async () => {
    sendAIRequest.mockResolvedValueOnce({
      response: makeAIResponse(MAPPING_JSON),
      logs: [],
    });

    const result = await service.analyzeFieldMapping(
      'Ada Lovelace, ada@example.com, China',
      MOCK_FORMS[0]!,
      'ollama:qwen3',
      undefined,
      'zh'
    );

    expect(sendAIRequest).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.fieldMappings).toHaveLength(3);
  });

  it('Stage 2: includes target form structure in prompt', async () => {
    sendAIRequest.mockResolvedValueOnce({
      response: makeAIResponse(MAPPING_JSON),
      logs: [],
    });

    await service.analyzeFieldMapping('Content', MOCK_FORMS[0]!, 'ollama:qwen3', undefined, 'en');

    const opts = sendAIRequest.mock.calls[0]?.[0] as MakeRequestOptions;
    const userMsg = opts.messages.find(m => m.role === 'user')?.content ?? '';
    expect(userMsg).toContain('contactForm');
    expect(userMsg).toContain('Full Name');
  });

  it('Stage 2: returns fieldMappings with suggestedValue', async () => {
    sendAIRequest.mockResolvedValueOnce({
      response: makeAIResponse(MAPPING_JSON),
      logs: [],
    });

    const result = await service.analyzeFieldMapping(
      'Ada Lovelace',
      MOCK_FORMS[0]!,
      'ollama:qwen3',
      undefined,
      'zh'
    );

    const nameMapping = result.fieldMappings.find(m => m.fieldId === 'name');
    expect(nameMapping?.suggestedValue).toBe('Ada Lovelace');
  });

  it('Stage 2: includes language instruction in prompt', async () => {
    sendAIRequest.mockResolvedValueOnce({
      response: makeAIResponse(MAPPING_JSON),
      logs: [],
    });

    await service.analyzeFieldMapping('Content', MOCK_FORMS[0]!, 'ollama:qwen3', undefined, 'zh');

    const opts = sendAIRequest.mock.calls[0]?.[0] as MakeRequestOptions;
    const userMsg = opts.messages.find(m => m.role === 'user')?.content ?? '';
    expect(userMsg.toLowerCase()).toContain('zh');
  });

  it('Stage 2: includes data sources content when provided', async () => {
    sendAIRequest.mockResolvedValueOnce({
      response: makeAIResponse(MAPPING_JSON),
      logs: [],
    });

    await service.analyzeFieldMapping('', MOCK_FORMS[0]!, 'ollama:qwen3', undefined, 'zh', {
      sources: [
        {
          id: 's1',
          title: 'My CV',
          content: 'Ada Lovelace, programmer',
          type: 'markdown',
          url: 'x',
        },
      ],
    });

    const opts = sendAIRequest.mock.calls[0]?.[0] as MakeRequestOptions;
    const userMsg = opts.messages.find(m => m.role === 'user')?.content ?? '';
    expect(userMsg).toContain('Ada Lovelace');
  });
});
