/**
 * BDD tests for FormFillerHandler — G-S2-3
 *
 * Spec: 4-stage state machine (Detect → Analyze → Map → Fill)
 * Each stage calls the right service and dispatches AI via Background SW.
 * Never calls backend HTTP directly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormFillerHandler, type FormFillerHandlerDeps } from '../formFillerHandler';
import type { DetectedForm } from '@/content/formDetector';
import type { FormRelevanceResult, FieldMappingResult } from '@/popup/services/formAnalysisService';

// ── DOM helpers ───────────────────────────────────────────────────────────────

function setupDOM(): void {
  document.body.innerHTML = `
    <button id="detectFormsBtn">Detect</button>
    <button id="analyzeContentBtn">Analyze</button>
    <button id="generateMappingBtn">Map</button>
    <button id="fillFormsBtn">Fill</button>
    <textarea id="fillContentInput"></textarea>
    <div id="formFillerStatus"></div>
    <div id="detectionResults"></div>
    <div id="analysisResults"></div>
    <div id="mappingResults"></div>
  `;
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FORMS: DetectedForm[] = [
  {
    index: 0,
    id: 'testForm',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
    ],
  },
];

const RELEVANCE: FormRelevanceResult = {
  relevantForms: [{ formId: 'testForm', relevanceScore: 0.9 }],
  recommendedForm: 'testForm',
  confidence: 0.9,
};

const MAPPINGS: FieldMappingResult = {
  fieldMappings: [
    { fieldId: 'name', suggestedValue: 'Ada Lovelace' },
    { fieldId: 'email', suggestedValue: 'ada@example.com' },
  ],
};

// ── BDD scenarios ─────────────────────────────────────────────────────────────

describe('FormFillerHandler — G-S2-3', () => {
  let deps: FormFillerHandlerDeps;
  let handler: FormFillerHandler;

  beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();

    deps = {
      formDetectionService: {
        detectForms: vi
          .fn()
          .mockResolvedValue({ success: true, forms: FORMS, totalForms: 1, totalFields: 2 }),
        extractPageHtml: vi.fn().mockResolvedValue('<html>Test page</html>'),
        generateFormSummary: vi.fn().mockReturnValue('1 form detected'),
        filterRelevantForms: vi.fn().mockReturnValue(FORMS),
      },
      formAnalysisService: {
        analyzeFormRelevance: vi.fn().mockResolvedValue(RELEVANCE),
        analyzeFieldMapping: vi.fn().mockResolvedValue(MAPPINGS),
      },
      fillForms: vi.fn().mockResolvedValue({ success: true, filled: 2 }),
      getSelectedModel: vi.fn().mockReturnValue('ollama:qwen3'),
      getApiConfig: () => Promise.resolve({ apiUrl: 'http://localhost:11434/api/chat' }),
      getContentInput: () =>
        (document.getElementById('fillContentInput') as HTMLTextAreaElement)?.value ?? '',
      getDataSources: () => null,
      getLanguage: () => 'zh',
    };

    handler = new FormFillerHandler(deps);
    handler.init();
  });

  // Scenario 1 — detect
  it('detectForms() calls formDetectionService and transitions to DETECTED', async () => {
    await handler.detectForms();

    expect(deps.formDetectionService.detectForms).toHaveBeenCalledOnce();
    expect(handler.getState()).toBe('DETECTED');
    expect(handler.getCurrentForms()).toHaveLength(1);
  });

  // Scenario 2 — analyze
  it('analyzeContent() calls formAnalysisService Stage 1 after detecting', async () => {
    await handler.detectForms();
    await handler.analyzeContent();

    expect(deps.formAnalysisService.analyzeFormRelevance).toHaveBeenCalledOnce();
    expect(handler.getState()).toBe('ANALYZED');
  });

  // Scenario 3 — map
  it('generateMapping() calls formAnalysisService Stage 2 after analyzing', async () => {
    await handler.detectForms();
    await handler.analyzeContent();
    await handler.generateMapping();

    expect(deps.formAnalysisService.analyzeFieldMapping).toHaveBeenCalledOnce();
    expect(handler.getState()).toBe('MAPPED');
    expect(handler.getCurrentMappings()).toHaveLength(2);
  });

  // Scenario 4 — fill
  it('fillForms() calls deps.fillForms with mappings after mapping', async () => {
    await handler.detectForms();
    await handler.analyzeContent();
    await handler.generateMapping();
    await handler.fillForms();

    expect(deps.fillForms).toHaveBeenCalledOnce();
    expect(deps.fillForms).toHaveBeenCalledWith(MAPPINGS.fieldMappings);
    expect(handler.getState()).toBe('FILLED');
  });

  // Scenario 5 — reset
  it('reset() returns to IDLE and clears state', async () => {
    await handler.detectForms();
    handler.reset();

    expect(handler.getState()).toBe('IDLE');
    expect(handler.getCurrentForms()).toHaveLength(0);
    expect(handler.getCurrentMappings()).toHaveLength(0);
  });

  // Scenario 6 — button wiring
  it('detectFormsBtn click triggers detectForms()', async () => {
    const detectSpy = vi.spyOn(handler, 'detectForms');
    document.getElementById('detectFormsBtn')!.click();
    await vi.waitFor(() => expect(detectSpy).toHaveBeenCalledOnce());
  });

  // Scenario 7 — error handling
  it('detectForms() transitions to ERROR state on failure', async () => {
    (deps.formDetectionService.detectForms as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Content script unavailable')
    );

    await handler.detectForms();

    expect(handler.getState()).toBe('ERROR');
  });

  // Scenario 8 — cannot analyze without detect
  it('analyzeContent() without prior detection is a no-op (returns false)', async () => {
    const result = await handler.analyzeContent();

    expect(result).toBe(false);
    expect(deps.formAnalysisService.analyzeFormRelevance).not.toHaveBeenCalled();
  });
});
