import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PopupSettingsManager } from '@/modules/popup/popupSettingsManager';

describe('PopupSettingsManager', () => {
  let manager: PopupSettingsManager;
  let popupManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const elements = {
      settingsBtn: document.createElement('button'),
      settingsModal: document.createElement('div'),
      settingsModalClose: document.createElement('button'),
      backendUrlInput: document.createElement('input'),
      testConnectionBtn: document.createElement('button'),
      connectionStatus: document.createElement('div'),
      saveSettingsBtn: document.createElement('button'),
      settingsCancelBtn: document.createElement('button'),
    };
    popupManager = {
      elements,
      apiClient: { setBackendUrl: vi.fn(), testConnection: vi.fn().mockResolvedValue({ success: true }) },
      modelManager: { loadModels: vi.fn().mockResolvedValue(undefined) },
    };
    manager = new PopupSettingsManager(popupManager);
  });

  it('initialize loads settings and applies backend URL', async () => {
    await manager.initialize();
    expect(popupManager.apiClient.setBackendUrl).toHaveBeenCalled();
  });

  it('saveSettingsFromModal validates url and applies', async () => {
    popupManager.elements.backendUrlInput.value = 'http://localhost:3001';
    await manager.saveSettingsFromModal();
    expect(popupManager.apiClient.setBackendUrl).toHaveBeenCalledWith('http://localhost:3001');
  });

  it('testConnection shows success status', async () => {
    popupManager.elements.backendUrlInput.value = 'http://localhost:3001';
    await manager.testConnection();
    expect(popupManager.elements.connectionStatus.textContent).toContain('Connection');
  });
});
