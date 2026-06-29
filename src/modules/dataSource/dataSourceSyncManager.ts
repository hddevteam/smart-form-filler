import { DataSourceConfig } from './dataSourceConfig';
import { DataSourceEventEmitter } from './dataSourceEventEmitter';
import { Logger } from '@/utils/logger';
import type {
  AvailableDataSource,
  CombinedDataSources,
  ExtractionHistoryItem,
} from '@/types/dataSource';

export class DataSourceSyncManager {
  private storage: {
    loadConfigurations: () => Promise<{
      chatConfig: DataSourceConfig;
      formFillerConfig: DataSourceConfig;
    }>;
    saveChatConfig: (c: DataSourceConfig) => Promise<void>;
    saveFormFillerConfig: (c: DataSourceConfig) => Promise<void>;
  };
  private eventEmitter: DataSourceEventEmitter;
  private availableDataSources: AvailableDataSource[] = [];

  chatConfig: DataSourceConfig = new DataSourceConfig();
  formFillerConfig: DataSourceConfig = new DataSourceConfig();

  constructor(storage: DataSourceSyncManager['storage'], eventEmitter: DataSourceEventEmitter) {
    this.storage = storage;
    this.eventEmitter = eventEmitter;
  }

  async init(): Promise<void> {
    try {
      const configs = await this.storage.loadConfigurations();
      this.chatConfig = configs.chatConfig;
      this.formFillerConfig = configs.formFillerConfig;
      Logger.forScope('DataSourceSyncManager').info('Initialized with configurations:', {
        chatConfigured: this.chatConfig.isValid(),
        formFillerConfigured: this.formFillerConfig.isValid(),
      });
    } catch (error) {
      Logger.forScope('DataSourceSyncManager').error('Error during initialization:', error);
    }
  }

  updateAvailableDataSources(extractionHistory?: ExtractionHistoryItem[]): void {
    this.availableDataSources = [];
    if (!extractionHistory || !Array.isArray(extractionHistory)) {
      Logger.forScope('DataSourceSyncManager').debug('No extraction history available');
      return;
    }

    extractionHistory.forEach((item, index) => {
      if (!item.dataSources) return;

      const hasMarkdown =
        typeof item.dataSources.markdown?.content === 'string' &&
        item.dataSources.markdown.content.length > 0;
      const hasCleanedHtml =
        typeof item.dataSources.cleaned?.content === 'string' &&
        item.dataSources.cleaned.content.length > 0;
      const hasRawContent =
        typeof item.dataSources.raw?.content === 'string' &&
        item.dataSources.raw.content.length > 0;

      if (hasMarkdown || hasCleanedHtml || hasRawContent) {
        const source: AvailableDataSource = {
          id: `extraction-${index}-main`,
          title: item.title || `Page ${index + 1}`,
          url: item.url || 'Unknown URL',
          type: 'main',
          markdown:
            (hasMarkdown ? (item.dataSources.markdown?.content ?? '') : '') ||
            (hasCleanedHtml ? (item.dataSources.cleaned?.content ?? '') : '') ||
            (hasRawContent ? (item.dataSources.raw?.content ?? '') : ''),
          cleaned:
            (hasCleanedHtml ? (item.dataSources.cleaned?.content ?? '') : '') ||
            (hasRawContent ? (item.dataSources.raw?.content ?? '') : ''),
          raw:
            (hasRawContent ? (item.dataSources.raw?.content ?? '') : '') ||
            (hasCleanedHtml ? (item.dataSources.cleaned?.content ?? '') : ''),
        };
        if (typeof item.timestamp === 'number') {
          source.timestamp = item.timestamp;
        }
        this.availableDataSources.push(source);
      }
    });

    Logger.forScope('DataSourceSyncManager').info(
      `Updated available data sources: ${this.availableDataSources.length} sources`
    );
    this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.DATA_SOURCES_UPDATED, {
      sources: this.availableDataSources,
    });
  }

  async updateChatConfig(config: DataSourceConfig): Promise<void> {
    try {
      this.chatConfig.updateFrom(config);
      await this.storage.saveChatConfig(this.chatConfig);
      Logger.forScope('DataSourceSyncManager').info('Chat configuration updated:', {
        type: this.chatConfig.type,
        itemCount: this.chatConfig.getCount(),
        isValid: this.chatConfig.isValid(),
      });
      this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CHAT_CONFIG_CHANGED, {
        config: this.chatConfig.clone(),
      });
      this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, {
        config: this.chatConfig.clone(),
        context: 'chat',
      });
    } catch (error) {
      Logger.forScope('DataSourceSyncManager').error('Error updating chat config:', error);
      throw error;
    }
  }

  async updateFormFillerConfig(config: DataSourceConfig): Promise<void> {
    try {
      this.formFillerConfig.updateFrom(config);
      await this.storage.saveFormFillerConfig(this.formFillerConfig);
      Logger.forScope('DataSourceSyncManager').info('Form filler configuration updated:', {
        type: this.formFillerConfig.type,
        itemCount: this.formFillerConfig.getCount(),
        isValid: this.formFillerConfig.isValid(),
      });
      this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.FORM_FILLER_CONFIG_CHANGED, {
        config: this.formFillerConfig.clone(),
      });
      this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, {
        config: this.formFillerConfig.clone(),
        context: 'formFiller',
      });
    } catch (error) {
      Logger.forScope('DataSourceSyncManager').error('Error updating form filler config:', error);
      throw error;
    }
  }

  async syncConfigurationToBoth(config: DataSourceConfig): Promise<void> {
    try {
      await Promise.all([this.updateChatConfig(config), this.updateFormFillerConfig(config)]);
      Logger.forScope('DataSourceSyncManager').info('Configuration synced to both tabs');
      this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, {
        config,
        synced: true,
      });
    } catch (error) {
      Logger.forScope('DataSourceSyncManager').error('Error syncing configuration:', error);
      throw error;
    }
  }

  getChatDataSources(): CombinedDataSources | null {
    return this.getDataSourcesContent(this.chatConfig);
  }

  getFormFillerDataSources(): CombinedDataSources | null {
    return this.getDataSourcesContent(this.formFillerConfig);
  }

  private getDataSourcesContent(config: DataSourceConfig): CombinedDataSources | null {
    if (!config.isValid()) return null;

    const selectedSources = this.availableDataSources.filter(source =>
      config.selectedItems.some(selectedItem => {
        const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
        return selectedId === source.id;
      })
    );

    if (selectedSources.length === 0) return null;

    const combinedContent = selectedSources
      .map(source => {
        let content = '';
        switch (config.type as 'markdown' | 'cleaned' | 'raw') {
          case 'markdown':
            content = source.markdown || source.cleaned || source.raw || '';
            break;
          case 'cleaned':
            content = source.cleaned || source.raw || '';
            break;
          case 'raw':
            content = source.raw || '';
            break;
          default:
            content = source.markdown || source.cleaned || source.raw || '';
        }
        const itemObj: { title: string; url: string; content: string; timestamp?: number } = {
          title: source.title,
          url: source.url,
          content,
        };
        if (typeof source.timestamp === 'number') itemObj.timestamp = source.timestamp;
        return itemObj;
      })
      .filter(item => item.content.trim().length > 0);

    return {
      type: config.type,
      sources: combinedContent,
      combinedText: combinedContent
        .map(item => `## ${item.title}\n${item.content}`)
        .join('\n\n---\n\n'),
    };
  }

  hasValidSelectedSources(config: DataSourceConfig): boolean {
    if (!config.isValid()) return false;
    const validSources = config.selectedItems.filter(selectedItem => {
      const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
      return this.availableDataSources.some(source => source.id === selectedId);
    });
    return validSources.length > 0;
  }

  getConfigurations(): { chat: DataSourceConfig; formFiller: DataSourceConfig } {
    return { chat: this.chatConfig.clone(), formFiller: this.formFillerConfig.clone() };
  }

  getAvailableDataSources(): AvailableDataSource[] {
    return [...this.availableDataSources];
  }
}
