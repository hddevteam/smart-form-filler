import { test, expect } from '@playwright/test';

const POPUP_DEV_URL = process.env.POPUP_DEV_URL ?? 'http://127.0.0.1:5173/extension/popup.html';

test.describe('Popup detect/analyze to AI flow', () => {
  test('handles AI success then failure with mocked runtime responses', async ({ page }) => {
    await page.addInitScript(() => {
      const callLog: Array<Record<string, unknown>> = [];
      let aiRequestCount = 0;

      const storageLocal = {
        get: (_keys: unknown, callback?: (items: Record<string, unknown>) => void) => {
          callback?.({});
          return Promise.resolve();
        },
        set: () => Promise.resolve(),
      };

      const runtime = {
        lastError: undefined as { message: string } | undefined,
        sendMessage: (
          message: Record<string, unknown>,
          optionsOrCallback?: unknown,
          maybeCallback?: unknown
        ) => {
          const primary =
            typeof optionsOrCallback === 'function'
              ? (optionsOrCallback as (resp: unknown) => void)
              : (maybeCallback as (resp: unknown) => void);
          const callback = primary ?? (() => {});

          callLog.push(message);
          const action = message?.action as string | undefined;
          if (action === 'getAvailableModels') {
            callback({
              success: true,
              models: [{ id: 'ollama:test', name: 'Local Test', source: 'ollama' }],
            });
            return;
          }
          if (action === 'AI_REQUEST') {
            aiRequestCount += 1;
            if (aiRequestCount === 1) {
              callback({
                success: true,
                data: {
                  model: 'ollama:test',
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: 'First response from AI',
                      },
                    },
                  ],
                },
                logs: ['Attempt 1 successful'],
              });
            } else {
              callback({
                success: false,
                error: 'Simulated AI failure',
                logs: ['Attempt 2 failed'],
              });
            }
            return;
          }

          callback({ success: true });
        },
      };

      const chromeMock = {
        runtime,
        storage: { local: storageLocal },
      };
      (window as unknown as Record<string, unknown>).chrome = chromeMock;

      (window as unknown as { __sf_calls?: Array<Record<string, unknown>> }).__sf_calls = callLog;
    });

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    await page.selectOption('#model-selector select', 'ollama:test');

    const detectButton = page.locator('#detectFormsBtn');
    const analyzeButton = page.locator('#analyzeContentBtn');
    const aiButton = page.locator('#ai-test-btn');
    const statusLocator = page.locator('.ai-test-status');

    await expect(detectButton).toBeVisible();
    await expect(analyzeButton).toBeVisible();
    await expect(aiButton).toBeVisible();

    await detectButton.click();
    await analyzeButton.click();

    await aiButton.click();
    await expect(statusLocator).toContainText('✅', { timeout: 5000 });
    await expect(statusLocator).toContainText('First response from AI');

    await aiButton.click();
    await expect(statusLocator).toContainText('❌', { timeout: 5000 });
    await expect(statusLocator).toContainText('Simulated AI failure');

    const calls = await page.evaluate(() => {
      const globalWindow = window as unknown as {
        __sf_calls?: Array<Record<string, unknown>>;
      };
      return globalWindow.__sf_calls ?? [];
    });

    const actions = calls.map(call => call['action']);
    expect(actions).toEqual(
      expect.arrayContaining([
        'getAvailableModels',
        'detectForms',
        'extractContentWithIframes',
        'AI_REQUEST',
      ])
    );
    const aiCalls = calls.filter(call => call['action'] === 'AI_REQUEST');
    expect(aiCalls).toHaveLength(2);
  });
});
