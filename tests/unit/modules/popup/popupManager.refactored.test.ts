import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PopupManager } from '@/popup/modules/popupManager';

/**
 * Tests for PopupManager (TS refactor)
 * Focus on UI-independent logic and DOM effects
 */

describe('PopupManager (TS)', () => {
  let manager: PopupManager;

  beforeEach(() => {
    manager = new PopupManager();
    // Prepare DOM elements referenced by PopupManager
    const globalModelSelect = document.createElement('select');
    globalModelSelect.id = 'globalModelSelect';
    document.body.appendChild(globalModelSelect);

    const btnIds = [
      'extractDataBtn',
      'mainChatBtn',
      'detectFormsBtn',
      'analyzeContentBtn',
      'fillFormsBtn',
      'settingsBtn',
      'globalRefreshModelsBtn',
      'openDataSourceModalBtn',
      'openFormFillerDataSourceModalBtn',
    ];
    btnIds.forEach(id => {
      const btn = document.createElement('button');
      btn.id = id;
      document.body.appendChild(btn);
    });

    // Elements bag used by PopupManager
    manager.elements = {
      globalModelSelect,
      settingsBtn: document.getElementById('settingsBtn') as HTMLButtonElement,
      globalRefreshModelsBtn: document.getElementById(
        'globalRefreshModelsBtn'
      ) as HTMLButtonElement,
      // Loading overlay elements
      loadingOverlay: document.createElement('div'),
      loadingMessage: document.createElement('div'),
      loadingCancelBtn: document.createElement('button'),
      // Auth related
      authIndicator: document.createElement('div'),
      authText: document.createElement('div'),
      loginBtn: document.createElement('button'),
    } as any;

    if (manager.elements.loadingOverlay) document.body.appendChild(manager.elements.loadingOverlay);
    if (manager.elements.loadingMessage) document.body.appendChild(manager.elements.loadingMessage);
    if (manager.elements.loadingCancelBtn)
      document.body.appendChild(manager.elements.loadingCancelBtn);
    if (manager.elements.authIndicator) document.body.appendChild(manager.elements.authIndicator);
    if (manager.elements.authText) document.body.appendChild(manager.elements.authText);
    if (manager.elements.loginBtn) document.body.appendChild(manager.elements.loginBtn);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('setInitialLoadingState', () => {
    it('disables model-dependent buttons and enables system buttons', () => {
      manager.setInitialLoadingState();

      expect((manager.elements.globalModelSelect as HTMLSelectElement).disabled).toBe(true);
      const disabledIds = [
        'extractDataBtn',
        'mainChatBtn',
        'detectFormsBtn',
        'analyzeContentBtn',
        'fillFormsBtn',
      ];
      disabledIds.forEach(id => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
      });

      const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;
      const refreshBtn = document.getElementById('globalRefreshModelsBtn') as HTMLButtonElement;
      expect(settingsBtn.disabled).toBe(false);
      expect(refreshBtn.disabled).toBe(false);
    });
  });

  describe('updateAuthenticationStatus', () => {
    it("sets indicator class to 'ready' and text to 'Ready'", () => {
      manager.updateAuthenticationStatus();
      const indicator = manager.elements.authIndicator as HTMLElement;
      const text = manager.elements.authText as HTMLElement;

      expect(indicator.classList.contains('auth-indicator--ready')).toBe(true);
      expect(text.textContent).toBe('Ready');
      expect((manager.elements.loginBtn as HTMLElement).classList.contains('hidden')).toBe(true);
    });
  });

  describe('executeOperation', () => {
    it('tracks operation, toggles overlay, and returns result', async () => {
      // Stub uiController
      (manager as any).uiController = {
        setButtonsEnabled: vi.fn(),
      } as any;
      const result = await manager.executeOperation('TestOp', () => 42);
      expect(result).toBe(42);
      expect((manager as any).uiController.setButtonsEnabled).toHaveBeenCalledWith(false);
      expect((manager as any).uiController.setButtonsEnabled).toHaveBeenCalledWith(true);
      expect((manager.elements.loadingOverlay as HTMLElement).style.display).toBe('none');
    });

    it('handles failures and shows error via resultsHandler', async () => {
      (manager as any).uiController = { setButtonsEnabled: vi.fn() } as any;
      (manager as any).resultsHandler = { showError: vi.fn() } as any;

      await expect(
        manager.executeOperation('FailOp', () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');

      expect((manager as any).resultsHandler.showError).toHaveBeenCalled();
    });
  });

  describe('cancelCurrentOperation', () => {
    it('cancels and shows message', async () => {
      (manager as any).uiController = { setButtonsEnabled: vi.fn() } as any;
      (manager as any).resultsHandler = { showMessage: vi.fn() } as any;

      const promise = manager.executeOperation('Cancelable', () => {
        // Simulate long op
        return new Promise(resolve => setTimeout(() => resolve('done'), 0));
      });
      manager.cancelCurrentOperation();
      const res = await promise;
      expect(res).toBeNull();
      expect((manager as any).resultsHandler.showMessage).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('sets isInitialized to false and cancels operation', async () => {
      manager.uiController = { setButtonsEnabled: vi.fn() } as any;
      manager.isInitialized = true;
      const p = manager.executeOperation('LongOp', () => {
        return new Promise<number>(resolve => setTimeout(() => resolve(1), 0));
      });
      manager.cleanup();
      const res = await p;
      expect(res).toBeNull();
      expect(manager.isInitialized).toBe(false);
    });
  });
});
