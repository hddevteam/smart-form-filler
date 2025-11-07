import { DataSourceStorage } from '@/modules/dataSource/dataSourceStorage';
import { DataSourceEventEmitter } from '@/modules/dataSource/dataSourceEventEmitter';
import { DataSourceSyncManager } from '@/modules/dataSource/dataSourceSyncManager';
import { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';
import type { PopupElements, PopupManagerLike } from '@/types/popup';
import { Logger } from '@/utils/logger';
import type { AvailableDataSource, DataSourceConfigObject } from '@/types/dataSource';

export type ModalContext = 'chat' | 'formFiller';

export interface UIControllerLike {
  init(): void;
  populateModal(config: DataSourceConfig, availableDataSources: AvailableDataSource[]): void;
  updateChatUI(config: DataSourceConfig): void;
  updateFormFillerUI(config: DataSourceConfig, availableDataSources: AvailableDataSource[]): void;
  openModalForContext(context: ModalContext): void;
  closeModal(): void;
  updateDataSourceList(
    availableDataSources: AvailableDataSource[],
    currentConfig: DataSourceConfig
  ): void;
}

/**
 * Popup Data Source Manager (TypeScript port)
 * Coordinates data source functionality across popup tabs.
 */
export class PopupDataSourceManagerRefactored {
  readonly elements: PopupElements;
  readonly moduleManager: PopupManagerLike;

  readonly storage: DataSourceStorage;
  readonly eventEmitter: DataSourceEventEmitter;
  readonly syncManager: DataSourceSyncManager;
  private uiController: UIControllerLike | undefined;
  private logger = Logger.forScope('PopupDataSourceManagerRefactored');

  constructor(
    elements: PopupElements,
    moduleManager: PopupManagerLike,
    uiController?: UIControllerLike
  ) {
    this.elements = elements;
    this.moduleManager = moduleManager;

    this.storage = new DataSourceStorage();
    this.eventEmitter = new DataSourceEventEmitter();
    this.syncManager = new DataSourceSyncManager(this.storage, this.eventEmitter);
    this.uiController = uiController;

    // Arrow-function handlers keep lexical `this` – no binding needed
  }

  async init(): Promise<void> {
    try {
      await this.syncManager.init();
      this.uiController?.init();
      this.setupEventListeners();
      this.updateAvailableDataSources();
      this.updateAllUI();

      // Initial DOM notifications (legacy compatibility)
      document.dispatchEvent(new CustomEvent('dataSourceManagerReady'));
      document.dispatchEvent(new CustomEvent('dataSourcesUpdated'));
      document.dispatchEvent(new CustomEvent('formFillerConfigChanged'));
    } catch (error) {
      this.logger.error('Error during initialization:', error);
    }
  }

  private setupEventListeners(): void {
    // UI events
    this.eventEmitter.on(
      DataSourceEventEmitter.EVENTS.MODAL_OPENED,
      this.handleModalOpened as (d: unknown) => void
    );
    this.eventEmitter.on(
      'applyConfiguration',
      this.handleApplyConfiguration as (d: unknown) => void
    );
    this.eventEmitter.on(
      'dataSourceSelectionChanged',
      this.handleDataSourceSelectionChanged as (d: unknown) => void
    );
    this.eventEmitter.on(
      'dataSourceTypeChanged',
      this.handleDataSourceTypeChanged as (d: unknown) => void
    );

    // Config change events -> update UIs and bubble DOM events
    this.eventEmitter.on(DataSourceEventEmitter.EVENTS.CHAT_CONFIG_CHANGED, (data: unknown) => {
      const typed = data as { config: DataSourceConfig };
      this.uiController?.updateChatUI(typed.config);
      document.dispatchEvent(new CustomEvent('chatConfigChanged', { detail: typed }));
    });

    this.eventEmitter.on(
      DataSourceEventEmitter.EVENTS.FORM_FILLER_CONFIG_CHANGED,
      (data: unknown) => {
        const typed = data as { config: DataSourceConfig };
        this.uiController?.updateFormFillerUI(
          typed.config,
          this.syncManager.getAvailableDataSources()
        );
        document.dispatchEvent(new CustomEvent('formFillerConfigChanged', { detail: typed }));
      }
    );

    this.eventEmitter.on(DataSourceEventEmitter.EVENTS.DATA_SOURCES_UPDATED, (data: unknown) => {
      const typed = data as { sources: AvailableDataSource[] };
      this.updateAllUI();
      document.dispatchEvent(new CustomEvent('dataSourcesUpdated', { detail: typed }));
    });

    this.eventEmitter.on(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, (data: unknown) => {
      this.notifyConfigurationChanged();
      document.dispatchEvent(new CustomEvent('configurationApplied', { detail: data }));
    });

    // External updates from results handler
    document.addEventListener('extractionHistoryUpdated', () => {
      this.updateAvailableDataSources();
    });
  }

  private handleModalOpened = (data: { context?: ModalContext } | null): void => {
    const context: ModalContext = (data?.context as ModalContext) ?? 'chat';
    const configs = this.syncManager.getConfigurations();
    const config = context === 'formFiller' ? configs.formFiller : configs.chat;
    const availableDataSources = this.syncManager.getAvailableDataSources();
    this.uiController?.populateModal(config, availableDataSources);
  };

  private handleApplyConfiguration = async (
    data: {
      type?: DataSourceConfig['type'];
      selectedItemIds?: string[];
      context?: ModalContext;
    } | null
  ): Promise<void> => {
    try {
      const type = data?.type ?? 'markdown';
      const selectedItemIds = data?.selectedItemIds ?? [];
      const context: ModalContext = (data?.context as ModalContext) ?? 'chat';

      const newConfig = new DataSourceConfig(
        type,
        (selectedItemIds || []).map(id => ({ id }))
      );
      newConfig.isConfigured = (selectedItemIds || []).length > 0;

      if (context === 'formFiller') await this.syncManager.updateFormFillerConfig(newConfig);
      else await this.syncManager.updateChatConfig(newConfig);

      this.uiController?.closeModal();
      this.notifyConfigurationChanged();
      this.logger.info(`Configuration applied for ${context}`);
    } catch (error) {
      this.logger.error('Error applying configuration:', error);
    }
  };

  // Immediate UI feedback already handled by UI controller in legacy
  private handleDataSourceSelectionChanged = (
    data: { sourceId?: string; isSelected?: boolean; context?: ModalContext } | null
  ): void => {
    this.logger.debug('Data source selection changed:', data);
  };

  private handleDataSourceTypeChanged = (
    data: { context?: ModalContext; type?: DataSourceConfig['type'] } | null
  ): void => {
    const context: ModalContext = (data?.context as ModalContext) || 'chat';
    const newType: DataSourceConfig['type'] = data?.type || 'markdown';
    const configs = this.syncManager.getConfigurations();
    const currentConfig = context === 'formFiller' ? configs.formFiller : configs.chat;
    const tempConfig = currentConfig.clone();
    tempConfig.type = newType;
    const available = this.syncManager.getAvailableDataSources();
    this.uiController?.updateDataSourceList(available, tempConfig);
  };

  updateAvailableDataSources(): void {
    const history = this.moduleManager?.resultsHandler?.extractionHistory as
      | import('@/types/dataSource').ExtractionHistoryItem[]
      | undefined;
    this.syncManager.updateAvailableDataSources(history);
  }

  updateAllUI(): void {
    const configs = this.syncManager.getConfigurations();
    const available = this.syncManager.getAvailableDataSources();
    this.uiController?.updateChatUI(configs.chat);
    this.uiController?.updateFormFillerUI(configs.formFiller, available);
  }

  openModal(context: ModalContext = 'chat'): void {
    this.uiController?.openModalForContext(context);
  }

  openModalForFormFiller(): void {
    this.uiController?.openModalForContext('formFiller');
  }

  async updateChatConfiguration(config: Partial<DataSourceConfigObject>): Promise<void> {
    try {
      // Keep available sources up to date
      this.updateAvailableDataSources();
      const newCfg = DataSourceConfig.fromObject(config);
      await this.syncManager.updateChatConfig(newCfg);
      setTimeout(() => this.updateAllUI(), 100);
    } catch (error) {
      this.logger.error('Error updating chat configuration:', error);
    }
  }

  async updateFormFillerConfiguration(config: Partial<DataSourceConfigObject>): Promise<void> {
    try {
      this.updateAvailableDataSources();
      const newCfg = DataSourceConfig.fromObject(config);
      await this.syncManager.updateFormFillerConfig(newCfg);
      setTimeout(() => this.updateAllUI(), 100);
    } catch (error) {
      this.logger.error('Error updating form filler configuration:', error);
    }
  }

  getChatDataSources() {
    return this.syncManager.getChatDataSources();
  }

  getFormFillerDataSources() {
    return this.syncManager.getFormFillerDataSources();
  }

  getFormFillerSelectedSources(): AvailableDataSource[] {
    try {
      const configs = this.syncManager.getConfigurations();
      const formFillerConfig = configs.formFiller;
      if (!formFillerConfig || !formFillerConfig.isValid()) return [];
      const available = this.syncManager.getAvailableDataSources();
      const selected: AvailableDataSource[] = [];
      formFillerConfig.selectedItems.forEach(item => {
        const id = typeof item === 'object' ? item.id : item;
        const src = available.find(ds => ds.id === id);
        if (src) selected.push(src);
      });
      return selected;
    } catch (err) {
      this.logger.error('Error getting form filler selected sources:', err);
      return [];
    }
  }

  getChatSelectedSources(): AvailableDataSource[] {
    try {
      const configs = this.syncManager.getConfigurations();
      const chatConfig = configs.chat;
      if (!chatConfig || !chatConfig.isValid()) return [];
      const available = this.syncManager.getAvailableDataSources();
      const selected: AvailableDataSource[] = [];
      chatConfig.selectedItems.forEach(item => {
        const id = typeof item === 'object' ? item.id : item;
        const src = available.find(ds => ds.id === id);
        if (src) selected.push(src);
      });
      return selected;
    } catch (err) {
      this.logger.error('Error getting chat selected sources:', err);
      return [];
    }
  }

  isDataSourceConfigured(): boolean {
    const configs = this.syncManager.getConfigurations();
    return this.syncManager.hasValidSelectedSources(configs.chat);
  }

  getConfiguration() {
    return this.syncManager.getConfigurations().chat.toObject();
  }

  // Legacy compatibility getters
  get availableDataSources() {
    return this.syncManager.getAvailableDataSources();
  }

  get currentConfig() {
    return this.syncManager.getConfigurations().chat.toObject();
  }

  get formFillerConfig() {
    return this.syncManager.getConfigurations().formFiller.toObject();
  }

  get isConfigured() {
    return this.syncManager.getConfigurations().chat.isValid();
  }

  get formFillerIsConfigured() {
    return this.syncManager.getConfigurations().formFiller.isValid();
  }

  notifyConfigurationChanged(): void {
    try {
      const handler = this.moduleManager?.chatHandler?.onDataSourceChanged;
      if (handler) {
        const cfg = this.syncManager.getConfigurations().chat.toObject();
        handler(cfg);
      }
      this.logger.info('Configuration change notification sent');
    } catch (error) {
      this.logger.error('Error notifying configuration change:', error);
    }
  }
}

export default PopupDataSourceManagerRefactored;
