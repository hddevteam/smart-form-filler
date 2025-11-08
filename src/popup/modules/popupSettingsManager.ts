/**
 * PopupSettingsManager - Handles backend configuration, settings persistence and UI
 * TypeScript migration with strict types
 */

import type { PopupManagerLike, ApiClientLike } from '../../types/popup';
import { Logger } from '../../utils/logger';

const logger = new Logger('PopupSettingsManager');

export interface PopupSettings {
  backendUrl: string;
  preferredModel: string | null;
  autoConnect: boolean;
}

const DEFAULT_SETTINGS: PopupSettings = {
  backendUrl: 'http://localhost:3001',
  preferredModel: null,
  autoConnect: true,
};

const SETTINGS_KEY = 'smart-form-filler-settings';

export class PopupSettingsManager {
  private popupManager: PopupManagerLike;
  private settings: PopupSettings;

  constructor(popupManager: PopupManagerLike) {
    this.popupManager = popupManager;
    this.settings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Initialize settings manager
   */
  initialize(): void {
    this.loadSettings();
    this.setupSettingsModal();
    this.applyBackendUrl();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as Partial<PopupSettings>;
        this.settings = { ...this.settings, ...parsed };
        logger.info('Settings loaded:', this.settings);
      }
    } catch (error) {
      logger.warn('Failed to load settings from localStorage:', error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      logger.info('Settings saved:', this.settings);
    } catch (error) {
      logger.error('Failed to save settings:', error);
    }
  }

  /**
   * Get current backend URL
   */
  getBackendUrl(): string {
    return this.settings.backendUrl;
  }

  /**
   * Set backend URL and save
   */
  setBackendUrl(url: string): void {
    this.settings.backendUrl = url;
    this.saveSettings();
  }

  /**
   * Apply backend URL to API client
   */
  private applyBackendUrl(): void {
    if (this.popupManager.apiClient && this.settings.backendUrl) {
      if (typeof this.popupManager.apiClient.setBackendUrl === 'function') {
        this.popupManager.apiClient.setBackendUrl(this.settings.backendUrl);
      }
      logger.info('Backend URL applied:', this.settings.backendUrl);
    } else {
      logger.warn('Cannot apply backend URL:', {
        hasApiClient: !!this.popupManager.apiClient,
        hasBackendUrl: !!this.settings.backendUrl,
      });
    }
  }

  /**
   * Setup settings modal functionality
   */
  private setupSettingsModal(): void {
    logger.info('Setting up settings modal...');

    const elements = this.popupManager.elements;
    const {
      settingsBtn,
      settingsModal,
      settingsModalClose,
      backendUrlInput,
      testConnectionBtn,
      connectionStatus,
      saveSettingsBtn,
      settingsCancelBtn,
    } = elements;

    logger.info('Settings elements status:', {
      settingsBtn: !!settingsBtn,
      settingsModal: !!settingsModal,
      settingsModalClose: !!settingsModalClose,
      backendUrlInput: !!backendUrlInput,
      testConnectionBtn: !!testConnectionBtn,
      connectionStatus: !!connectionStatus,
      saveSettingsBtn: !!saveSettingsBtn,
    });

    if (!settingsBtn || !settingsModal) {
      logger.warn('Settings modal elements not found');
      return;
    }

    // Open settings modal
    settingsBtn.addEventListener('click', () => {
      logger.info('Settings button clicked!');
      this.openSettingsModal();
    });

    // Close settings modal
    if (settingsModalClose) {
      settingsModalClose.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }

    // Cancel button
    if (settingsCancelBtn) {
      settingsCancelBtn.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }

    // Close modal when clicking outside
    settingsModal.addEventListener('click', (e: MouseEvent) => {
      if (e.target === settingsModal) {
        this.closeSettingsModal();
      }
    });

    // Test connection button
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', () => {
        void this.testConnection();
      });
    }

    // Save settings button
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        void this.saveSettingsFromModal();
      });
    }

    // Auto-test connection when URL changes
    if (backendUrlInput) {
      backendUrlInput.addEventListener('input', () => {
        this.clearConnectionStatus();
      });
    }
  }

  /**
   * Open settings modal and populate with current values
   */
  private openSettingsModal(): void {
    logger.info('Opening settings modal...');
    const elements = this.popupManager.elements;
    const settingsModal = elements.settingsModal;
    const backendUrlInput = elements.backendUrlInput;

    if (settingsModal) {
      // Remove hidden class first, then set display
      settingsModal.classList.remove('hidden');
      settingsModal.style.display = 'flex'; // Use flex to ensure proper centering

      // Force a reflow to ensure styles are applied
      void settingsModal.offsetHeight;

      logger.info('Settings modal opened', {
        classList: settingsModal.classList.toString(),
        display: settingsModal.style.display,
        position: window.getComputedStyle(settingsModal).position,
        zIndex: window.getComputedStyle(settingsModal).zIndex,
      });
    } else {
      logger.error('Settings modal element not found');
    }

    if (backendUrlInput) {
      backendUrlInput.value = this.settings.backendUrl;
    }

    this.clearConnectionStatus();
  }

  /**
   * Close settings modal
   */
  private closeSettingsModal(): void {
    logger.info('Closing settings modal...');
    const settingsModal = this.popupManager.elements.settingsModal;
    if (settingsModal) {
      settingsModal.style.display = 'none';
      settingsModal.classList.add('hidden');
      logger.info('Settings modal closed');
    }
  }

  /**
   * Test connection to backend
   */
  private async testConnection(): Promise<void> {
    const elements = this.popupManager.elements;
    const backendUrlInput = elements.backendUrlInput;
    const testConnectionBtn = elements.testConnectionBtn;
    const connectionStatus = elements.connectionStatus;

    if (!backendUrlInput || !connectionStatus) {
      logger.warn('Test connection elements not found');
      return;
    }

    const testUrl = backendUrlInput.value.trim();
    if (!testUrl) {
      this.showConnectionStatus('Please enter a backend URL', 'error');
      return;
    }

    // Disable test button and show loading
    if (testConnectionBtn) {
      testConnectionBtn.setAttribute('disabled', 'true');
      const btnText = testConnectionBtn.querySelector('.btn__text');
      if (btnText) {
        btnText.textContent = 'Testing...';
      } else {
        testConnectionBtn.textContent = 'Testing...';
      }
    }

    try {
      // Create temporary API client for testing
      const apiClient = this.popupManager.apiClient;
      if (!apiClient) {
        throw new Error('API client not available');
      }

      const TempClient = apiClient.constructor as new () => ApiClientLike;
      const tempApiClient = new TempClient();
      if (typeof tempApiClient.setBackendUrl === 'function') {
        tempApiClient.setBackendUrl(testUrl);
      }

      // Test basic health check
      const response = (await (typeof tempApiClient.testConnection === 'function'
        ? tempApiClient.testConnection()
        : Promise.resolve({ success: false, error: 'not supported' }))) as {
        success: boolean;
        error?: string;
      };

      if (response.success) {
        this.showConnectionStatus('✅ Connection successful', 'success');
      } else {
        this.showConnectionStatus(
          '❌ Connection failed: ' + (response.error || 'Unknown error'),
          'error'
        );
      }
    } catch (error) {
      logger.error('Connection test failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showConnectionStatus('❌ Connection failed: ' + message, 'error');
    } finally {
      // Re-enable test button
      if (testConnectionBtn) {
        testConnectionBtn.removeAttribute('disabled');
        const btnText = testConnectionBtn.querySelector('.btn__text');
        if (btnText) {
          btnText.textContent = 'Test';
        } else {
          testConnectionBtn.textContent = 'Test Connection';
        }
      }
    }
  }

  /**
   * Show connection status message
   */
  private showConnectionStatus(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    const connectionStatus = this.popupManager.elements.connectionStatus;
    if (!connectionStatus) return;

    connectionStatus.textContent = message;
    connectionStatus.className = `connection-status ${type}`;
    connectionStatus.style.display = 'block';
  }

  /**
   * Clear connection status
   */
  private clearConnectionStatus(): void {
    const connectionStatus = this.popupManager.elements.connectionStatus;
    if (connectionStatus) {
      connectionStatus.style.display = 'none';
      connectionStatus.textContent = '';
    }
  }

  /**
   * Save settings from modal
   */
  private async saveSettingsFromModal(): Promise<void> {
    const elements = this.popupManager.elements;
    const backendUrlInput = elements.backendUrlInput;
    const saveSettingsBtn = elements.saveSettingsBtn;

    if (!backendUrlInput) {
      logger.warn('Backend URL input not found');
      return;
    }

    const newBackendUrl = backendUrlInput.value.trim();
    if (!newBackendUrl) {
      this.showConnectionStatus('Please enter a valid backend URL', 'error');
      return;
    }

    // Disable save button during save
    if (saveSettingsBtn) {
      saveSettingsBtn.setAttribute('disabled', 'true');
      saveSettingsBtn.textContent = 'Saving...';
    }

    try {
      // Save the new URL
      const oldUrl = this.settings.backendUrl;
      this.setBackendUrl(newBackendUrl);

      // Apply the new URL to API client
      this.applyBackendUrl();

      // If URL changed, reload models
      if (oldUrl !== newBackendUrl) {
        logger.info('Backend URL changed, reloading models...');
        await this.popupManager.modelManager?.loadModels();
      }

      this.showConnectionStatus('✅ Settings saved successfully', 'success');

      // Close modal after delay
      setTimeout(() => {
        this.closeSettingsModal();
      }, 1500);
    } catch (error) {
      logger.error('Failed to save settings:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.showConnectionStatus('❌ Failed to save settings: ' + message, 'error');
    } finally {
      // Re-enable save button
      if (saveSettingsBtn) {
        saveSettingsBtn.removeAttribute('disabled');
        saveSettingsBtn.textContent = 'Save Settings';
      }
    }
  }

  /**
   * Reset settings to default values
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    logger.info('Settings reset to defaults');
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): void {
    try {
      const settingsJson = JSON.stringify(this.settings, null, 2);
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-form-filler-settings.json';
      a.click();

      URL.revokeObjectURL(url);
      logger.info('Settings exported');
    } catch (error) {
      logger.error('Failed to export settings:', error);
    }
  }

  /**
   * Import settings from JSON file
   */
  async importSettings(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const importedSettings = JSON.parse(text) as unknown;

      // Validate imported settings
      if (typeof importedSettings === 'object' && importedSettings !== null) {
        this.settings = {
          ...this.settings,
          ...(importedSettings as Partial<PopupSettings>),
        };
        this.saveSettings();
        this.applyBackendUrl();
        logger.info('Settings imported successfully');
        return true;
      } else {
        throw new Error('Invalid settings file format');
      }
    } catch (error) {
      logger.error('Failed to import settings:', error);
      return false;
    }
  }
}
