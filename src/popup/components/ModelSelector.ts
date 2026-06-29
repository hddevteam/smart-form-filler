import { Logger } from '@/utils/logger';
import { getAvailableModels } from '@/config/modelRegistry';

export interface ModelSelectorDeps {
  loadModels: () => Promise<
    Array<{ id: string; name?: string; description?: string; source?: string }>
  >;
}

export class ModelSelector {
  private container: HTMLElement;
  private deps: ModelSelectorDeps;
  private logger = Logger.forScope('ModelSelector');

  constructor(container: HTMLElement, deps?: ModelSelectorDeps) {
    this.container = container;
    this.deps = deps ?? {
      loadModels: (): Promise<
        Array<{ id: string; name?: string; description?: string; source?: string }>
      > => {
        const models = getAvailableModels();
        const list = models.map(m => ({ id: m.name, name: m.name, source: m.provider }));
        return Promise.resolve(list);
      },
    };
  }

  async render(): Promise<void> {
    this.container.innerHTML = `<select id="globalModelSelect" class="input" aria-label="Model"><option value="">Loading models...</option></select>`;
    const select = this.container.querySelector<HTMLSelectElement>('select');
    if (!select) return;
    try {
      // eslint-disable-next-line no-console
      console.debug('[ModelSelector] Loading models...');
      const models = await this.deps.loadModels();
      // eslint-disable-next-line no-console
      console.debug('[ModelSelector] Loaded models count:', models.length);
      this.populate(select, models);
      // If no models discovered, show helpful empty state
      if (!select.children.length) {
        // eslint-disable-next-line no-console
        console.warn('[ModelSelector] No models available');
        select.innerHTML = '<option value="" disabled>No models available</option>';
        select.disabled = true;
      }
    } catch (error) {
      this.logger.error('Failed to load models', error);
      select.innerHTML = '<option value="">Service unavailable</option>';
      select.disabled = true;
    }
  }

  private populate(
    selectElement: HTMLSelectElement,
    models: Array<{ id: string; name?: string; description?: string; source?: string }>
  ): void {
    selectElement.innerHTML = '';
    const cloudGroup = document.createElement('optgroup');
    cloudGroup.label = 'Cloud Models';
    const localGroup = document.createElement('optgroup');
    localGroup.label = 'Local Models (Ollama)';
    for (const m of models) {
      // eslint-disable-next-line no-console
      console.debug('[ModelSelector] Adding model option:', m.id, m.source);
      const option = document.createElement('option');
      option.value = m.id;
      option.textContent = m.name ?? m.id;
      if (m.description) option.title = m.description;
      if (m.source === 'ollama') localGroup.appendChild(option);
      else cloudGroup.appendChild(option);
    }
    if (cloudGroup.children.length) selectElement.appendChild(cloudGroup);
    if (localGroup.children.length) selectElement.appendChild(localGroup);
    if (!selectElement.children.length) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'No models available';
      empty.disabled = true;
      selectElement.appendChild(empty);
    }
    // Enable if we have at least one OPTION under any group
    const optionCount = selectElement.querySelectorAll('option').length;
    selectElement.disabled = optionCount === 0;
  }
}

export default ModelSelector;
