import { ExtensionClient } from '@/popup/apis/extensionClient';
// Popup entry point
import PopupDataSourceManagerRefactored from '@/modules/popup/popupDataSourceManagerRefactored';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import ModelSelector from '@/popup/components/ModelSelector';
import AITestButton from '@/popup/components/AITestButton';
import '@/popup/components/aiTestButton.css';
import AzureSettingsModal from '@/popup/components/AzureSettingsModal';
import { ApiConfigManager } from '@/config/apiConfigManager';
import ResultsHandler from '@/popup/modules/resultsHandler';
import type { PopupElements, UIEventHandlers } from '@/types/popup';
import { Logger } from '@/utils/logger';
import { PopupManager } from '@/popup/modules/popupManager';
import { MainTabController } from '@/popup/modules/mainTabController';
import { ModeToggle } from '@/popup/modules/modeToggle';
import { ChatHandler } from '@/popup/modules/chatHandler';
import { CopyHandler } from '@/popup/modules/copyHandler';
import { SimpleMode } from '@/popup/modules/simpleMode';
import { AdvancedMode } from '@/popup/modules/advancedMode';

const logger = Logger.forScope('Popup');
logger.info('Smart Form Filler - Popup initialized');

// Wire up Data Source Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const getElement = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

  const ensureTabTrigger = (selector: string, id: string) => {
    const trigger = document.querySelector(selector);
    if (trigger && !trigger.id) {
      (trigger as HTMLElement).id = id;
    }
  };

  ensureTabTrigger('[data-tab="formfiller"]', 'formFillerTabTrigger');
  ensureTabTrigger('[data-tab="chat"]', 'chatTabTrigger');

  const elements: PopupElements = {
    resultsSection: getElement('resultsSection'),
    historyContainer: getElement('historyContainer'),
    currentResultsDetail: getElement('currentResultsDetail'),
    markdownText: getElement('markdownText'),
    htmlText: getElement('htmlText'),
    cleanedHtmlText: getElement('cleanedHtmlText'),
    metadataData: getElement('metadataData'),
    markdownPanel: getElement('markdownPanel'),
    htmlPanel: getElement('htmlPanel'),
    cleanedHtmlPanel: getElement('cleanedHtmlPanel'),
    metadataPanel: getElement('metadataPanel'),
    markdownTab: getElement('markdownTab'),
    htmlTab: getElement('htmlTab'),
    cleanedHtmlTab: getElement('cleanedHtmlTab'),
    resultsTabs: Array.from(document.querySelectorAll<HTMLElement>('.results-tab')),
    chatMessages: getElement('chatMessages'),
    chatInput: document.getElementById('chatInput') as HTMLTextAreaElement | null,
    sendChatBtn: getElement('sendChatBtn'),
    chatStatus: getElement('chatStatus'),
    dataSourceList: getElement('chatDataSourceList'),
    copyBtn: getElement('copyBtn'),
    chatBtn: getElement('chatBtn'),
    backToHistoryBtn: getElement('backToHistoryBtn'),
    clearAllBtn: getElement('clearAllBtn'),
    extractDataBtn: getElement('extractDataBtn'),
    connectionStatus: getElement('connectionStatus'),
    authText: getElement('authText'),
    mainTabs: Array.from(document.querySelectorAll<HTMLButtonElement>('.main-tab')),
    extractionTab: getElement('extractionTab'),
    chatTab: getElement('chatTab'),
    formFillerTab: getElement('formFillerTab'),
    selectedMode: getElement('selectedMode'),
    simpleModeToggle: getElement('simpleModeToggle'),
    advancedModeToggle: getElement('advancedModeToggle'),
    formFillerSimpleMode: getElement('formFillerSimpleMode'),
    formFillerAdvancedMode: getElement('formFillerAdvancedMode'),
    formFillerContent: getElement('formFillerContent'),
    simpleModeContentInput: document.getElementById(
      'simpleModeContentInput'
    ) as HTMLTextAreaElement | null,
    simpleModeSubmitBtn: getElement('simpleModeSubmitBtn'),
    simpleModeClearBtn: getElement('simpleModeClearBtn'),
    simpleModeProgress: getElement('simpleModeProgress'),
    simpleModeProgressText: getElement('simpleModeProgressText'),
    simpleModeProgressIcon: getElement('simpleModeProgressIcon'),
    simpleModeResults: getElement('simpleModeResults'),
    simpleModeFillSection: getElement('simpleModeFillSection'),
    simpleModeFillFormsBtn: getElement('simpleModeFillFormsBtn'),
    simpleModeError: getElement('simpleModeError'),
    simpleModeErrorMessage: getElement('simpleModeErrorMessage'),
    simpleModeLanguageSelect: document.getElementById(
      'simpleModeLanguageSelect'
    ) as HTMLSelectElement | null,
    advancedModeLanguageSelect: document.getElementById(
      'languageSelect'
    ) as HTMLSelectElement | null,
    fillContentInput: document.getElementById('fillContentInput') as HTMLTextAreaElement | null,
  };

  const extensionClient = new ExtensionClient();
  const popupManager = new PopupManager();
  popupManager.elements = elements as Record<
    string,
    HTMLElement | HTMLInputElement | HTMLSelectElement | null
  >;
  popupManager.apiClient = extensionClient;

  const mainTabButtons = (elements.mainTabs ?? []).filter(
    (btn): btn is HTMLButtonElement => btn instanceof HTMLButtonElement
  );
  const mainTabController = new MainTabController({
    tabButtons: mainTabButtons,
    tabContents: {
      extraction: elements.extractionTab ?? null,
      chat: elements.chatTab ?? null,
      formfiller: elements.formFillerTab ?? null,
    },
    statusLabel: elements.selectedMode ?? null,
    onTabChanged: tab => {
      if (tab === 'chat') {
        document.dispatchEvent(new CustomEvent('popup:chat-tab-entered'));
      } else if (tab === 'formfiller') {
        document.dispatchEvent(new CustomEvent('popup:formfiller-tab-entered'));
      }
    },
  });
  mainTabController.init();
  (popupManager as unknown as { mainTabController?: MainTabController }).mainTabController =
    mainTabController;

  // Form filler workflow state for AdvancedMode
  const formFillerHandler = {
    currentForms: [] as unknown[],
    currentAnalysisResult: null as unknown,
    currentMappings: [] as unknown[],
  };

  // Instantiate AdvancedMode and expose to popupManager
  const advancedMode = new AdvancedMode({ formFillerHandler, documentRef: document });
  (popupManager as unknown as { advancedMode?: AdvancedMode }).advancedMode = advancedMode;

  const simpleModeAdapter = {
    getContent: () => {
      const input = document.getElementById('simpleModeContentInput') as HTMLTextAreaElement | null;
      return input?.value ?? '';
    },
    setContent: (content: string) => {
      const input = document.getElementById('simpleModeContentInput') as HTMLTextAreaElement | null;
      if (!input) return;
      input.value = content;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    getLanguage: () => elements.simpleModeLanguageSelect?.value ?? 'zh',
    setLanguage: (language: string) => {
      if (!elements.simpleModeLanguageSelect) return;
      elements.simpleModeLanguageSelect.value = language;
      elements.simpleModeLanguageSelect.dispatchEvent(new Event('change', { bubbles: true }));
    },
    hideAllStates: () => {
      document.getElementById('simpleModeResults')?.classList.add('hidden');
      document.getElementById('simpleModeError')?.classList.add('hidden');
      document.getElementById('simpleModeFillSection')?.classList.add('hidden');
      document.getElementById('simpleModeProgress')?.classList.add('hidden');
    },
    showProgress: () => {
      document.getElementById('simpleModeProgress')?.classList.remove('hidden');
    },
    showError: (message: string) => {
      const errorContainer = document.getElementById('simpleModeError');
      const errorMessage = document.getElementById('simpleModeErrorMessage');
      errorContainer?.classList.remove('hidden');
      if (errorMessage) errorMessage.textContent = message;
    },
  };

  const modeToggle = new ModeToggle({
    simpleToggle: elements.simpleModeToggle ?? null,
    advancedToggle: elements.advancedModeToggle ?? null,
    simpleContainer: elements.formFillerSimpleMode ?? null,
    advancedContainer: elements.formFillerAdvancedMode ?? null,
    modeIndicator: elements.selectedMode ?? null,
    simpleMode: simpleModeAdapter,
    advancedMode: {
      updateSectionVisibility: () => advancedMode.updateSectionVisibility(),
      reset: () => advancedMode.reset(),
    },
    advancedInput: elements.fillContentInput ?? null,
    simpleLanguageSelect: elements.simpleModeLanguageSelect ?? null,
    advancedLanguageSelect: elements.advancedModeLanguageSelect ?? null,
    onModeChanged: mode => {
      document.dispatchEvent(new CustomEvent('popup:form-mode-toggled', { detail: { mode } }));
    },
  });
  modeToggle.init();
  (popupManager as unknown as { modeToggle?: ModeToggle }).modeToggle = modeToggle;

  const updateHistoryState = (hasHistory: boolean) => {
    if (elements.copyBtn) elements.copyBtn.disabled = !hasHistory;
    if (elements.chatBtn) elements.chatBtn.disabled = !hasHistory;
    if (elements.backToHistoryBtn) elements.backToHistoryBtn.disabled = !hasHistory;
  };
  updateHistoryState(false);

  const resultsHandler = new ResultsHandler(
    elements,
    { updateMainChatButtonState: updateHistoryState },
    popupManager
  );
  popupManager.resultsHandler = resultsHandler as unknown as typeof popupManager.resultsHandler;

  const copyHandler =
    elements.copyBtn &&
    new CopyHandler({
      elements,
      resultsHandler,
      rootDocument: document,
    });

  const dataSourceManager = new PopupDataSourceManagerRefactored(
    elements as never,
    popupManager as never
  );
  popupManager.dataSourceManager = dataSourceManager;
  void dataSourceManager.init().then(() => {
    const ui = new DataSourceUIController(elements, dataSourceManager.eventEmitter);
    // Inject controller and initialize
    (dataSourceManager as unknown as { uiController?: DataSourceUIController }).uiController = ui;
    ui.init();
    // Refresh UI now that controller is ready
    dataSourceManager.updateAvailableDataSources();
    dataSourceManager.updateAllUI();

    let chatHandler: ChatHandler | null = null;
    if (
      elements.chatMessages &&
      elements.chatInput instanceof HTMLTextAreaElement &&
      elements.sendChatBtn &&
      elements.dataSourceList
    ) {
      chatHandler = new ChatHandler(
        {
          chatMessages: elements.chatMessages,
          chatInput: elements.chatInput,
          sendChatBtn: elements.sendChatBtn,
          dataSourceList: elements.dataSourceList,
          chatStatus: elements.chatStatus ?? null,
        },
        {
          apiClient: {
            makeRequest: async (endpoint: string, init?: RequestInit) => {
              return fetch(endpoint, init);
            },
          },
          getSelectedModel: () => {
            const select = document.getElementById('globalModelSelect') as HTMLSelectElement | null;
            if (!select || select.disabled || !select.value) return null;
            return select.value;
          },
          getChatDataSources: () => dataSourceManager.getChatDataSources(),
        }
      );

      (popupManager as unknown as { chatHandler?: ChatHandler }).chatHandler = chatHandler;

      elements.sendChatBtn.addEventListener('click', event => {
        event.preventDefault();
        void chatHandler?.sendMessage();
      });

      elements.chatInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          if (!elements.sendChatBtn?.disabled) {
            void chatHandler?.sendMessage();
          }
        }
      });

      const mapHistory = () => {
        const history = popupManager.resultsHandler?.extractionHistory as
          | Array<{ id: number | string; title?: string; url?: string }>
          | undefined;
        if (!history) return;
        chatHandler?.setExtractionHistory(
          history.map(item => ({
            id: String(item.id ?? ''),
            title: item.title ?? 'Untitled source',
            url: item.url ?? '',
          }))
        );
      };

      mapHistory();

      document.addEventListener('extractionHistoryUpdated', () => {
        mapHistory();
      });

      document.addEventListener('configurationApplied', event => {
        const detail = (event as CustomEvent).detail;
        chatHandler?.onDataSourceChanged(detail);
        chatHandler?.updateDataSourceList();
      });
    }

    if (
      elements.formFillerSimpleMode &&
      elements.simpleModeContentInput &&
      elements.simpleModeSubmitBtn
    ) {
      const noopAsync = async () => {};
      const simpleMode = new SimpleMode({
        elements: {
          container: elements.formFillerSimpleMode,
          contentInput: elements.simpleModeContentInput as HTMLTextAreaElement,
          submitBtn: elements.simpleModeSubmitBtn,
          clearBtn: elements.simpleModeClearBtn ?? null,
          progressContainer: elements.simpleModeProgress ?? null,
          progressText: elements.simpleModeProgressText ?? null,
          progressIcon: elements.simpleModeProgressIcon ?? null,
          resultsContainer: elements.simpleModeResults ?? null,
          fillSection: elements.simpleModeFillSection ?? null,
          fillFormsBtn: elements.simpleModeFillFormsBtn ?? null,
          errorContainer: elements.simpleModeError ?? null,
          errorMessage: elements.simpleModeErrorMessage ?? null,
        },
        workflow: {
          detectForms: noopAsync,
          analyze: noopAsync,
          generate: noopAsync,
          hasMappings: () => false,
        },
        getSelectedDataSources: () => dataSourceManager.getFormFillerSelectedSources?.() ?? [],
        document,
      });
      (popupManager as unknown as { simpleMode?: SimpleMode }).simpleMode = simpleMode;
    }

    elements.clearAllBtn?.addEventListener('click', () => {
      resultsHandler.clearAllHistory();
    });

    elements.backToHistoryBtn?.addEventListener('click', () => {
      resultsHandler.showHistoryList();
    });

    elements.chatBtn?.addEventListener('click', () => {
      mainTabController.switchTab('chat');
    });

    elements.copyBtn?.addEventListener('click', () => {
      void copyHandler?.handleCopy();
    });
    // Registry of model -> endpoint/provider/apiKey for quick lookup in Test button
    const modelEndpointRegistry: Record<
      string,
      { apiUrl: string; provider: 'azure' | 'ollama'; apiKey?: string }
    > = {};

    // Render model selector if container exists (default to local Ollama + configured Azure)
    const modelContainer = document.getElementById('model-selector');
    let modelSelector: ModelSelector | null = null;

    const loadModelsWithRegistry = async () => {
      const local = (await popupManager.apiClient?.getAvailableModels?.()) ?? [];
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
        client: extensionClient,
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
        void (async () => {
          await popupManager.apiClient?.detectForms?.();
          // Simulate updating workflow state and notify AdvancedMode
          formFillerHandler.currentForms = [{}];
          document.dispatchEvent(new CustomEvent('formDetectionCompleted'));
          advancedMode.updateSectionVisibility();
        })();
      },
      analyzeContent: () => {
        void (async () => {
          await popupManager.apiClient?.analyzeContent?.();
          // Simulate updating workflow state and notify AdvancedMode
          formFillerHandler.currentAnalysisResult = { ok: true };
          document.dispatchEvent(new CustomEvent('analysisCompleted'));
          advancedMode.updateSectionVisibility();
        })();
      },
      fillForms: () => {
        void (async () => {
          // In minimal wiring, send empty mappings; future: use collected mappings
          await popupManager.apiClient?.fillForms?.({});
          // Simulate mappings available then notify AdvancedMode
          formFillerHandler.currentMappings = [{}];
          document.dispatchEvent(new CustomEvent('mappingCompleted'));
          advancedMode.updateSectionVisibility();
        })();
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
