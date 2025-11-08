import { ExtensionClient } from '@/popup/apis/extensionClient';
// Popup entry point
import PopupDataSourceManagerRefactored from '@/modules/popup/popupDataSourceManagerRefactored';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import ConfigurationUI from '@/popup/components/ConfigurationUI';
import ModelSelector from '@/popup/components/ModelSelector';
import { ApiConfigManager } from '@/config/apiConfigManager';
import type { PopupElements, PopupManagerLike, UIEventHandlers } from '@/types/popup';
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
    apiClient: new ExtensionClient(),
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
      const cfgMgr = new ApiConfigManager();
      const configUI = new ConfigurationUI(configContainer, {
        saveConfig: async cfg => {
          await cfgMgr.saveConfig(cfg as unknown as import('@/config/apiConfigManager').ApiConfig);
        },
        loadConfig: async () => {
          // For popup load, try default named config; if none, undefined
          // In future we may support multiple named configs; pick the first one
          const list = await cfgMgr.listConfigs();
          return list[0];
        },
        listConfigs: async () => cfgMgr.listConfigs(),
      });
      void configUI.render();
    }

    // Render model selector if container exists (pure frontend; no backend fetch)
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

    // ConnectionTest removed for pure frontend; no backend URL required
    // Bind content actions via ExtensionClient if buttons exist
    const handlers: UIEventHandlers = {
      detectForms: () => {
        void moduleManager.apiClient?.detectForms();
      },
      analyzeContent: () => {
        void moduleManager.apiClient?.analyzeContent();
      },
      fillForms: () => {
        // In minimal wiring, send empty mappings; future: use collected mappings
        void moduleManager.apiClient?.fillForms({});
      },
    };
    // If a separate UIController exists for general buttons, it would call bindEvents(handlers)
    // Here we trigger bindings for content buttons directly
    const detectBtn = document.getElementById('detectFormsBtn');
    const analyzeBtn = document.getElementById('analyzeContentBtn');
    const fillBtn = document.getElementById('fillFormsBtn');
    detectBtn?.addEventListener('click', () => handlers.detectForms?.());
    analyzeBtn?.addEventListener('click', () => handlers.analyzeContent?.());
    fillBtn?.addEventListener('click', () => handlers.fillForms?.());
  });
});

export {};
