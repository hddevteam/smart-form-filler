/**
 * UIController (TypeScript) - Handles UI state management and event binding
 */
import type { PopupElements, PopupManagerLike, UIEventHandlers } from '@/types/popup';

export class UIController {
  private elements: PopupElements;
  // Optional back-reference to popup manager (for some flows)
  popupManager?: PopupManagerLike;

  constructor(elements: PopupElements) {
    this.elements = elements;
  }

  initializeElements(): void {
    if (!this.elements) return;
  }

  private safeBindEvent(
    element: HTMLElement | null | undefined,
    eventType: keyof HTMLElementEventMap,
    handler: (e: Event) => void
  ): boolean {
    if (!element || typeof element.addEventListener !== 'function') return false;
    element.addEventListener(eventType, handler);
    return true;
  }

  bindEvents(handlers: UIEventHandlers): void {
    this.safeBindEvent(this.elements.extractDataBtn, 'click', () => handlers.extractData?.());
    this.safeBindEvent(this.elements.loginBtn, 'click', () => handlers.login?.());
    this.safeBindEvent(this.elements.copyBtn, 'click', () => handlers.copy?.());
    this.safeBindEvent(this.elements.chatBtn, 'click', () => handlers.chat?.());
    this.safeBindEvent(this.elements.retryBtn, 'click', () => handlers.retry?.());
    this.safeBindEvent(this.elements.clearAllBtn, 'click', () => handlers.clearAll?.());
    this.safeBindEvent(this.elements.backToHistoryBtn, 'click', () => handlers.backToHistory?.());
    this.safeBindEvent(this.elements.cancelLoadingBtn, 'click', () => handlers.cancelLoading?.());

    if (this.elements.resultsTabs?.length) {
      this.elements.resultsTabs.forEach(tab => {
        this.safeBindEvent(tab, 'click', () => {
          const t = tab;
          const name = t.dataset.tab as string;
          handlers.switchTab?.(name);
        });
      });
    }
  }

  getCurrentMode(): string {
    return 'extract';
  }

  getSelectedLanguage(): string {
    return this.elements.languageSelect?.value || 'zh';
  }

  getSelectedModel(): string | null {
    const select = this.elements.globalModelSelect;
    const value = select?.value;
    if (!value || select?.disabled) return null;
    return value;
  }

  getSelectedFormFillerModel(): string | null {
    return this.getSelectedModel();
  }

  showLoading(message?: string): void {
    this.elements.loadingState?.classList.remove('hidden');
    this.elements.resultsSection?.classList.add('hidden');
    this.elements.errorState?.classList.add('hidden');
    if (message && this.elements.loadingDetails) this.elements.loadingDetails.textContent = message;
  }

  updateLoadingDetails(details: string): void {
    if (this.elements.loadingDetails) this.elements.loadingDetails.textContent = details;
  }

  hideLoading(): void {
    this.elements.loadingState?.classList.add('hidden');
  }

  clearResults(): void {
    if (this.elements.markdownText) this.elements.markdownText.textContent = '';
    if (this.elements.htmlText) this.elements.htmlText.textContent = '';
    if (this.elements.cleanedHtmlText) this.elements.cleanedHtmlText.textContent = '';
    if (this.elements.metadataData) this.elements.metadataData.textContent = '';
    if (this.elements.resultsMeta) this.elements.resultsMeta.textContent = '';

    this.elements.resultsSection?.classList.add('hidden');
    this.elements.errorState?.classList.add('hidden');
  }

  updateAuthStatus(): void {
    if (this.elements.authIndicator) {
      this.elements.authIndicator.classList.remove(
        'auth-indicator--authenticated',
        'auth-indicator--unauthenticated'
      );
      this.elements.authIndicator.classList.add('auth-indicator--ready');
    }
    if (this.elements.authText) this.elements.authText.textContent = 'Ready';
    if (this.elements.loginBtn) this.elements.loginBtn.classList.add('hidden');
  }

  setButtonsEnabled(enabled: boolean): void {
    if (this.elements.extractDataBtn) this.elements.extractDataBtn.disabled = !enabled;
    if (this.elements.copyBtn) this.elements.copyBtn.disabled = !enabled;
  }

  setModelDependentButtonsEnabled(enabled: boolean): void {
    if (this.elements.extractDataBtn) this.elements.extractDataBtn.disabled = !enabled;
    if (this.elements.mainChatBtn) this.elements.mainChatBtn.disabled = !enabled;
    ['detectFormsBtn', 'analyzeContentBtn', 'fillFormsBtn'].forEach(id => {
      const btn = document.getElementById(id) as HTMLButtonElement | null;
      if (btn) btn.disabled = !enabled;
    });
    if (this.elements.copyBtn) this.elements.copyBtn.disabled = false;
  }

  setSystemButtonsEnabled(enabled: boolean): void {
    if (this.elements.settingsBtn) this.elements.settingsBtn.disabled = !enabled;
    if (this.elements.globalRefreshModelsBtn)
      this.elements.globalRefreshModelsBtn.disabled = !enabled;
    ['openDataSourceModalBtn', 'openFormFillerDataSourceModalBtn'].forEach(id => {
      const btn = document.getElementById(id) as HTMLButtonElement | null;
      if (btn) btn.disabled = !enabled;
    });
  }

  updateMainChatButtonState(hasHistory: boolean): void {
    if (this.elements.mainChatBtn) {
      this.elements.mainChatBtn.disabled = !hasHistory;
      this.elements.mainChatBtn.title = hasHistory
        ? 'Chat with extracted data sources'
        : 'Extract data sources first to enable chat';
    }
  }
}
