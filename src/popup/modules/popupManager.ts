/**
 * PopupManager (TypeScript) - Main coordinator for popup functionality
 * Minimal implementation to satisfy tests while preserving behavior
 */

import type { PopupManagerLike, ApiClientLike } from '../../types/popup';
import type { DataSourceConfigObject } from '@/types/dataSource';

export class PopupManager implements PopupManagerLike {
  elements: Record<string, HTMLElement | HTMLInputElement | HTMLSelectElement | null>;
  apiClient?: ApiClientLike;
  uiController?: {
    setModelDependentButtonsEnabled(enabled: boolean): void;
    setSystemButtonsEnabled(enabled: boolean): void;
    setButtonsEnabled?(enabled: boolean): void;
  };
  resultsHandler?:
    | {
        showError: (message: string) => void;
        showMessage?: (message: string, type: string) => void;
        extractionHistory?: Array<{
          title?: string;
          url?: string;
          timestamp?: number;
          dataSources?: {
            markdown?: { content?: string };
            cleaned?: { content?: string };
            raw?: { content?: string };
          };
        }>;
      }
    | undefined;
  dataSourceManager?: {
    updateAvailableDataSources?: () => void;
    updateChatConfiguration: (config: Partial<DataSourceConfigObject>) => Promise<void> | void;
    updateFormFillerConfiguration: (
      config: Partial<DataSourceConfigObject>
    ) => Promise<void> | void;
  };

  // Simple operation tracker
  operationTracker: {
    currentOperation: null | { id: number; name: string; startTime: number };
    operationId: number;
    startOperation: (operationName: string) => number;
    isOperationActive: (operationId: number) => boolean;
    endOperation: (operationId: number) => void;
    cancelOperation: () => void;
  };

  activeOperations: Set<number>;
  isInitialized: boolean;

  constructor() {
    this.elements = {};
    this.activeOperations = new Set();
    this.isInitialized = false;

    this.operationTracker = {
      currentOperation: null,
      operationId: 0,
      startOperation: (operationName: string) => {
        this.operationTracker.operationId += 1;
        this.operationTracker.currentOperation = {
          id: this.operationTracker.operationId,
          name: operationName,
          startTime: Date.now(),
        };
        return this.operationTracker.operationId;
      },
      isOperationActive: (operationId: number) => {
        return (
          !!this.operationTracker.currentOperation &&
          this.operationTracker.currentOperation.id === operationId
        );
      },
      endOperation: (_operationId: number) => {
        this.operationTracker.currentOperation = null;
      },
      cancelOperation: () => {
        this.operationTracker.currentOperation = null;
      },
    };
  }

  /**
   * Set initial loading state for models
   */
  setInitialLoadingState(): void {
    const globalModelSelect = this.elements.globalModelSelect as HTMLSelectElement | null;
    if (globalModelSelect) {
      globalModelSelect.innerHTML = '<option value="">Loading models...</option>';
      globalModelSelect.disabled = true;
    }

    // Disable model-dependent buttons
    const modelDependentButtons = [
      'extractDataBtn',
      'mainChatBtn',
      'detectFormsBtn',
      'analyzeContentBtn',
      'fillFormsBtn',
    ];
    modelDependentButtons.forEach(id => {
      const btn =
        (this.elements[id] as HTMLButtonElement | undefined) ||
        (document.getElementById(id) as HTMLButtonElement | null);
      if (btn) btn.disabled = true;
    });

    // Enable system buttons
    const systemButtons = [
      {
        element: this.elements.settingsBtn as HTMLButtonElement | null,
        name: 'settingsBtn',
      },
      {
        element: this.elements.globalRefreshModelsBtn as HTMLButtonElement | null,
        name: 'globalRefreshModelsBtn',
      },
    ];
    systemButtons.forEach(({ element }) => {
      if (element) element.disabled = false;
    });

    // Enable data source configuration buttons
    const configButtons = ['openDataSourceModalBtn', 'openFormFillerDataSourceModalBtn'];
    configButtons.forEach(id => {
      const btn = document.getElementById(id) as HTMLButtonElement | null;
      if (btn) btn.disabled = false;
    });
  }

  /**
   * Update authentication status to Ready
   */
  updateAuthenticationStatus(): void {
    const indicator = this.elements.authIndicator as HTMLElement | null;
    const text = this.elements.authText as HTMLElement | null;
    const loginBtn = this.elements.loginBtn as HTMLElement | null;

    if (indicator) {
      indicator.classList.remove(
        'auth-indicator--authenticated',
        'auth-indicator--unauthenticated'
      );
      indicator.classList.add('auth-indicator--ready');
    }
    if (text) {
      text.textContent = 'Ready';
    }
    if (loginBtn) {
      loginBtn.classList.add('hidden');
    }
    // UI controller may manage auth-related UI in some implementations
  }

  /**
   * Show loading overlay with cancellation option
   */
  showLoadingOverlay(message = 'Processing...', showCancel = true): void {
    const overlay = this.elements.loadingOverlay as HTMLElement | null;
    const messageEl = this.elements.loadingMessage as HTMLElement | null;
    const cancelBtn = this.elements.loadingCancelBtn as HTMLElement | null;

    if (overlay) overlay.style.display = 'flex';
    if (messageEl) messageEl.textContent = message;
    if (cancelBtn) cancelBtn.style.display = showCancel ? 'block' : 'none';
  }

  /**
   * Hide loading overlay
   */
  hideLoadingOverlay(): void {
    const overlay = this.elements.loadingOverlay as HTMLElement | null;
    if (overlay) overlay.style.display = 'none';
  }

  /**
   * Execute an operation with tracking and UI feedback
   */
  async executeOperation<T>(
    operationName: string,
    operationFn: () => Promise<T> | T,
    options: { loadingMessage?: string; showCancel?: boolean } = {}
  ): Promise<T | null> {
    const operationId = this.operationTracker.startOperation(operationName);

    try {
      this.showLoadingOverlay(
        options.loadingMessage || `Processing ${operationName}...`,
        options.showCancel !== false
      );
      if (this.uiController && this.uiController.setButtonsEnabled) {
        this.uiController.setButtonsEnabled(false);
      }

      const result = await Promise.resolve(operationFn());

      // If cancelled, return null
      if (!this.operationTracker.isOperationActive(operationId)) {
        return null;
      }

      return result;
    } catch (error) {
      this.resultsHandler?.showError(`${operationName} failed: ${(error as Error).message}`);
      throw error;
    } finally {
      this.hideLoadingOverlay();
      if (this.uiController && this.uiController.setButtonsEnabled) {
        this.uiController.setButtonsEnabled(true);
      }
      this.operationTracker.endOperation(operationId);
    }
  }

  /**
   * Cancel current operation
   */
  cancelCurrentOperation(): void {
    if (this.operationTracker.currentOperation) {
      this.operationTracker.cancelOperation();
      this.hideLoadingOverlay();
      if (this.uiController && this.uiController.setButtonsEnabled) {
        this.uiController.setButtonsEnabled(true);
      }
      if (this.resultsHandler && this.resultsHandler.showMessage) {
        this.resultsHandler.showMessage('Operation cancelled by user', 'info');
      }
    }
  }

  /**
   * Cleanup resources when popup is closed
   */
  cleanup(): void {
    if (this.operationTracker.currentOperation) {
      this.cancelCurrentOperation();
    }
    this.isInitialized = false;
  }
}
