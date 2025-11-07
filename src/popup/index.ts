// Popup entry point
import PopupDataSourceManagerRefactored from '@/modules/popup/popupDataSourceManagerRefactored';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import type { PopupElements, PopupManagerLike } from '@/types/popup';

console.log('Smart Form Filler - Popup initialized');

// Wire up Data Source Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const elements: PopupElements = {
    // We will pass minimal elements; DataSourceUIController will be migrated later.
  };

  const moduleManager: PopupManagerLike = {
    elements,
    resultsHandler: {
      showError: (msg: string) => {
        // eslint-disable-next-line no-console
        console.error('[Popup] Error:', msg);
      },
    },
  };

  // Initialize manager first, then create UI controller with the manager's event emitter
  const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager);
  void mgr.init().then(() => {
    const ui = new DataSourceUIController(elements, mgr.eventEmitter);
    // Inject controller and initialize
    (mgr as any).uiController = ui;
    ui.init();
    // Refresh UI now that controller is ready
    mgr.updateAvailableDataSources();
    mgr.updateAllUI();
  });
});

export {};
