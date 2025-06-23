/**
 * Data Source Storage Manager
 * Handles persistence of data source configurations
 */
class DataSourceStorage {
    constructor() {
        this.STORAGE_KEYS = {
            CHAT_CONFIG: 'dataSourceConfig',
            FORM_FILLER_CONFIG: 'formFillerDataSourceConfig'
        };
    }

    /**
     * Load chat data source configuration
     */
    async loadChatConfig() {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEYS.CHAT_CONFIG]);
            return DataSourceConfig.fromObject(result[this.STORAGE_KEYS.CHAT_CONFIG]);
        } catch (error) {
            console.error('[DataSourceStorage] Error loading chat config:', error);
            return new DataSourceConfig();
        }
    }

    /**
     * Load form filler data source configuration
     */
    async loadFormFillerConfig() {
        try {
            const result = await chrome.storage.local.get([this.STORAGE_KEYS.FORM_FILLER_CONFIG]);
            return DataSourceConfig.fromObject(result[this.STORAGE_KEYS.FORM_FILLER_CONFIG]);
        } catch (error) {
            console.error('[DataSourceStorage] Error loading form filler config:', error);
            return new DataSourceConfig();
        }
    }

    /**
     * Load both configurations
     */
    async loadConfigurations() {
        try {
            const result = await chrome.storage.local.get([
                this.STORAGE_KEYS.CHAT_CONFIG,
                this.STORAGE_KEYS.FORM_FILLER_CONFIG
            ]);

            return {
                chatConfig: DataSourceConfig.fromObject(result[this.STORAGE_KEYS.CHAT_CONFIG]),
                formFillerConfig: DataSourceConfig.fromObject(result[this.STORAGE_KEYS.FORM_FILLER_CONFIG])
            };
        } catch (error) {
            console.error('[DataSourceStorage] Error loading configurations:', error);
            return {
                chatConfig: new DataSourceConfig(),
                formFillerConfig: new DataSourceConfig()
            };
        }
    }

    /**
     * Save chat configuration
     */
    async saveChatConfig(config) {
        try {
            await chrome.storage.local.set({
                [this.STORAGE_KEYS.CHAT_CONFIG]: config.toObject()
            });
        } catch (error) {
            console.error('[DataSourceStorage] Error saving chat config:', error);
            throw error;
        }
    }

    /**
     * Save form filler configuration
     */
    async saveFormFillerConfig(config) {
        try {
            await chrome.storage.local.set({
                [this.STORAGE_KEYS.FORM_FILLER_CONFIG]: config.toObject()
            });
        } catch (error) {
            console.error('[DataSourceStorage] Error saving form filler config:', error);
            throw error;
        }
    }

    /**
     * Save both configurations
     */
    async saveConfigurations(chatConfig, formFillerConfig) {
        try {
            await chrome.storage.local.set({
                [this.STORAGE_KEYS.CHAT_CONFIG]: chatConfig.toObject(),
                [this.STORAGE_KEYS.FORM_FILLER_CONFIG]: formFillerConfig.toObject()
            });
        } catch (error) {
            console.error('[DataSourceStorage] Error saving configurations:', error);
            throw error;
        }
    }

    /**
     * Clear all configurations
     */
    async clearAll() {
        try {
            await chrome.storage.local.remove([
                this.STORAGE_KEYS.CHAT_CONFIG,
                this.STORAGE_KEYS.FORM_FILLER_CONFIG
            ]);
        } catch (error) {
            console.error('[DataSourceStorage] Error clearing configurations:', error);
            throw error;
        }
    }
}

// Export the class
window.DataSourceStorage = DataSourceStorage;
