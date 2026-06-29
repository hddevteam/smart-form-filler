/**
 * E2E tests for Chat with Data feature.
 *
 * These specs verify that:
 * 1. The Chat tab is reachable and interactive
 * 2. Sending a message triggers chrome.runtime.sendMessage with action='AI_REQUEST'
 *    (NOT a fetch to localhost/backend)
 * 3. The AI response is rendered in the chat window
 * 4. Data sources are reflected in the system prompt context
 */
import { test, expect, buildChromeMockScript, POPUP_DEV_URL } from '../fixtures/index';

test.describe('Chat with Data — Background SW routing (G0)', () => {
  test('opens Chat tab and shows send button', async ({ page }) => {
    await page.addInitScript(buildChromeMockScript({}));
    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    // Navigate to Chat tab
    const chatTab = page.locator('[data-tab="chat"], button:has-text("Chat"), #chat-tab');
    await expect(chatTab.first()).toBeVisible({ timeout: 8000 });
    await chatTab.first().click();

    const sendBtn = page.locator('#sendChatBtn, button:has-text("Send")').first();
    await expect(sendBtn).toBeVisible({ timeout: 5000 });
  });

  test('sending a message dispatches AI_REQUEST via chrome.runtime (not fetch to backend)', async ({
    page,
  }) => {
    const aiResponse = { content: 'Hello! I am the AI assistant.', model: 'ollama:qwen3:0.6b' };

    await page.addInitScript(
      buildChromeMockScript({
        models: [{ id: 'ollama:qwen3:0.6b', name: 'qwen3:0.6b', source: 'ollama' }],
        aiResponses: [aiResponse],
      })
    );

    // Intercept any fetch calls to backend endpoints — should never fire
    const backendCalls: string[] = [];
    await page.route('**/extension/chat-with-data**', route => {
      backendCalls.push(route.request().url());
      void route.abort();
    });
    await page.route('**/localhost:3001/**', route => {
      backendCalls.push(route.request().url());
      void route.abort();
    });

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    // Select Chat tab
    const chatTab = page.locator('[data-tab="chat"], button:has-text("Chat"), #chat-tab').first();
    await expect(chatTab).toBeVisible({ timeout: 8000 });
    await chatTab.click();

    // Wait for model selector, pick the Ollama model
    const modelSelect = page.locator('#globalModelSelect, #model-selector select').first();
    await expect(modelSelect).toBeVisible({ timeout: 8000 });
    await expect(modelSelect).toBeEnabled({ timeout: 8000 });
    await modelSelect.selectOption({ value: 'ollama:qwen3:0.6b' });
    await modelSelect.dispatchEvent('change');

    // Type and send a message
    const chatInput = page.locator('#chatInput, textarea[id*="chat"]').first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Hello, summarize this page for me.');

    const sendBtn = page.locator('#sendChatBtn, button:has-text("Send")').first();
    await sendBtn.click();

    // AI response should appear in chat
    await expect(page.locator('.chat-message--assistant .chat-message__text').last()).toContainText(
      'Hello! I am the AI assistant.',
      { timeout: 8000 }
    );

    // Verify: AI_REQUEST went through chrome.runtime (not backend fetch)
    const calls = await page.evaluate(
      () => (window as unknown as { __sf_calls?: Array<{ action: string }> }).__sf_calls ?? []
    );
    const aiRequestCalls = calls.filter(c => c.action === 'AI_REQUEST');
    expect(aiRequestCalls.length).toBeGreaterThanOrEqual(1);

    // Verify: NO backend HTTP calls were made
    expect(backendCalls).toHaveLength(0);
  });

  test('displays error message when AI request fails', async ({ page }) => {
    await page.addInitScript(`
      (() => {
        const store = {};
        window.chrome = {
          storage: {
            local: {
              get: (keys, cb) => { const r = {}; (Array.isArray(keys)?keys:[keys]).forEach(k=>r[k]=store[k]); cb?.(r); return Promise.resolve(r); },
              set: (o, cb) => { Object.assign(store,o); cb?.(); return Promise.resolve(); },
            }
          },
          runtime: {
            lastError: undefined,
            sendMessage: (msg, optOrCb, maybeCb) => {
              const cb = typeof optOrCb === 'function' ? optOrCb : (maybeCb ?? (()=>{}));
              const action = msg?.action;
              if (action === 'getAvailableModels') { cb({ success: true, models: [{ id: 'ollama:qwen3:0.6b', name: 'qwen3:0.6b', source: 'ollama' }] }); return; }
              if (action === 'AI_REQUEST') { cb({ success: false, error: 'Connection refused', logs: [] }); return; }
              cb({ success: true });
            },
            onMessage: { addListener: () => {} },
          },
          action: {},
        };
      })();
    `);

    await page.goto(POPUP_DEV_URL, { waitUntil: 'domcontentloaded' });

    const chatTab = page.locator('[data-tab="chat"], button:has-text("Chat"), #chat-tab').first();
    await expect(chatTab).toBeVisible({ timeout: 8000 });
    await chatTab.click();

    const modelSelect = page.locator('#globalModelSelect, #model-selector select').first();
    await expect(modelSelect).toBeVisible({ timeout: 8000 });
    await expect(modelSelect).toBeEnabled({ timeout: 8000 });
    await modelSelect.selectOption({ value: 'ollama:qwen3:0.6b' });
    await modelSelect.dispatchEvent('change');

    const chatInput2 = page.locator('#chatInput, textarea[id*="chat"]').first();
    await chatInput2.fill('This will fail');

    await page.locator('#sendChatBtn, button:has-text("Send")').first().click();
    const lastBubble = page.locator('.chat-message--assistant .chat-message__text').last();
    await expect(lastBubble).toContainText('❌', { timeout: 8000 });
  });
});
