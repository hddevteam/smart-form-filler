import { test, expect } from '@playwright/test';

const POPUP_DEV_URL = process.env.POPUP_DEV_URL ?? 'http://127.0.0.1:5173/extension/popup_ts.html';

test.describe('Popup form actions workflow', () => {
  test('dispatches detect/analyze/fill messages via chrome.runtime', async ({ page }) => {
    await page.addInitScript(() => {
      const store: Record<string, unknown> = {};
      const callLog: Array<Record<string, unknown>> = [];

      const storageLocal = {
        set: (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
          return Promise.resolve();
        },
        get: (key: string | string[] | Record<string, unknown>) => {
          if (typeof key === 'string') {
            return Promise.resolve({ [key]: store[key] });
          }
          if (Array.isArray(key)) {
            const res: Record<string, unknown> = {};
            key.forEach(k => {
              res[k] = store[k];
            });
            return Promise.resolve(res);
          }
          return Promise.resolve(store);
        },
      } as const;

      const runtime = {
        lastError: undefined as unknown,
        sendMessage: (message: Record<string, unknown>, callback: (resp: unknown) => void) => {
          callLog.push(message);
          setTimeout(() => {
            const action = message?.action;
            if (action === 'getAvailableModels') {
              callback({
                success: true,
                models: [{ id: 'ollama:test', name: 'Local Test Model', source: 'ollama' }],
              });
              return;
            }
            callback({ success: true });
          }, 0);
        },
      } as const;

      const mockFetch = () =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({}),
        });

      // Expose mocks to window scope used by popup bundle
      // @ts-expect-error: injecting mock chrome API into dev page context
      window.chrome = {
        storage: { local: storageLocal },
        runtime,
      };

      // @ts-expect-error: record runtime calls for assertions
      window.__sf_calls = callLog;

      window.fetch = mockFetch as unknown as typeof window.fetch;
    });

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    const detectButton = page.locator('#detectFormsBtn');
    const analyzeButton = page.locator('#analyzeContentBtn');
    const fillButton = page.locator('#fillFormsBtn');

    await expect(detectButton).toBeVisible();
    await expect(analyzeButton).toBeVisible();
    await expect(fillButton).toBeVisible();

    await detectButton.click();
    await page.waitForFunction(() => {
      const globalWindow = window as unknown as { __sf_calls?: unknown[] };
      const calls = globalWindow.__sf_calls;
      return Array.isArray(calls) && calls.length >= 1;
    });

    await analyzeButton.click();
    await page.waitForFunction(() => {
      const globalWindow = window as unknown as { __sf_calls?: unknown[] };
      const calls = globalWindow.__sf_calls;
      return Array.isArray(calls) && calls.length >= 2;
    });

    await fillButton.click();
    await page.waitForFunction(() => {
      const globalWindow = window as unknown as { __sf_calls?: unknown[] };
      const calls = globalWindow.__sf_calls;
      return Array.isArray(calls) && calls.length >= 3;
    });

    const calls = await page.evaluate(() => {
      const globalWindow = window as unknown as {
        __sf_calls?: Array<Record<string, unknown>>;
      };
      return globalWindow.__sf_calls ?? [];
    });

    const actions = calls.map(call => call['action'] as string | undefined);
    expect(actions.slice(-3)).toEqual(['detectForms', 'extractContentWithIframes', 'fillForms']);

    const fillMessage = calls.find(call => call['action'] === 'fillForms');
    expect(fillMessage?.['mappings']).toEqual({});
  });
});
