import { Logger } from '@/utils/logger';

export interface ModelSelectorDeps {
  loadModels: () => Promise<
    Array<{ id: string; name?: string; description?: string; source?: string }>
  >;
}

export class ModelSelector {
  private container: HTMLElement;
  private deps: ModelSelectorDeps;
  private logger = Logger.forScope('ModelSelector');

  constructor(container: HTMLElement, deps: ModelSelectorDeps) {
    this.container = container;
    this.deps = deps;
  }

  async render(): Promise<void> {
    this.container.innerHTML = `<select class="input" aria-label="Model"></select>`;
    const select = this.container.querySelector<HTMLSelectElement>('select');
    if (!select) return;
    try {
      const models = await this.deps.loadModels();
      this.populate(select, models);
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
    selectElement.disabled = !selectElement.children.length;
  }
}

export default ModelSelector;
