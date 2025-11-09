import { test, expect } from '@playwright/test';

const FORM_PAGE_URL =
  process.env.FORM_FIXTURE_URL ?? 'http://127.0.0.1:5173/tests/e2e/fixtures/simple-form.html';

test.describe('Content form filling workflow', () => {
  test('fills mapped fields via content script listener', async ({ page }) => {
    await page.addInitScript(() => {
      const listeners: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]> = [];

      const runtime = {
        onMessage: {
          addListener: (listener: Parameters<typeof chrome.runtime.onMessage.addListener>[0]) => {
            listeners.push(listener);
          },
        },
      } as const;

      // @ts-expect-error: injecting mock chrome API for content script under test
      window.chrome = {
        runtime,
      };

      // @ts-expect-error: expose listeners for test assertions
      window.__sf_content_listeners = listeners;
    });

    await page.goto(FORM_PAGE_URL, { waitUntil: 'domcontentloaded' });

    await page.evaluate(async () => {
      await import('/src/extension/content.ts');
    });

    const result = await page.evaluate(async () => {
      const globalWindow = window as unknown as {
        __sf_content_listeners?: Array<Parameters<typeof chrome.runtime.onMessage.addListener>[0]>;
      };
      const listeners = globalWindow.__sf_content_listeners ?? [];
      const listener = listeners[0];
      if (!listener) {
        throw new Error('Content listener not registered');
      }

      const mappings = [
        { fieldId: 'fullName', suggestedValue: 'Ada Lovelace' },
        { fieldId: 'email', suggestedValue: 'ada@example.com' },
        { fieldId: 'department', suggestedValue: 'engineering' },
        { fieldId: 'newsletter', suggestedValue: true },
        { fieldId: 'workMode', fieldType: 'radio', suggestedValue: 'hybrid' },
        { fieldId: 'notes', suggestedValue: 'First programmer' },
      ];

      const response = await new Promise(resolve => {
        listener(
          { action: 'fillForms', mappings },
          { id: 'background-script' } as chrome.runtime.MessageSender,
          resolve as (value: unknown) => void
        );
      });

      const values = {
        fullName: (document.getElementById('fullName') as HTMLInputElement).value,
        email: (document.getElementById('email') as HTMLInputElement).value,
        department: (document.getElementById('department') as HTMLSelectElement).value,
        newsletter: (document.getElementById('newsletter') as HTMLInputElement).checked,
        workMode:
          Array.from(document.querySelectorAll<HTMLInputElement>('input[name="workMode"]')).find(
            radio => radio.checked
          )?.value ?? '',
        notes: (document.getElementById('notes') as HTMLTextAreaElement).value,
      };

      return { response, values };
    });

    expect((result.response as { success?: boolean }).success).toBe(true);
    expect(result.values).toMatchObject({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      department: 'engineering',
      newsletter: true,
      workMode: 'hybrid',
      notes: 'First programmer',
    });
  });
});
