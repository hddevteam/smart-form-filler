import type { PopupManagerLike } from '@/types/popup';

export class PopupModelManager {
  private popupManager: PopupManagerLike;

  constructor(popupManager: PopupManagerLike) {
    this.popupManager = popupManager;
  }

  getSelectedModel(): string | null {
    const selectedValue = this.popupManager.elements.globalModelSelect?.value;
    if (!selectedValue || this.popupManager.elements.globalModelSelect?.disabled) return null;
    return selectedValue;
  }

  setSelectedModel(modelId: string): void {
    if (this.popupManager.elements.globalModelSelect) {
      this.popupManager.elements.globalModelSelect.value = modelId;
    }
  }

  async loadModels(): Promise<void> {
    try {
      if (!this.popupManager.apiClient) throw new Error('API client not initialized');
      const models = await (this.popupManager.apiClient as any).getAvailableModels();
      if (!models || models.length === 0) {
        this.handleNoModelsAvailable();
        return;
      }
      const grouped = this.groupModelsByType(models);
      if (this.popupManager.elements.globalModelSelect) {
        this.populateModelSelect(this.popupManager.elements.globalModelSelect, grouped, models);
        this.popupManager.elements.globalModelSelect.disabled = false;
        const preferred = this.getPreferredModel(models);
        if (preferred) this.setSelectedModel(preferred);
      }
      this.popupManager.uiController?.setModelDependentButtonsEnabled(true);
      this.popupManager.uiController?.setSystemButtonsEnabled(true);
    } catch (error: any) {
      this.handleModelLoadError(error);
    }
  }

  groupModelsByType(models: any[]): { cloud: any[]; ollama: any[] } {
    const grouped = { cloud: [] as any[], ollama: [] as any[] };
    for (const model of models) {
      if (
        model.source === 'ollama' ||
        model.id?.includes('ollama') ||
        model.name?.toLowerCase().includes('ollama')
      )
        grouped.ollama.push(model);
      else grouped.cloud.push(model);
    }
    return grouped;
  }

  populateModelSelect(
    selectElement: HTMLSelectElement,
    grouped: { cloud: any[]; ollama: any[] },
    allModels: any[]
  ): void {
    selectElement.innerHTML = '';
    if (grouped.cloud.length > 0) {
      const cloudGroup = document.createElement('optgroup');
      cloudGroup.label = 'Cloud Models';
      grouped.cloud.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name || model.id;
        if (model.description) option.title = model.description;
        cloudGroup.appendChild(option);
      });
      selectElement.appendChild(cloudGroup);
    }
    if (grouped.ollama.length > 0) {
      const ollamaGroup = document.createElement('optgroup');
      ollamaGroup.label = 'Local Models (Ollama)';
      grouped.ollama.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name || model.id;
        if (model.description) option.title = model.description;
        ollamaGroup.appendChild(option);
      });
      selectElement.appendChild(ollamaGroup);
    }
    if (grouped.cloud.length === 0 && grouped.ollama.length === 0) {
      allModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name || model.id;
        if (model.description) option.title = model.description;
        selectElement.appendChild(option);
      });
    }
    if (selectElement.children.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No models available';
      option.disabled = true;
      selectElement.appendChild(option);
    }
  }

  getPreferredModel(models: any[]): string | null {
    if (!models || models.length === 0) return null;
    const saved = localStorage.getItem('smart-form-filler-selected-model');
    if (saved && models.find(m => m.id === saved)) return saved;
    return models[0].id;
  }

  handleNoModelsAvailable(): void {
    if (this.popupManager.elements.globalModelSelect) {
      this.popupManager.elements.globalModelSelect.innerHTML =
        '<option value="">No models available</option>';
      this.popupManager.elements.globalModelSelect.disabled = true;
    }
    this.popupManager.uiController?.setModelDependentButtonsEnabled(false);
    this.popupManager.uiController?.setSystemButtonsEnabled(true);
    this.popupManager.updateAuthenticationStatus?.();
  }

  handleModelLoadError(error: any): void {
    if (this.popupManager.elements.globalModelSelect) {
      this.popupManager.elements.globalModelSelect.innerHTML =
        '<option value="">Service unavailable</option>';
      this.popupManager.elements.globalModelSelect.disabled = true;
    }
    this.popupManager.uiController?.setModelDependentButtonsEnabled(false);
    this.popupManager.uiController?.setSystemButtonsEnabled(true);
    this.popupManager.updateAuthenticationStatus?.();
    this.popupManager.resultsHandler?.showError(
      'Failed to load AI models: ' +
        error.message +
        '. You can still use Settings and Refresh buttons.'
    );
  }

  async refreshModels(): Promise<void> {
    try {
      const btn = this.popupManager.elements.globalRefreshModelsBtn;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn__icon">⏳</span>';
      }
      try {
        await (this.popupManager.apiClient as any).refreshOllamaModels();
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.warn(
          'Failed to refresh Ollama models (this is normal if Ollama is not running):',
          err.message
        );
      }
      await this.loadModels();
      this.showRefreshSuccess();
    } catch (error: any) {
      this.showRefreshError(error);
    } finally {
      const btn = this.popupManager.elements.globalRefreshModelsBtn;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn__icon">🔄</span>';
      }
    }
  }

  showRefreshSuccess(): void {
    const btn = this.popupManager.elements.globalRefreshModelsBtn;
    if (btn) {
      btn.innerHTML = '<span class="btn__icon">✅</span>';
      setTimeout(() => {
        if (btn) btn.innerHTML = '<span class="btn__icon">🔄</span>';
      }, 2000);
    }
  }

  showRefreshError(error: any): void {
    const btn = this.popupManager.elements.globalRefreshModelsBtn;
    if (btn) {
      btn.innerHTML = '<span class="btn__icon">❌</span>';
      btn.title = `Refresh failed: ${error.message}`;
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = '<span class="btn__icon">🔄</span>';
          btn.title = 'Refresh Ollama models';
        }
      }, 3000);
    }
  }

  saveSelectedModel(): void {
    const selected = this.getSelectedModel();
    if (selected) localStorage.setItem('smart-form-filler-selected-model', selected);
  }

  onModelSelectionChange(): void {
    this.saveSelectedModel();
    const selected = this.getSelectedModel();
    this.popupManager.uiController?.setButtonsEnabled?.(!!selected);
  }
}
