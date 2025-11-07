// Popup entry point
import PopupDataSourceManagerRefactored from '@/modules/popup/popupDataSourceManagerRefactored';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import ConfigurationUI from '@/popup/components/ConfigurationUI';
import ModelSelector from '@/popup/components/ModelSelector';
import ConnectionTest from '@/popup/components/ConnectionTest';
import type { PopupElements, PopupManagerLike } from '@/types/popup';
import { Logger } from '@/utils/logger';

const logger = Logger.forScope('Popup');
logger.info('Smart Form Filler - Popup initialized');

// Wire up Data Source Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const elements: PopupElements = {
    // We will pass minimal elements; DataSourceUIController will be migrated later.
  };

  const moduleManager: PopupManagerLike = {
    elements,
    resultsHandler: {
      showError: (msg: string) => {
        logger.error('Error:', msg);
      },
    },
  };

  // Initialize manager first, then create UI controller with the manager's event emitter
  const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager);
  void mgr.init().then(() => {
    const ui = new DataSourceUIController(elements, mgr.eventEmitter);
    // Inject controller and initialize
    (mgr as unknown as { uiController?: DataSourceUIController }).uiController = ui;
    ui.init();
    // Refresh UI now that controller is ready
    mgr.updateAvailableDataSources();
    mgr.updateAllUI();

    // Render configuration UI if container exists
    const configContainer = document.getElementById('config-container');
    if (configContainer) {
      const configUI = new ConfigurationUI(configContainer, {
        saveConfig: async cfg => {
          // Placeholder: integrate with ApiConfigManager in M2
          localStorage.setItem('sff-config', JSON.stringify(cfg));
          await Promise.resolve();
        },
        loadConfig: async () => {
          const saved = localStorage.getItem('sff-config');
          await Promise.resolve();
          return saved ? (JSON.parse(saved) as unknown) : undefined;
        },
      });
      void configUI.render();
    }

    // Render model selector if container exists
    const modelContainer = document.getElementById('model-selector');
    if (modelContainer) {
      const selector = new ModelSelector(modelContainer, {
        loadModels: async () => {
          const models = await moduleManager.apiClient?.getAvailableModels?.();
          return models ?? [];
        },
      });
      void selector.render();
    }

    // Render connection test if container exists
    const connTestContainer = document.getElementById('connection-test');
    if (connTestContainer) {
      const test = new ConnectionTest(connTestContainer, {
        validate: async endpoint => {
          const ctor = moduleManager.apiClient?.constructor as unknown as
            | (new () => {
                setBackendUrl: (url: string) => void;
                testConnection: () => Promise<{ success: boolean; error?: string }>;
              })
            | undefined;
          if (!ctor) return { success: false, error: 'Client unavailable' };
          const client = new ctor();
          client.setBackendUrl(endpoint);
          return await client.testConnection();
        },
      });
      test.render();
    }
  });
});

export {};
