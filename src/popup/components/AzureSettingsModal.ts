import { ApiConfigManager, type ApiConfig } from '@/config/apiConfigManager';
import { Logger } from '@/utils/logger';

export interface AzureSettingsModalDeps {
  cfgMgr?: ApiConfigManager;
  onSaved?: () => void;
}

/**
 * Simple modal to add Azure model configuration.
 * Renders into a provided root container with id `modal-root`.
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
    closeBtn?.addEventListener('click', () => this.close());
    form?.addEventListener('submit', e => {
      e.preventDefault();
      void this.handleSave();
    });
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
                <input id="azure-endpoint" name="endpoint" class="input" placeholder="https://<resource>.openai.azure.com/..." required />
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
              <button type="submit" class="btn btn--primary btn--large">Save Configuration</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  private async handleSave(): Promise<void> {
    const model = (this.root.querySelector<HTMLInputElement>('#azure-model')?.value ?? '').trim();
    const endpoint = (
      this.root.querySelector<HTMLInputElement>('#azure-endpoint')?.value ?? ''
    ).trim();
    const apiKey = (this.root.querySelector<HTMLInputElement>('#azure-apikey')?.value ?? '').trim();
    const name =
      (this.root.querySelector<HTMLInputElement>('#azure-name')?.value ?? '').trim() ||
      model ||
      'Azure';
    const status = this.root.querySelector<HTMLElement>('.config-status');
    if (!model || !endpoint || !apiKey) {
      if (status) {
        status.textContent = 'Please fill out all required fields';
        status.className = 'config-status config-status--error';
      }
      return;
    }
    const cfg: ApiConfig = { provider: 'azure', name, endpoint, apiKey, model };
    try {
      await this.deps.cfgMgr.saveConfig(cfg);
      if (status) {
        status.textContent = '✓ Configuration saved successfully';
        status.className = 'config-status config-status--success';
      }
      this.logger.info('Azure config saved', { name });
      // Close dialog and trigger refresh after short delay
      setTimeout(() => {
        this.close();
        this.deps.onSaved?.();
      }, 800);
    } catch (error) {
      if (status) {
        status.textContent = '✗ Failed to save configuration';
        status.className = 'config-status config-status--error';
      }
      this.logger.error('Failed to save azure config', error);
    }
  }
}

export default AzureSettingsModal;
