import type { PopupManagerLike, ApiClientLike } from '@/types/popup';
import { Logger } from '@/utils/logger';

interface SettingsState {
  backendUrl: string;
  preferredModel: string | null;
  autoConnect: boolean;
}

export class PopupSettingsManager {
  private popupManager: PopupManagerLike;
  private logger = Logger.forScope('PopupSettingsManager');
  private settings: SettingsState = {
    backendUrl: 'http://localhost:3001',
    preferredModel: null,
    autoConnect: true,
  };

  constructor(popupManager: PopupManagerLike) {
    this.popupManager = popupManager;
  }

  async initialize(): Promise<void> {
    this.loadSettings();
    this.setupSettingsModal();
    this.applyBackendUrl();
    // Keep method async to maintain API compatibility during migration
    await Promise.resolve();
  }

  loadSettings(): void {
    try {
      const saved = localStorage.getItem('smart-form-filler-settings');
      if (saved) this.settings = { ...this.settings, ...JSON.parse(saved) };
    } catch (error) {
      this.logger.warn('Failed to load settings from localStorage', error);
    }
  }

  saveSettings(): void {
    try {
      localStorage.setItem('smart-form-filler-settings', JSON.stringify(this.settings));
    } catch (error) {
      this.logger.error('Failed to save settings', error);
    }
  }

  getBackendUrl(): string {
    return this.settings.backendUrl;
  }

  setBackendUrl(url: string): void {
    this.settings.backendUrl = url;
    this.saveSettings();
  }

  applyBackendUrl(): void {
    const client: ApiClientLike | undefined = this.popupManager.apiClient;
    if (client && this.settings.backendUrl && typeof client.setBackendUrl === 'function') {
      client.setBackendUrl(this.settings.backendUrl);
    } else {
      this.logger.warn('Cannot apply backend URL', {
        hasApiClient: !!client,
        hasBackendUrl: !!this.settings.backendUrl,
      });
    }
  }

  setupSettingsModal(): void {
    const {
      settingsBtn,
      settingsModal,
      settingsModalClose,
      backendUrlInput,
      testConnectionBtn,
      saveSettingsBtn,
      settingsCancelBtn,
    } = this.popupManager.elements;

    if (!settingsBtn || !settingsModal) return;

    settingsBtn.addEventListener('click', () => this.openSettingsModal());
    settingsModalClose?.addEventListener('click', () => this.closeSettingsModal());
    settingsCancelBtn?.addEventListener('click', () => this.closeSettingsModal());
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) this.closeSettingsModal();
    });
    testConnectionBtn?.addEventListener('click', () => {
      void this.testConnection();
    });
    saveSettingsBtn?.addEventListener('click', () => {
      void this.saveSettingsFromModal();
    });
    backendUrlInput?.addEventListener('input', () => this.clearConnectionStatus());
  }

  openSettingsModal(): void {
    const { settingsModal, backendUrlInput } = this.popupManager.elements;
    if (settingsModal) {
      settingsModal.classList.remove('hidden');
      settingsModal.style.display = 'flex';
      // force reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      settingsModal.offsetHeight;
    }
    if (backendUrlInput) backendUrlInput.value = this.settings.backendUrl;
    this.clearConnectionStatus();
  }

  closeSettingsModal(): void {
    const { settingsModal } = this.popupManager.elements;
    if (settingsModal) {
      settingsModal.style.display = 'none';
      settingsModal.classList.add('hidden');
    }
  }

  async testConnection(): Promise<void> {
    const { backendUrlInput, testConnectionBtn, connectionStatus } = this.popupManager.elements;
    if (!backendUrlInput || !connectionStatus) return;

    const testUrl = backendUrlInput.value.trim();
    if (!testUrl) {
      this.showConnectionStatus('Please enter a backend URL', 'error');
      return;
    }

    if (testConnectionBtn) {
      testConnectionBtn.setAttribute('data-loading', 'true');
    }

    try {
      const ctor = this.popupManager.apiClient?.constructor;
      if (typeof ctor !== 'function') {
        this.showConnectionStatus('❌ Connection failed: client unavailable', 'error');
        return;
      }
      const tempClient = new (ctor as new () => ApiClientLike)();
      if (typeof tempClient.setBackendUrl === 'function') {
        tempClient.setBackendUrl(testUrl);
      }
      const response = (await (typeof tempClient.testConnection === 'function'
        ? tempClient.testConnection()
        : Promise.resolve({ success: false, error: 'not supported' }))) as {
        success: boolean;
        error?: string;
      };
      if (response.success) {
        this.showConnectionStatus('✅ Connection successful', 'success');
      } else {
        this.showConnectionStatus(
          `❌ Connection failed: ${response.error || 'Unknown error'}`,
          'error'
        );
      }
    } catch (error) {
      const message = (error as { message?: string })?.message || 'Unknown error';
      this.showConnectionStatus(`❌ Connection failed: ${message}`, 'error');
    } finally {
      if (testConnectionBtn) testConnectionBtn.removeAttribute('data-loading');
    }
  }

  showConnectionStatus(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const { connectionStatus } = this.popupManager.elements;
    if (!connectionStatus) return;
    connectionStatus.textContent = message;
    connectionStatus.className = `connection-status ${type}`;
    connectionStatus.style.display = 'block';
  }

  clearConnectionStatus(): void {
    const { connectionStatus } = this.popupManager.elements;
    if (connectionStatus) {
      connectionStatus.style.display = 'none';
      connectionStatus.textContent = '';
    }
  }

  async saveSettingsFromModal(): Promise<void> {
    const { backendUrlInput, saveSettingsBtn } = this.popupManager.elements;
    if (!backendUrlInput) return;

    const newBackendUrl = backendUrlInput.value.trim();
    if (!newBackendUrl) {
      this.showConnectionStatus('Please enter a valid backend URL', 'error');
      return;
    }

    saveSettingsBtn?.setAttribute('data-loading', 'true');
    try {
      const oldUrl = this.settings.backendUrl;
      this.setBackendUrl(newBackendUrl);
      this.applyBackendUrl();
      if (oldUrl !== newBackendUrl && this.popupManager.modelManager) {
        await this.popupManager.modelManager.loadModels();
      }
      this.showConnectionStatus('✅ Settings saved successfully', 'success');
      setTimeout(() => this.closeSettingsModal(), 1500);
    } catch (error) {
      const message = (error as { message?: string })?.message || 'Unknown error';
      this.showConnectionStatus(`❌ Failed to save settings: ${message}`, 'error');
    } finally {
      saveSettingsBtn?.removeAttribute('data-loading');
    }
  }

  resetSettings(): void {
    this.settings = {
      backendUrl: 'http://localhost:3001',
      preferredModel: null,
      autoConnect: true,
    };
    this.saveSettings();
  }

  exportSettings(): void {
    try {
      const blob = new Blob([JSON.stringify(this.settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-form-filler-settings.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // swallow export error silently; UI remains unchanged
    }
  }

  async importSettings(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (typeof imported === 'object' && imported !== null) {
        this.settings = { ...this.settings, ...imported };
        this.saveSettings();
        this.applyBackendUrl();
        return true;
      }
      throw new Error('Invalid settings file format');
    } catch {
      return false;
    }
  }
}
