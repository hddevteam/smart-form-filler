import type { DataSourceConfigObject } from '@/types/dataSource';

// Popup type definitions

export interface PopupElements {
  settingsBtn?: HTMLButtonElement | null;
  settingsModal?: HTMLElement | null;
  settingsModalClose?: HTMLElement | null;
  saveSettingsBtn?: HTMLElement | null;
  settingsCancelBtn?: HTMLElement | null;
  loginBtn?: HTMLElement | null;
  authIndicator?: HTMLElement | null;
  authText?: HTMLElement | null;
  languageSelect?: HTMLSelectElement | null;
  copyBtn?: HTMLButtonElement | null;
  extractDataBtn?: HTMLButtonElement | null;
  mainChatBtn?: HTMLButtonElement | null;
  loadingState?: HTMLElement | null;
  loadingDetails?: HTMLElement | null;
  resultsSection?: HTMLElement | null;
  errorState?: HTMLElement | null;
  errorMessage?: HTMLElement | null;
  outputText?: HTMLElement | null;
  resultsMeta?: HTMLElement | null;
  mainTabs?: HTMLButtonElement[] | null;
  resultsTabs?: HTMLElement[] | null;
  markdownText?: HTMLElement | null;
  htmlText?: HTMLElement | null;
  cleanedHtmlText?: HTMLElement | null;
  metadataData?: HTMLElement | null;
  markdownTab?: HTMLElement | null;
  htmlTab?: HTMLElement | null;
  cleanedHtmlTab?: HTMLElement | null;
  currentResultsDetail?: HTMLElement | null;
  historyContainer?: HTMLElement | null;
  markdownPanel?: HTMLElement | null;
  htmlPanel?: HTMLElement | null;
  cleanedHtmlPanel?: HTMLElement | null;
  metadataPanel?: HTMLElement | null;
  cancelLoadingBtn?: HTMLButtonElement | null;
  clearAllBtn?: HTMLButtonElement | null;
  backToHistoryBtn?: HTMLButtonElement | null;
  chatBtn?: HTMLButtonElement | null;
  retryBtn?: HTMLButtonElement | null;
  chatMessages?: HTMLElement | null;
  chatInput?: HTMLTextAreaElement | HTMLInputElement | null;
  sendChatBtn?: HTMLButtonElement | null;
  chatStatus?: HTMLElement | null;
  dataSourceList?: HTMLElement | null;
  // Model related
  globalModelSelect?: HTMLSelectElement | null;
  globalRefreshModelsBtn?: HTMLButtonElement | null;
  // Data source modal related
  dataSourceModal?: HTMLElement | null;
  dataSourceModalClose?: HTMLElement | null;
  dataSourceApplyBtn?: HTMLButtonElement | null;
  dataSourceCancelBtn?: HTMLButtonElement | null;
  // Main tab containers
  extractionTab?: HTMLElement | null;
  chatTab?: HTMLElement | null;
  formFillerTab?: HTMLElement | null;
  selectedMode?: HTMLElement | null;
  // Form filler mode toggle
  simpleModeToggle?: HTMLButtonElement | null;
  advancedModeToggle?: HTMLButtonElement | null;
  formFillerSimpleMode?: HTMLElement | null;
  formFillerAdvancedMode?: HTMLElement | null;
  formFillerContent?: HTMLElement | null;
  simpleModeLanguageSelect?: HTMLSelectElement | null;
  advancedModeLanguageSelect?: HTMLSelectElement | null;
  fillContentInput?: HTMLTextAreaElement | HTMLInputElement | null;
  // Deprecated: backend-related UI (kept during migration)
  backendUrlInput?: HTMLInputElement | null;
  testConnectionBtn?: HTMLElement | null;
  connectionStatus?: HTMLElement | null;
}

export interface ApiClientLike {
  // Optional: model API used by PopupModelManager
  getAvailableModels?(): Promise<
    Array<{ id: string; name?: string; description?: string; source?: string }>
  >;
  refreshOllamaModels?: () => Promise<void>;
  // Content script actions
  detectForms?: () => Promise<unknown>;
  analyzeContent?: () => Promise<unknown>;
  fillForms?: (mappings: unknown) => Promise<unknown>;
  // Deprecated: backend-specific methods (kept during migration)
  setBackendUrl?(url: string): void;
  testConnection?(): Promise<{ success: boolean; error?: string }>;
}

export interface ModelManagerLike {
  loadModels(): Promise<void>;
}

export interface PopupManagerLike {
  elements: PopupElements;
  apiClient?: ApiClientLike;
  modelManager?: ModelManagerLike;
  uiController?: {
    setModelDependentButtonsEnabled(enabled: boolean): void;
    setSystemButtonsEnabled(enabled: boolean): void;
    setButtonsEnabled?(enabled: boolean): void;
  };
  // Results handler (extended for data source manager needs)
  resultsHandler?: {
    showError(message: string): void;
    // Recent extraction history collected by the app (if available)
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
  };
  // Chat handler for notifying data source configuration changes
  chatHandler?: {
    onDataSourceChanged: (config: unknown) => void;
    setExtractionHistory?: (history: unknown[]) => void;
    updateDataSourceList?: () => void;
  };
  dataSourceManager?: {
    updateAvailableDataSources?: () => void;
    updateChatConfiguration: (config: Partial<DataSourceConfigObject>) => Promise<void> | void;
    updateFormFillerConfiguration: (
      config: Partial<DataSourceConfigObject>
    ) => Promise<void> | void;
  };
  updateAuthenticationStatus?: () => void;
}

// Handlers used by UIController.bindEvents
export interface UIEventHandlers {
  // Tab switching
  switchMainTab?: (tab: string) => void;
  switchTab?: (tab: string) => void;
  // Actions
  extractData?: () => void;
  login?: () => void;
  copy?: () => void;
  chat?: () => void;
  retry?: () => void;
  clearAll?: () => void;
  backToHistory?: () => void;
  cancelLoading?: () => void;
  // Content script actions
  detectForms?: () => void;
  analyzeContent?: () => void;
  fillForms?: () => void;
  // Global model select change propagation
  updateChatSendButtonState?: () => void;
}

export interface ChatHandlerElements {
  chatMessages: HTMLElement;
  chatInput: HTMLTextAreaElement | HTMLInputElement;
  sendChatBtn: HTMLButtonElement;
  dataSourceList: HTMLElement;
  chatStatus?: HTMLElement | null;
}

export interface ChatDataSourceSelection {
  type: string;
  sources: Array<{ id?: string; title: string; url?: string; content: string }>;
}

export interface ChatHandlerDeps {
  apiClient: {
    makeRequest: (endpoint: string, init?: RequestInit) => Promise<Response>;
  };
  getSelectedModel: () => string | null;
  getChatDataSources?: () => ChatDataSourceSelection | null | undefined;
  onSendStart?: () => void;
  onSendComplete?: () => void;
}
