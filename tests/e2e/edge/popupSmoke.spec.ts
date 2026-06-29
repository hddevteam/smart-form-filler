import { test, expect } from '@playwright/test';

// Use TS popup shell to mount popup/index.ts
const POPUP_DEV_URL = process.env.POPUP_DEV_URL ?? 'http://127.0.0.1:5173/extension/popup.html';

test.describe('Edge popup smoke', () => {
  test('loads popup shell in Chromium-based engine', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Edge extension targets Chromium-based browsers');

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/smart form filler/i);
    // Model selector container should exist and populate eventually
    await page.waitForSelector('#model-selector', { state: 'attached', timeout: 10000 });
    await expect(page.locator('#model-selector')).toBeVisible({ timeout: 10000 });
  });
});
