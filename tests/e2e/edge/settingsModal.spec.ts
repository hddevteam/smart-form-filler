import { test, expect } from '@playwright/test';

// Use TS popup shell to mount popup/index.ts
const POPUP_DEV_URL = process.env.POPUP_DEV_URL ?? 'http://127.0.0.1:5173/extension/popup.html';

test.describe('Popup Azure settings workflow', () => {
  test('saves Azure config and refreshes model selector', async ({ page }) => {
    // Stub chrome APIs for storage and runtime messaging in dev page
    await page.addInitScript(() => {
      const store: Record<string, unknown> = {};
      // Minimal chrome.storage.local mock
      // set/get return Promises to match extension API
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
            key.forEach(k => (res[k] = store[k]));
            return Promise.resolve(res);
          }
          return Promise.resolve(store);
        },
      } as const;

      const runtime = {
        lastError: undefined as unknown,
        // Minimal sendMessage stub: return empty models to allow azure-only list
        sendMessage: (message: { action?: string }, callback: (resp: unknown) => void) => {
          const action = message?.action;
          if (action === 'getAvailableModels') {
            callback({ success: true, models: [] });
            return;
          }
          if (action === 'refreshOllamaModels') {
            callback({ success: true });
            return;
          }
          // Default OK
          callback({ success: true });
        },
      } as const;

      // Expose on window
      // @ts-expect-error: injecting mock chrome API into dev page context
      window.chrome = {
        storage: { local: storageLocal },
        runtime,
      };
    });

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    // Open Azure settings modal
    const settingsButton = page.getByRole('button', { name: 'Settings' });
    await expect(settingsButton).toBeVisible({ timeout: 5000 });
    await settingsButton.click();

    // Fill form
    await page.fill('#azure-model', 'gpt-4o');
    await page.fill(
      '#azure-endpoint',
      'https://example.openai.azure.com/openai/deployments/gpt-4o'
    );
    await page.fill('#azure-apikey', 'sk-azure-test');
    // Optional name
    await page.fill('#azure-name', 'Azure-Test');

    // Submit form
    await page.click('button[type="submit"]');

    // Expect success status
    const status = page.locator('.config-status');
    await expect(status).toHaveText(/Configuration saved successfully/i, { timeout: 5000 });

    // Modal should close shortly after save
    await page.waitForTimeout(900);
    await expect(page.locator('#modal-root')).toBeEmpty();

    // Model selector should refresh and include Azure model option
    const selector = page.locator('#globalModelSelect, #model-selector select').first();
    await expect(selector).toBeVisible();
    await page.waitForFunction(
      () => {
        const sel = document.querySelector('#globalModelSelect');
        return !!sel && sel.querySelectorAll('option').length > 0;
      },
      { timeout: 5000 }
    );

    const optionValues = await selector.locator('option').allTextContents();
    expect(optionValues.join('|').toLowerCase()).toContain('gpt-4o');
  });

  test('Test Connection button dispatches AI_REQUEST via chrome.runtime', async ({ page }) => {
    await page.addInitScript(() => {
      const store: Record<string, unknown> = {};
      const storageLocal = {
        set: (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
          return Promise.resolve();
        },
        get: (key: string | string[] | Record<string, unknown>) => {
          if (typeof key === 'string') return Promise.resolve({ [key]: store[key] });
          if (Array.isArray(key)) {
            const r: Record<string, unknown> = {};
            key.forEach(k => (r[k] = store[k]));
            return Promise.resolve(r);
          }
          return Promise.resolve(store);
        },
      } as const;

      const callLog: Array<{ action?: string }> = [];
      const runtime = {
        lastError: undefined as unknown,
        sendMessage: (message: { action?: string }, callback: (resp: unknown) => void) => {
          callLog.push(message);
          if (message?.action === 'getAvailableModels') {
            callback({ success: true, models: [] });
            return;
          }
          if (message?.action === 'AI_REQUEST') {
            callback({
              success: true,
              data: {
                model: 'gpt-4o',
                choices: [{ message: { role: 'assistant', content: 'pong' } }],
              },
              logs: [],
            });
            return;
          }
          callback({ success: true });
        },
      } as const;

      // @ts-expect-error: injecting mock chrome API
      window.chrome = { storage: { local: storageLocal }, runtime };
      (window as unknown as { __sf_calls?: typeof callLog }).__sf_calls = callLog;
    });

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    const settingsButton = page.getByRole('button', { name: 'Settings' });
    await expect(settingsButton).toBeVisible({ timeout: 5000 });
    await settingsButton.click();

    await page.fill('#azure-model', 'gpt-4o');
    await page.fill(
      '#azure-endpoint',
      'https://example.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview'
    );
    await page.fill('#azure-apikey', 'test-key');

    await page.click('#azure-test-btn');

    // Should show success feedback
    const status = page.locator('.config-status');
    await expect(status).toContainText(/success|connected|✓/i, { timeout: 5000 });

    // AI_REQUEST was dispatched via chrome.runtime (no backend fetch)
    const calls = await page.evaluate(
      () => (window as unknown as { __sf_calls?: Array<{ action: string }> }).__sf_calls ?? []
    );
    expect(calls.some(c => c.action === 'AI_REQUEST')).toBe(true);
  });
});
