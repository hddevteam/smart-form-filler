import { ExtensionClient } from '@/popup/apis/extensionClient';
// Popup entry point
import PopupDataSourceManagerRefactored from '@/modules/popup/popupDataSourceManagerRefactored';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import ConfigurationUI from '@/popup/components/ConfigurationUI';
import ModelSelector from '@/popup/components/ModelSelector';
import AITestButton from '@/popup/components/AITestButton';
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
    // Keep a reference to model selector for refreshes
    let selectorRef: ModelSelector | null = null;

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
        onProviderChange: async provider => {
          if (provider === 'ollama') {
            // Trigger background auto-discovery via model selector refresh flow
            await moduleManager.apiClient?.refreshOllamaModels?.();
            // Re-render selector to update UI with discovered models
            setTimeout(() => {
              void selectorRef?.render();
            }, 300);
          }
        },
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
      selectorRef = selector;
    }

    // Render AI test button below configuration or in dedicated container
    const aiTestContainer = document.getElementById('ai-test');
    if (aiTestContainer) {
      const testBtn = new AITestButton(aiTestContainer, {
        client: new ExtensionClient(),
        getOptions: () => {
          const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
          const apiUrl = env?.VITE_GPT_4_1_NANO_API_URL ?? 'http://localhost:11434/api/generate';
          return {
            apiUrl,
            model: 'gpt-4.1-nano',
            messages: [{ role: 'user', content: 'Hello from popup!' }],
          } as const;
        },
      });
      testBtn.render();
    }

    // ConnectionTest removed for pure frontend; no backend URL required
    // Bind content actions via ExtensionClient if buttons exist
    const handlers: UIEventHandlers = {
      detectForms: () => {
        void moduleManager.apiClient?.detectForms?.();
      },
      analyzeContent: () => {
        void moduleManager.apiClient?.analyzeContent?.();
      },
      fillForms: () => {
        // In minimal wiring, send empty mappings; future: use collected mappings
        void moduleManager.apiClient?.fillForms?.({});
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
