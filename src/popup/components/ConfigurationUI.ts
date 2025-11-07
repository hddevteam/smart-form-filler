import { Logger } from '@/utils/logger';

export interface ConfigurationUIDeps<Config = unknown> {
  saveConfig: (config: Config) => Promise<void>;
  loadConfig?: () => Promise<Config | undefined>;
  validateConfig?: (config: Config) => string[]; // return list of errors
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
