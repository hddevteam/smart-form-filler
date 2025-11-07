export interface PopupElements {
  settingsBtn?: HTMLElement | null;
  settingsModal?: HTMLElement | null;
  settingsModalClose?: HTMLElement | null;
  backendUrlInput?: HTMLInputElement | null;
  testConnectionBtn?: HTMLElement | null;
  connectionStatus?: HTMLElement | null;
  saveSettingsBtn?: HTMLElement | null;
  settingsCancelBtn?: HTMLElement | null;
  // Model related
  globalModelSelect?: HTMLSelectElement | null;
  globalRefreshModelsBtn?: HTMLButtonElement | null;
  // Data source modal related
  dataSourceModal?: HTMLElement | null;
  dataSourceModalClose?: HTMLElement | null;
  dataSourceApplyBtn?: HTMLButtonElement | null;
  dataSourceCancelBtn?: HTMLButtonElement | null;
}

export interface ApiClientLike {
  setBackendUrl(url: string): void;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  // Optional: model API used by PopupModelManager
  getAvailableModels?(): Promise<
    Array<{ id: string; name?: string; description?: string; source?: string }>
  >;
  refreshOllamaModels?: () => Promise<void>;
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
  };
  updateAuthenticationStatus?: () => void;
}
