import { DataSourceConfig } from './dataSourceConfig';
import type { DataSourceConfigObject } from '@/types/dataSource';

const STORAGE_KEYS = {
  CHAT_CONFIG: 'dataSourceConfig',
  FORM_FILLER_CONFIG: 'formFillerDataSourceConfig',
} as const;

export class DataSourceStorage {
  async loadChatConfig(): Promise<DataSourceConfig> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.CHAT_CONFIG]);
      return DataSourceConfig.fromObject(
        result[STORAGE_KEYS.CHAT_CONFIG] as Partial<DataSourceConfigObject>
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error loading chat config:', error);
      return new DataSourceConfig();
    }
  }

  async loadFormFillerConfig(): Promise<DataSourceConfig> {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.FORM_FILLER_CONFIG]);
      return DataSourceConfig.fromObject(
        result[STORAGE_KEYS.FORM_FILLER_CONFIG] as Partial<DataSourceConfigObject>
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error loading form filler config:', error);
      return new DataSourceConfig();
    }
  }

  async loadConfigurations(): Promise<{ chatConfig: DataSourceConfig; formFillerConfig: DataSourceConfig }>{
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.CHAT_CONFIG,
        STORAGE_KEYS.FORM_FILLER_CONFIG,
      ]);
      return {
        chatConfig: DataSourceConfig.fromObject(
          result[STORAGE_KEYS.CHAT_CONFIG] as Partial<DataSourceConfigObject>
        ),
        formFillerConfig: DataSourceConfig.fromObject(
          result[STORAGE_KEYS.FORM_FILLER_CONFIG] as Partial<DataSourceConfigObject>
        ),
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error loading configurations:', error);
      return { chatConfig: new DataSourceConfig(), formFillerConfig: new DataSourceConfig() };
    }
  }

  async saveChatConfig(config: DataSourceConfig): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.CHAT_CONFIG]: config.toObject() });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error saving chat config:', error);
      throw error;
    }
  }

  async saveFormFillerConfig(config: DataSourceConfig): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.FORM_FILLER_CONFIG]: config.toObject() });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error saving form filler config:', error);
      throw error;
    }
  }

  async saveConfigurations(chatConfig: DataSourceConfig, formFillerConfig: DataSourceConfig): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.CHAT_CONFIG]: chatConfig.toObject(),
        [STORAGE_KEYS.FORM_FILLER_CONFIG]: formFillerConfig.toObject(),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error saving configurations:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await chrome.storage.local.remove([STORAGE_KEYS.CHAT_CONFIG, STORAGE_KEYS.FORM_FILLER_CONFIG]);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceStorage] Error clearing configurations:', error);
      throw error;
    }
  }
}
