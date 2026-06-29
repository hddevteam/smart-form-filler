/**
 * BDD tests for AzureSettingsModal — G1 fix
 *
 * Scenarios:
 * 1. Saves valid config via ApiConfigManager
 * 2. Shows error when required fields are missing
 * 3. Test Connection dispatches AI_REQUEST via chrome.runtime (NOT fetch to backend)
 * 4. Test Connection shows success feedback on 200 response
 * 5. Test Connection shows failure feedback on AI error
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { AzureSettingsModal } from '../AzureSettingsModal';
import type { ApiConfigManager, ApiConfig } from '@/config/apiConfigManager';

// ── chrome mock ──────────────────────────────────────────────────────────────

type SendMessageCallback = (response: unknown) => void;
const mockSendMessage = vi.fn((_msg: unknown, _optOrCb?: unknown, _maybeCb?: unknown): void => {
  /* overridden per test */
});

vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: undefined,
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
});

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRoot(): HTMLElement {
  const root = document.createElement('div');
  root.id = 'modal-root';
  document.body.appendChild(root);
  return root;
}

function makeCfgMgr(saveOk = true): ApiConfigManager {
  return {
    saveConfig: saveOk
      ? vi.fn().mockResolvedValue(undefined)
      : vi.fn().mockRejectedValue(new Error('Save failed')),
    getConfig: vi.fn().mockResolvedValue(undefined),
    listConfigs: vi.fn().mockResolvedValue([]),
    deleteConfig: vi.fn().mockResolvedValue(undefined),
  } as unknown as ApiConfigManager;
}

function fillForm(
  root: HTMLElement,
  values: { model?: string; endpoint?: string; apiKey?: string; name?: string }
) {
  const set = (id: string, val: string) => {
    const el = root.querySelector<HTMLInputElement>(`#${id}`);
    if (el) el.value = val;
  };
  if (values.model !== undefined) set('azure-model', values.model);
  if (values.endpoint !== undefined) set('azure-endpoint', values.endpoint);
  if (values.apiKey !== undefined) set('azure-apikey', values.apiKey);
  if (values.name !== undefined) set('azure-name', values.name);
}

// ── BDD scenarios ─────────────────────────────────────────────────────────────

describe('AzureSettingsModal — G1 config + test connection', () => {
  let root: HTMLElement;
  let cfgMgr: ApiConfigManager;
  let onSaved: Mock;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    root = makeRoot();
    cfgMgr = makeCfgMgr();
    onSaved = vi.fn();
  });

  // ── Save scenarios ──────────────────────────────────────────────────────────

  it('Given valid fields, saves config and calls onSaved callback', async () => {
    const modal = new AzureSettingsModal(root, { cfgMgr, onSaved });
    modal.open();

    fillForm(root, {
      model: 'gpt-4o',
      endpoint: 'https://example.openai.azure.com/openai/deployments/gpt-4o',
      apiKey: 'test-key-123',
    });

    const form = root.querySelector<HTMLFormElement>('#azure-form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => expect(cfgMgr.saveConfig).toHaveBeenCalledOnce(), { timeout: 1000 });

    const savedArg = (cfgMgr.saveConfig as Mock).mock.calls[0]?.[0] as ApiConfig;
    expect(savedArg.provider).toBe('azure');
    expect(savedArg.model).toBe('gpt-4o');
    expect(savedArg.apiKey).toBe('test-key-123');

    // onSaved fires after short delay
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledOnce(), { timeout: 2000 });
  });

  it('Given missing required fields, shows error and does NOT save', async () => {
    const modal = new AzureSettingsModal(root, { cfgMgr, onSaved });
    modal.open();

    fillForm(root, { model: 'gpt-4o', endpoint: '', apiKey: '' });

    const form = root.querySelector<HTMLFormElement>('#azure-form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise(r => setTimeout(r, 100));

    expect(cfgMgr.saveConfig).not.toHaveBeenCalled();
    const status = root.querySelector<HTMLElement>('.config-status');
    expect(status?.className).toContain('config-status--error');
  });

  // ── Test Connection scenarios ───────────────────────────────────────────────

  it('Test Connection button is visible in the modal', () => {
    const modal = new AzureSettingsModal(root, { cfgMgr, onSaved });
    modal.open();

    const testBtn = root.querySelector<HTMLButtonElement>('#azure-test-btn');
    expect(testBtn).toBeTruthy();
    expect(testBtn?.textContent?.toLowerCase()).toContain('test');
  });

  it('Given filled fields, Test Connection dispatches AI_REQUEST via chrome.runtime (not fetch)', async () => {
    // Intercept any fetch calls — should NOT fire
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // Mock chrome.runtime.sendMessage to return success
    mockSendMessage.mockImplementation(
      (_msg: unknown, optOrCb?: unknown, maybeCb?: unknown): void => {
        const cb =
          typeof optOrCb === 'function'
            ? (optOrCb as SendMessageCallback)
            : (maybeCb as SendMessageCallback | undefined);
        cb?.({
          success: true,
          data: { model: 'gpt-4o', choices: [{ message: { role: 'assistant', content: 'pong' } }] },
          logs: [],
        });
      }
    );

    const modal = new AzureSettingsModal(root, { cfgMgr, onSaved });
    modal.open();

    fillForm(root, {
      model: 'gpt-4o',
      endpoint:
        'https://example.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview',
      apiKey: 'test-key-123',
    });

    const testBtn = root.querySelector<HTMLButtonElement>('#azure-test-btn')!;
    testBtn.click();

    await vi.waitFor(
      () => {
        const status = root.querySelector<HTMLElement>('.config-status');
        return status && !status.textContent?.includes('Testing');
      },
      { timeout: 3000 }
    );

    // AI_REQUEST went through chrome.runtime
    const aiCalls = mockSendMessage.mock.calls.filter(
      c => (c[0] as { action?: string })?.action === 'AI_REQUEST'
    );
    expect(aiCalls.length).toBeGreaterThanOrEqual(1);

    // No direct fetch to backend
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Given successful Test Connection, shows success status', async () => {
    mockSendMessage.mockImplementation(
      (_msg: unknown, optOrCb?: unknown, maybeCb?: unknown): void => {
        const cb =
          typeof optOrCb === 'function'
            ? (optOrCb as SendMessageCallback)
            : (maybeCb as SendMessageCallback | undefined);
        cb?.({
          success: true,
          data: { model: 'gpt-4o', choices: [{ message: { role: 'assistant', content: 'OK' } }] },
          logs: [],
        });
      }
    );

    const modal = new AzureSettingsModal(root, { cfgMgr, onSaved });
    modal.open();
    fillForm(root, {
      model: 'gpt-4o',
      endpoint:
        'https://example.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview',
      apiKey: 'test-key-123',
    });

    root.querySelector<HTMLButtonElement>('#azure-test-btn')!.click();

    await vi.waitFor(
      () => {
        const status = root.querySelector<HTMLElement>('.config-status');
        return !!status?.className?.includes('config-status--success');
      },
      { timeout: 3000 }
    );

    const status = root.querySelector<HTMLElement>('.config-status');
    expect(status?.textContent?.toLowerCase()).toMatch(/success|connected|✓/);
  });

  it('Given failed Test Connection, shows error status', async () => {
    mockSendMessage.mockImplementation(
      (_msg: unknown, optOrCb?: unknown, maybeCb?: unknown): void => {
        const cb =
          typeof optOrCb === 'function'
            ? (optOrCb as SendMessageCallback)
            : (maybeCb as SendMessageCallback | undefined);
        cb?.({ success: false, error: 'Unauthorized', logs: [] });
      }
    );

    const modal = new AzureSettingsModal(root, { cfgMgr, onSaved });
    modal.open();
    fillForm(root, {
      model: 'gpt-4o',
      endpoint:
        'https://example.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-08-01-preview',
      apiKey: 'bad-key',
    });

    root.querySelector<HTMLButtonElement>('#azure-test-btn')!.click();

    await vi.waitFor(
      () => {
        const status = root.querySelector<HTMLElement>('.config-status');
        return !!status?.className?.includes('config-status--error');
      },
      { timeout: 3000 }
    );

    const status = root.querySelector<HTMLElement>('.config-status');
    expect(status?.textContent).toContain('Unauthorized');
  });
});
