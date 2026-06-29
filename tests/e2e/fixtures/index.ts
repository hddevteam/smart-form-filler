/**
 * Shared Playwright fixtures and helpers for Smart Form Filler E2E tests.
 *
 * All E2E specs should import from this file rather than defining
 * chrome mocks inline.
 */
import { test as base, type Page } from '@playwright/test';

export const POPUP_DEV_URL =
  process.env.POPUP_DEV_URL ?? 'http://127.0.0.1:5173/extension/popup.html';

export const FORM_FIXTURE_URL =
  process.env.FORM_FIXTURE_URL ?? 'http://127.0.0.1:5173/tests/e2e/fixtures/simple-form.html';

// ── Chrome mock helpers ───────────────────────────────────────────────────────

export type MockModel = { id: string; name?: string; source?: string };
export type MockAIResponse = { content: string; model?: string };

/**
 * Standard chrome runtime mock injected into every popup test.
 *
 * - getAvailableModels  → returns provided models list
 * - AI_REQUEST          → returns provided ai responses in sequence
 * - all others          → { success: true }
 */
export function buildChromeMockScript(options: {
  models?: MockModel[];
  aiResponses?: MockAIResponse[];
  storageData?: Record<string, unknown>;
}): string {
  const models = options.models ?? [
    { id: 'ollama:qwen3:0.6b', name: 'qwen3:0.6b', source: 'ollama' },
  ];
  const aiResponses = options.aiResponses ?? [
    { content: 'AI response', model: 'ollama:qwen3:0.6b' },
  ];
  const storageData = options.storageData ?? {};

  return `
    (() => {
      const store = ${JSON.stringify(storageData)};
      let aiCallIndex = 0;
      const aiResponses = ${JSON.stringify(aiResponses)};
      const callLog = [];

      const storageLocal = {
        get: (keys, callback) => {
          const result = {};
          const ks = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : Object.keys(store);
          ks.forEach(k => { result[k] = store[k]; });
          if (callback) callback(result);
          return Promise.resolve(result);
        },
        set: (obj, callback) => {
          Object.assign(store, obj);
          if (callback) callback();
          return Promise.resolve();
        },
      };

      const runtime = {
        lastError: undefined,
        sendMessage: (message, optOrCb, maybeCb) => {
          const cb = typeof optOrCb === 'function' ? optOrCb : (maybeCb ?? (() => {}));
          callLog.push(message);
          const action = message?.action;
          if (action === 'getAvailableModels') {
            cb({ success: true, models: ${JSON.stringify(models)} });
            return;
          }
          if (action === 'AI_REQUEST') {
            const resp = aiResponses[aiCallIndex % aiResponses.length];
            aiCallIndex++;
            cb({
              success: true,
              data: {
                model: resp.model ?? 'test-model',
                choices: [{ message: { role: 'assistant', content: resp.content } }],
              },
              logs: [],
            });
            return;
          }
          if (action === 'refreshOllamaModels') { cb({ success: true }); return; }
          if (action === 'detectForms') { cb({ success: true, forms: [] }); return; }
          if (action === 'extractContentWithIframes') {
            cb({ success: true, data: { markdown: { content: 'Test page content' } } });
            return;
          }
          if (action === 'fillForms') { cb({ success: true, filled: 0 }); return; }
          cb({ success: true });
        },
        onMessage: { addListener: () => {} },
      };

      window.chrome = { runtime, storage: { local: storageLocal }, action: {} };
      window.__sf_calls = callLog;
    })();
  `;
}

// ── Custom test fixture ───────────────────────────────────────────────────────

type ExtendedFixtures = {
  /** Page pre-loaded with standard chrome mock and navigated to popup */
  popupPage: Page;
};

export const test = base.extend<ExtendedFixtures>({
  popupPage: async ({ page }, use) => {
    await page.addInitScript(buildChromeMockScript({}));
    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });
    await use(page);
  },
});

export { expect } from '@playwright/test';
