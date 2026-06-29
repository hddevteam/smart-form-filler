import { ApiConfigManager, type ApiConfig } from '@/config/apiConfigManager';
import { Logger } from '@/utils/logger';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';

export interface AzureSettingsModalDeps {
  cfgMgr?: ApiConfigManager;
  onSaved?: () => void;
}

/**
 * Modal to add/test Azure model configuration.
 * Saves to chrome.storage.local via ApiConfigManager.
 * Test Connection routes via Background SW — no direct backend calls.
 */
export class AzureSettingsModal {
  private root: HTMLElement;
  private deps: AzureSettingsModalDeps & { cfgMgr: ApiConfigManager };
  private logger = Logger.forScope('AzureSettingsModal');

  constructor(root: HTMLElement, deps?: AzureSettingsModalDeps) {
    this.root = root;
    this.deps = {
      cfgMgr: deps?.cfgMgr ?? new ApiConfigManager(),
      ...(deps?.onSaved ? { onSaved: deps.onSaved } : {}),
    };
  }

  open(): void {
    this.root.innerHTML = this.markup();
    const dialog = this.root.querySelector<HTMLDivElement>('.modal');
    const closeBtn = this.root.querySelector<HTMLButtonElement>('#azure-close');
    const form = this.root.querySelector<HTMLFormElement>('#azure-form');
    const testBtn = this.root.querySelector<HTMLButtonElement>('#azure-test-btn');
    closeBtn?.addEventListener('click', () => this.close());
    form?.addEventListener('submit', e => {
      e.preventDefault();
      void this.handleSave();
    });
    testBtn?.addEventListener('click', () => void this.handleTestConnection());
    dialog?.classList.add('open');
  }

  close(): void {
    this.root.innerHTML = '';
  }

  private markup(): string {
    return `
      <div class="modal">
        <div class="modal__content">
          <div class="modal__header">
            <h3 class="modal__title">Azure Model Settings</h3>
            <button id="azure-close" class="btn--icon" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form id="azure-form">
            <div class="modal__body">
              <div class="form-group">
                <label class="form-label" for="azure-model">Model (Deployment) <span class="required">*</span></label>
                <input id="azure-model" name="model" class="input" placeholder="gpt-4o" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="azure-endpoint">Endpoint <span class="required">*</span></label>
                <input id="azure-endpoint" name="endpoint" class="input" placeholder="https://<resource>.openai.azure.com/openai/deployments/<model>/chat/completions?api-version=..." required />
              </div>
              <div class="form-group">
                <label class="form-label" for="azure-apikey">API Key <span class="required">*</span></label>
                <input id="azure-apikey" name="apiKey" type="password" class="input" placeholder="Enter your API key" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="azure-name">Configuration Name <span class="optional">(optional)</span></label>
                <input id="azure-name" name="name" class="input" placeholder="Default uses model name" />
              </div>
              <div class="config-status" aria-live="polite"></div>
            </div>
            <div class="modal__footer">
              <button type="button" id="azure-test-btn" class="btn btn--secondary">Test Connection</button>
              <button type="submit" class="btn btn--primary btn--large">Save Configuration</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private readFields(): { model: string; endpoint: string; apiKey: string; name: string } {
    const model = (this.root.querySelector<HTMLInputElement>('#azure-model')?.value ?? '').trim();
    const endpoint = (
      this.root.querySelector<HTMLInputElement>('#azure-endpoint')?.value ?? ''
    ).trim();
    const apiKey = (this.root.querySelector<HTMLInputElement>('#azure-apikey')?.value ?? '').trim();
    const name =
      (this.root.querySelector<HTMLInputElement>('#azure-name')?.value ?? '').trim() ||
      model ||
      'Azure';
    return { model, endpoint, apiKey, name };
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info' | ''): void {
    const status = this.root.querySelector<HTMLElement>('.config-status');
    if (!status) return;
    status.textContent = message;
    const base = 'config-status';
    status.className = type ? `${base} ${base}--${type}` : base;
  }

  private async handleSave(): Promise<void> {
    const { model, endpoint, apiKey, name } = this.readFields();
    if (!model || !endpoint || !apiKey) {
      this.setStatus('Please fill out all required fields', 'error');
      return;
    }
    const cfg: ApiConfig = { provider: 'azure', name, endpoint, apiKey, model };
    try {
      await this.deps.cfgMgr.saveConfig(cfg);
      this.setStatus('✓ Configuration saved successfully', 'success');
      this.logger.info('Azure config saved', { name });
      setTimeout(() => {
        this.close();
        this.deps.onSaved?.();
      }, 800);
    } catch (error) {
      this.setStatus('✗ Failed to save configuration', 'error');
      this.logger.error('Failed to save azure config', error);
    }
  }

  /** Sends a minimal test request via Background SW (AI_REQUEST). Never calls backend directly. */
  private async handleTestConnection(): Promise<void> {
    const { model, endpoint, apiKey } = this.readFields();
    if (!model || !endpoint || !apiKey) {
      this.setStatus('Fill in model, endpoint, and API key first', 'error');
      return;
    }

    const testBtn = this.root.querySelector<HTMLButtonElement>('#azure-test-btn');
    if (testBtn) testBtn.disabled = true;
    this.setStatus('Testing connection…', 'info');

    const options: MakeRequestOptions = {
      apiUrl: endpoint,
      apiKey,
      model,
      messages: [{ role: 'user', content: 'ping' }],
    };

    try {
      const result = await new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: 'AI_REQUEST', options }, (resp: unknown) => {
            const lastError = chrome.runtime.lastError;
            if (lastError) {
              reject(new Error(lastError.message));
              return;
            }
            const r = (resp as { success?: boolean; error?: string }) ?? {};
            if (r.error) {
              resolve({ success: r.success ?? false, error: r.error });
            } else {
              resolve({ success: r.success ?? false });
            }
          });
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      });

      if (result.success) {
        this.setStatus('✓ Connection successful', 'success');
      } else {
        this.setStatus(`✗ ${result.error ?? 'Connection failed'}`, 'error');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.setStatus(`✗ ${msg}`, 'error');
    } finally {
      if (testBtn) testBtn.disabled = false;
    }
  }
}

export default AzureSettingsModal;
