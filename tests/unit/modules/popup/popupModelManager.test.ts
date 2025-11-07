import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PopupModelManager } from '@/modules/popup/popupModelManager';

describe('PopupModelManager', () => {
  let mgr: PopupModelManager;
  let popupManager: any;

  beforeEach(() => {
    const select = document.createElement('select');
    const refreshBtn = document.createElement('button');
    popupManager = {
      elements: { globalModelSelect: select, globalRefreshModelsBtn: refreshBtn },
      apiClient: {
        getAvailableModels: vi.fn().mockResolvedValue([{ id: 'm1', name: 'Model 1' }]),
        refreshOllamaModels: vi.fn().mockResolvedValue(undefined),
      },
      uiController: {
        setModelDependentButtonsEnabled: vi.fn(),
        setSystemButtonsEnabled: vi.fn(),
        setButtonsEnabled: vi.fn(),
      },
      resultsHandler: { showError: vi.fn() },
      updateAuthenticationStatus: vi.fn(),
    };
    mgr = new PopupModelManager(popupManager);
  });

  it('loadModels populates select and enables UI', async () => {
    await mgr.loadModels();
    expect(popupManager.elements.globalModelSelect?.disabled).toBe(false);
    expect(popupManager.uiController.setModelDependentButtonsEnabled).toHaveBeenCalledWith(true);
  });

  it('refreshModels calls API and reloads list', async () => {
    await mgr.refreshModels();
    expect(popupManager.apiClient.refreshOllamaModels).toHaveBeenCalled();
  });
});
