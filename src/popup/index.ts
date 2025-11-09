import { ExtensionClient } from '@/popup/apis/extensionClient';
// Popup entry point
import PopupDataSourceManagerRefactored from '@/modules/popup/popupDataSourceManagerRefactored';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import ModelSelector from '@/popup/components/ModelSelector';
import AITestButton from '@/popup/components/AITestButton';
import '@/popup/components/aiTestButton.css';
import AzureSettingsModal from '@/popup/components/AzureSettingsModal';
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
    // Registry of model -> endpoint/provider/apiKey for quick lookup in Test button
    const modelEndpointRegistry: Record<
      string,
      { apiUrl: string; provider: 'azure' | 'ollama'; apiKey?: string }
    > = {};

    // Render model selector if container exists (default to local Ollama + configured Azure)
    const modelContainer = document.getElementById('model-selector');
    let modelSelector: ModelSelector | null = null;

    const loadModelsWithRegistry = async () => {
      const local = (await moduleManager.apiClient?.getAvailableModels?.()) ?? [];
      const cfgMgr = new ApiConfigManager();
      const configs = await cfgMgr.listConfigs();
      const azureModels = configs
        .filter(c => c.provider === 'azure')
        .map(c => ({ id: c.model ?? 'gpt-4o', name: c.model ?? 'gpt-4o', source: 'azure' }));
      // Update endpoint registry: map azure model id -> endpoint + apiKey
      for (const c of configs) {
        if (c.provider === 'azure' && c.model) {
          modelEndpointRegistry[c.model] = {
            apiUrl: c.endpoint,
            provider: 'azure',
            ...(c.apiKey ? { apiKey: c.apiKey } : {}),
          };
        }
      }
      // Map local ollama models -> default chat endpoint
      for (const m of local) {
        if (m.id?.startsWith('ollama:')) {
          modelEndpointRegistry[m.id] = {
            apiUrl: 'http://localhost:11434/api/chat',
            provider: 'ollama',
          };
        }
      }
      return [...local, ...azureModels];
    };

    if (modelContainer) {
      modelSelector = new ModelSelector(modelContainer, {
        loadModels: loadModelsWithRegistry,
      });
      void modelSelector.render();
    }

    // Render AI test button and wire to current selected model
    const aiTestContainer = document.getElementById('ai-test');
    if (aiTestContainer) {
      const testBtn = new AITestButton(aiTestContainer, {
        client: new ExtensionClient(),
        getOptions: () => {
          // Read currently selected model from select element
          const select = document.querySelector<HTMLSelectElement>('#model-selector select');
          const selected = select?.value ?? '';
          const mapped = selected ? modelEndpointRegistry[selected] : undefined;
          // If mapped, use its endpoint directly; else fallback by type
          const apiUrl =
            mapped?.apiUrl ??
            (selected.startsWith('ollama:') ? 'http://localhost:11434/api/chat' : '');

          // Get apiKey from registry (stored when loading models)
          const apiKey = mapped?.apiKey;

          const options: import('@/background/services/ai/aiService').MakeRequestOptions = {
            apiUrl,
            model: selected || 'gpt-4o',
            messages: [{ role: 'user', content: 'Hello from popup!' }],
            ...(apiKey ? { apiKey } : {}),
          };
          return options;
        },
      });
      testBtn.render();
    }
    // Settings button: open Azure settings modal
    const actions = document.getElementById('actions');
    if (actions) {
      const settingsBtn = document.createElement('button');
      settingsBtn.className = 'btn btn--tertiary';
      settingsBtn.textContent = 'Settings';
      actions.prepend(settingsBtn);
      settingsBtn.addEventListener('click', () => {
        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) return;
        const modal = new AzureSettingsModal(modalRoot, {
          onSaved: () => {
            // Refresh model selector after saving Azure config
            if (modelSelector) {
              void modelSelector.render();
            }
          },
        });
        modal.open();
      });
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
