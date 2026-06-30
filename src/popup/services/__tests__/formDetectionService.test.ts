/**
 * BDD tests for FormDetectionService — G-S2-1
 *
 * Spec: FormDetectionService wraps chrome.runtime messaging to detect forms
 * and provides structured results + form summary for AI context.
 * Never injects legacy scripts via window globals.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormDetectionService } from '../formDetectionService';

// ── chrome mock ───────────────────────────────────────────────────────────────

const mockSendMessage = vi.fn();
const mockTabsSendMessage = vi.fn();
const mockTabsQuery = vi.fn();

vi.stubGlobal('chrome', {
  runtime: { sendMessage: mockSendMessage, lastError: undefined },
  tabs: { query: mockTabsQuery, sendMessage: mockTabsSendMessage },
});

// ── helpers ───────────────────────────────────────────────────────────────────

const MOCK_DETECTION = {
  success: true,
  forms: [
    {
      index: 0,
      id: 'loginForm',
      fields: [
        { name: 'email', type: 'email', label: 'Email Address', required: true },
        { name: 'password', type: 'password', label: 'Password', required: true },
      ],
    },
    {
      index: 1,
      id: 'searchForm',
      fields: [{ name: 'q', type: 'text', label: 'Search', required: false }],
    },
  ],
  totalForms: 2,
  totalFields: 3,
};

// ── BDD scenarios ─────────────────────────────────────────────────────────────

describe('FormDetectionService — G-S2-1', () => {
  let service: FormDetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTabsQuery.mockResolvedValue([{ id: 42 }]);
    service = new FormDetectionService();
  });

  // Scenario 1 — happy path
  it('detectForms() sends detectForms action via chrome.runtime and returns result', async () => {
    mockSendMessage.mockImplementation((_msg: unknown, cb: (r: unknown) => void) =>
      cb(MOCK_DETECTION)
    );

    const result = await service.detectForms();

    const calls = mockSendMessage.mock.calls;
    const detectCall = calls.find(c => (c[0] as { action?: string })?.action === 'detectForms');
    expect(detectCall).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.forms).toHaveLength(2);
  });

  // Scenario 2 — generates form summary for AI prompt context
  it('generateFormSummary() returns human-readable description of all forms', () => {
    const summary = service.generateFormSummary(
      MOCK_DETECTION.forms as import('@/content/formDetector').DetectedForm[]
    );

    expect(typeof summary).toBe('string');
    expect(summary).toContain('2'); // form count
    expect(summary).toContain('loginForm'); // form id or index
    expect(summary.length).toBeGreaterThan(20);
  });

  // Scenario 3 — filters out trivial forms
  it('filterRelevantForms() excludes forms with only hidden/submit fields', () => {
    const forms = [
      {
        index: 0,
        id: 'realForm',
        fields: [{ name: 'name', type: 'text', label: 'Name', required: true }],
      },
      {
        index: 1,
        id: 'junkForm',
        fields: [{ name: 'csrf', type: 'unknown', label: undefined, required: false }],
      },
    ];

    const filtered = service.filterRelevantForms(
      forms as import('@/content/formDetector').DetectedForm[]
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.id).toBe('realForm');
  });

  // Scenario 4 — extractPageHtml returns html from content script
  it('extractPageHtml() sends extractContentWithIframes message', async () => {
    mockSendMessage.mockImplementation((_msg: unknown, cb: (r: unknown) => void) =>
      cb({
        success: true,
        data: { mainPage: { html: '<html><body>Test</body></html>' } },
      })
    );

    const html = await service.extractPageHtml();

    const calls = mockSendMessage.mock.calls;
    const iframeCall = calls.find(
      c => (c[0] as { action?: string })?.action === 'extractContentWithIframes'
    );
    expect(iframeCall).toBeDefined();
    expect(html).toContain('Test');
  });

  // Scenario 5 — error handling
  it('detectForms() throws on content script failure', async () => {
    mockSendMessage.mockImplementation((_msg: unknown, cb: (r: unknown) => void) =>
      cb({ success: false, error: 'Content script not loaded' })
    );

    await expect(service.detectForms()).rejects.toThrow('Content script not loaded');
  });

  // Scenario 6 — no active tab
  it('detectForms() throws if no active tab', async () => {
    mockTabsQuery.mockResolvedValue([]);

    await expect(service.detectForms()).rejects.toThrow(/no active tab/i);
  });
});
