import { Logger } from '@/utils/logger';

export interface ConfigurationUIDeps<Config = unknown> {
  saveConfig: (config: Config) => Promise<void>;
  loadConfig?: () => Promise<Config | undefined>;
  validateConfig?: (config: Config) => string[]; // return list of errors
  listConfigs?: () => Promise<Config[]>; // optional: used to prefill
  onProviderChange?: (provider: ProviderType) => Promise<void> | void; // optional: react to provider changes
}

export type ProviderType = 'azure' | 'ollama';

export interface BasicApiConfig {
  provider: ProviderType;
  name: string;
  endpoint: string;
  apiKey?: string;
  model?: string;
}

export class ConfigurationUI<TConfig extends BasicApiConfig = BasicApiConfig> {
  private container: HTMLElement;
  private deps: ConfigurationUIDeps<TConfig>;
  private logger = Logger.forScope('ConfigurationUI');

  constructor(container: HTMLElement, deps: ConfigurationUIDeps<TConfig>) {
    this.container = container;
    this.deps = deps;
  }

  async render(): Promise<void> {
    this.container.innerHTML = this.getTemplate();
    this.bindEvents();
    await this.prefillFromLoadedConfig();
    await this.addRecentList();
  }

  private getTemplate(): string {
    return `
      <form class="config-form">
        <div class="form-row">
          <label>Provider</label>
          <select name="provider" class="input">
            <option value="azure">Azure OpenAI</option>
            <option value="ollama">Ollama (Local)</option>
          </select>
        </div>
        <div class="form-row">
          <label>Name</label>
          <input name="name" class="input" placeholder="My Provider" />
        </div>
        <div class="form-row">
          <label>Endpoint</label>
          <input name="endpoint" class="input" placeholder="http://localhost:11434" />
        </div>
        <div class="form-row">
          <label>API Key (optional)</label>
          <input name="apiKey" class="input" type="password" />
        </div>
        <div class="form-row">
          <label>Model (optional)</label>
          <input name="model" class="input" placeholder="gpt-4o | llama3" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn--primary">Save</button>
        </div>
        <div class="config-status" role="status" aria-live="polite"></div>
      </form>
    `;
  }

  private bindEvents(): void {
    const form = this.container.querySelector('form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      void this.handleSubmit();
    });

    // Handle provider change: Ollama requires no save; auto-discover models
    const providerEl = form.querySelector<HTMLSelectElement>('select[name="provider"]');
    const saveBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    providerEl?.addEventListener('change', () => {
      const provider = (providerEl.value as ProviderType) ?? 'azure';
      if (provider === 'ollama') {
        if (saveBtn) saveBtn.disabled = true;
        this.setStatus('Local Ollama models are auto-discovered. No save required.', 'info');
      } else {
        if (saveBtn) saveBtn.disabled = false;
        this.setStatus('Configure your cloud provider and save.', 'info');
      }
      try {
        void this.deps.onProviderChange?.(provider);
      } catch (err) {
        this.logger.warn('onProviderChange handler failed', err);
      }
    });
  }

  private async prefillFromLoadedConfig(): Promise<void> {
    try {
      if (!this.deps.loadConfig) return;
      const cfg = await this.deps.loadConfig();
      if (!cfg) return;
      const form = this.container.querySelector<HTMLFormElement>('form');
      if (!form) return;
      const apiCfg = cfg as BasicApiConfig;
      const providerEl = form.querySelector<HTMLSelectElement>('select[name="provider"]');
      const nameEl = form.querySelector<HTMLInputElement>('input[name="name"]');
      const endpointEl = form.querySelector<HTMLInputElement>('input[name="endpoint"]');
      const apiKeyEl = form.querySelector<HTMLInputElement>('input[name="apiKey"]');
      const modelEl = form.querySelector<HTMLInputElement>('input[name="model"]');
      if (providerEl) providerEl.value = apiCfg.provider;
      if (nameEl) nameEl.value = apiCfg.name ?? '';
      if (endpointEl) endpointEl.value = apiCfg.endpoint ?? '';
      if (apiKeyEl) apiKeyEl.value = apiCfg.apiKey ?? '';
      if (modelEl) modelEl.value = apiCfg.model ?? '';
    } catch (error) {
      this.logger.warn('Failed to prefill config', error);
    }
  }

  private async addRecentList(): Promise<void> {
    try {
      if (!this.deps.listConfigs) return;
      const list = await this.deps.listConfigs();
      if (!list || list.length === 0) return;
      const form = this.container.querySelector<HTMLFormElement>('form');
      if (!form) return;
      const actions = form.querySelector('.form-actions');
      if (!actions) return;
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.ariaLabel = 'Recent Configurations';
      for (const c of list as BasicApiConfig[]) {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name} (${c.provider})`;
        sel.appendChild(opt);
      }
      const wrapper = document.createElement('div');
      wrapper.className = 'form-row';
      const label = document.createElement('label');
      label.textContent = 'Recent';
      wrapper.appendChild(label);
      wrapper.appendChild(sel);
      actions.parentElement?.insertBefore(wrapper, actions);

      sel.addEventListener('change', () => {
        const items = list as BasicApiConfig[];
        const picked = items.find(c => c.name === sel.value);
        if (!picked) return;
        const providerEl = form.querySelector<HTMLSelectElement>('select[name="provider"]');
        const nameEl = form.querySelector<HTMLInputElement>('input[name="name"]');
        const endpointEl = form.querySelector<HTMLInputElement>('input[name="endpoint"]');
        const apiKeyEl = form.querySelector<HTMLInputElement>('input[name="apiKey"]');
        const modelEl = form.querySelector<HTMLInputElement>('input[name="model"]');
        if (providerEl) providerEl.value = picked.provider;
        if (nameEl) nameEl.value = picked.name ?? '';
        if (endpointEl) endpointEl.value = picked.endpoint ?? '';
        if (apiKeyEl) apiKeyEl.value = picked.apiKey ?? '';
        if (modelEl) modelEl.value = picked.model ?? '';
        this.setStatus(`Loaded configuration: ${picked.name}`, 'info');
      });
    } catch (error) {
      this.logger.warn('Failed to add recent list', error);
    }
  }

  private readForm(): TConfig {
    const form = this.container.querySelector('form') as HTMLFormElement;
    const provider = (form.elements.namedItem('provider') as HTMLSelectElement)
      .value as ProviderType;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
    const endpoint = (form.elements.namedItem('endpoint') as HTMLInputElement).value.trim();
    const apiKey = (form.elements.namedItem('apiKey') as HTMLInputElement).value.trim();
    const model = (form.elements.namedItem('model') as HTMLInputElement).value.trim();
    return {
      provider,
      name,
      endpoint,
      apiKey: apiKey || undefined,
      model: model || undefined,
    } as unknown as TConfig;
  }

  private validate(config: TConfig): string[] {
    const errors: string[] = [];
    if (!config.name) errors.push('Name is required');
    if (!config.endpoint) errors.push('Endpoint is required');
    if (this.deps.validateConfig) errors.push(...this.deps.validateConfig(config));
    return errors;
  }

  private setStatus(message: string, kind: 'info' | 'success' | 'error'): void {
    const el = this.container.querySelector('.config-status');
    if (!el) return;
    el.textContent = message;
    (el as HTMLElement).className = `config-status ${kind}`;
  }

  private async handleSubmit(): Promise<void> {
    const config = this.readForm();
    const errors = this.validate(config);
    if (errors.length > 0) {
      this.setStatus(`❌ ${errors.join(', ')}`, 'error');
      return;
    }
    try {
      await this.deps.saveConfig(config);
      this.setStatus('✅ Configuration saved', 'success');
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.setStatus(`❌ Failed to save: ${msg}`, 'error');
    }
  }
}

export default ConfigurationUI;
