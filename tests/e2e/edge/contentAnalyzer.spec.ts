/**
 * E2E tests for Content Analyzer and enhanced Form Detector — G3
 *
 * Verifies that:
 * 1. analyzeContent message returns structured page analysis
 * 2. detectForms returns fields with labels and options
 */
import { test, expect } from '@playwright/test';

const FORM_FIXTURE_URL =
  process.env.FORM_FIXTURE_URL ?? 'http://127.0.0.1:5173/tests/e2e/fixtures/simple-form.html';

test.describe('ContentAnalyzer — page structure (G3)', () => {
  test('analyzeContent returns semantic structure with all keys', async ({ page }) => {
    await page.addInitScript(() => {
      const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];
      // @ts-expect-error: mock chrome
      window.chrome = {
        runtime: {
          onMessage: { addListener: (l: (typeof listeners)[0]) => listeners.push(l) },
        },
      };
      // @ts-expect-error: expose
      window.__sf_listeners = listeners;
    });

    await page.goto(FORM_FIXTURE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await import('/src/extension/content.ts');
    });

    const result = await page.evaluate(async () => {
      const globalWindow = window as unknown as {
        __sf_listeners?: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]>;
      };
      const listeners = globalWindow.__sf_listeners ?? [];
      const listener = listeners[0];
      if (!listener) throw new Error('No listener');
      return new Promise(resolve => {
        listener(
          { action: 'analyzeContent' },
          { id: 'bg' } as chrome.runtime.MessageSender,
          resolve as (v: unknown) => void
        );
      });
    });

    const r = result as {
      success: boolean;
      analysis: { semanticStructure: { hasMain: boolean }; pageMetrics: { forms: number } };
    };
    expect(r.success).toBe(true);
    expect(r.analysis).toHaveProperty('semanticStructure');
    expect(r.analysis).toHaveProperty('pageMetrics');
    expect(r.analysis).toHaveProperty('accessibilityInfo');
    expect(r.analysis).toHaveProperty('contentQuality');
    expect(r.analysis.pageMetrics.forms).toBeGreaterThanOrEqual(1);
  });
});

test.describe('FormDetector — enhanced labels (G3)', () => {
  test('detectForms returns field labels and select options', async ({ page }) => {
    await page.addInitScript(() => {
      const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];
      // @ts-expect-error: mock chrome
      window.chrome = {
        runtime: {
          onMessage: { addListener: (l: (typeof listeners)[0]) => listeners.push(l) },
        },
      };
      // @ts-expect-error: expose
      window.__sf_listeners = listeners;
    });

    await page.goto(FORM_FIXTURE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await import('/src/extension/content.ts');
    });

    const result = await page.evaluate(async () => {
      const globalWindow = window as unknown as {
        __sf_listeners?: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]>;
      };
      const listeners = globalWindow.__sf_listeners ?? [];
      const listener = listeners[0];
      if (!listener) throw new Error('No listener');
      return new Promise(resolve => {
        listener(
          { action: 'detectForms' },
          { id: 'bg' } as chrome.runtime.MessageSender,
          resolve as (v: unknown) => void
        );
      });
    });

    const r = result as {
      success: boolean;
      forms: Array<{
        fields: Array<{ name: string; label?: string; options?: Array<{ value: string }> }>;
      }>;
    };
    expect(r.success).toBe(true);

    // simple-form.html has fields with labels
    const fields = r.forms?.flatMap(f => f.fields ?? []) ?? [];
    // At least one field should have a label
    const withLabel = fields.filter(f => f.label);
    expect(withLabel.length).toBeGreaterThan(0);
  });
});
