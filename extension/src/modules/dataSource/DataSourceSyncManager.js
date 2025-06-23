/**
 * Data Source Sync Manager
 * Handles synchronization of data source configurations across tabs and components
 */
class DataSourceSyncManager {
    constructor(storage, eventEmitter) {
        this.storage = storage;
        this.eventEmitter = eventEmitter;
        this.chatConfig = new DataSourceConfig();
        this.formFillerConfig = new DataSourceConfig();
        this.availableDataSources = [];
    }

    /**
     * Initialize the sync manager
     */
    async init() {
        try {
            // Load saved configurations
            const configs = await this.storage.loadConfigurations();
            this.chatConfig = configs.chatConfig;
            this.formFillerConfig = configs.formFillerConfig;
            
            console.log('[DataSourceSyncManager] Initialized with configurations:', {
                chatConfigured: this.chatConfig.isValid(),
                formFillerConfigured: this.formFillerConfig.isValid()
            });
        } catch (error) {
            console.error('[DataSourceSyncManager] Error during initialization:', error);
        }
    }

    /**
     * Update available data sources from extraction history
     */
    updateAvailableDataSources(extractionHistory) {
        this.availableDataSources = [];
        
        if (!extractionHistory || !Array.isArray(extractionHistory)) {
            console.log('[DataSourceSyncManager] No extraction history available');
            return;
        }

        extractionHistory.forEach((item, index) => {
            if (!item.dataSources) return;

            // Check what content is available
            const hasMarkdown = !!(item.dataSources.markdown?.content);
            const hasCleanedHtml = !!(item.dataSources.cleaned?.content);
            const hasRawContent = !!(item.dataSources.raw?.content);

            // Add main page content if any content is available
            if (hasMarkdown || hasCleanedHtml || hasRawContent) {
                const source = {
                    id: `extraction-${index}-main`,
                    title: item.title || `Page ${index + 1}`,
                    url: item.url || 'Unknown URL',
                    type: 'main',
                    markdown: (hasMarkdown ? item.dataSources.markdown.content : '') || 
                             (hasCleanedHtml ? item.dataSources.cleaned.content : '') || 
                             (hasRawContent ? item.dataSources.raw.content : ''),
                    cleaned: (hasCleanedHtml ? item.dataSources.cleaned.content : '') || 
                            (hasRawContent ? item.dataSources.raw.content : ''),
                    raw: (hasRawContent ? item.dataSources.raw.content : '') || 
                        (hasCleanedHtml ? item.dataSources.cleaned.content : ''),
                    timestamp: item.timestamp
                };
                this.availableDataSources.push(source);
            }
        });

        console.log(`[DataSourceSyncManager] Updated available data sources: ${this.availableDataSources.length} sources`);
        this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.DATA_SOURCES_UPDATED, {
            sources: this.availableDataSources
        });
    }

    /**
     * Update chat configuration
     */
    async updateChatConfig(config) {
        try {
            this.chatConfig.updateFrom(config);
            await this.storage.saveChatConfig(this.chatConfig);
            
            console.log('[DataSourceSyncManager] Chat configuration updated:', {
                type: this.chatConfig.type,
                itemCount: this.chatConfig.getCount(),
                isValid: this.chatConfig.isValid()
            });
            
            this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CHAT_CONFIG_CHANGED, {
                config: this.chatConfig.clone()
            });
            
            // Also trigger a general configuration applied event
            this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, {
                config: this.chatConfig.clone(),
                context: 'chat'
            });
        } catch (error) {
            console.error('[DataSourceSyncManager] Error updating chat config:', error);
            throw error;
        }
    }

    /**
     * Update form filler configuration
     */
    async updateFormFillerConfig(config) {
        try {
            this.formFillerConfig.updateFrom(config);
            await this.storage.saveFormFillerConfig(this.formFillerConfig);
            
            console.log('[DataSourceSyncManager] Form filler configuration updated:', {
                type: this.formFillerConfig.type,
                itemCount: this.formFillerConfig.getCount(),
                isValid: this.formFillerConfig.isValid()
            });
            
            this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.FORM_FILLER_CONFIG_CHANGED, {
                config: this.formFillerConfig.clone()
            });
            
            // Also trigger a general configuration applied event
            this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, {
                config: this.formFillerConfig.clone(),
                context: 'formFiller'
            });
        } catch (error) {
            console.error('[DataSourceSyncManager] Error updating form filler config:', error);
            throw error;
        }
    }

    /**
     * Sync configuration to both tabs (external sync from resultsHandler)
     */
    async syncConfigurationToBoth(config) {
        try {
            // Update both configurations with the same data
            await Promise.all([
                this.updateChatConfig(config),
                this.updateFormFillerConfig(config)
            ]);
            
            console.log('[DataSourceSyncManager] Configuration synced to both tabs');
            this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, {
                config: config,
                synced: true
            });
        } catch (error) {
            console.error('[DataSourceSyncManager] Error syncing configuration:', error);
            throw error;
        }
    }

    /**
     * Get chat data sources content
     */
    getChatDataSources() {
        return this.getDataSourcesContent(this.chatConfig);
    }

    /**
     * Get form filler data sources content
     */
    getFormFillerDataSources() {
        return this.getDataSourcesContent(this.formFillerConfig);
    }

    /**
     * Get data sources content for a configuration
     */
    getDataSourcesContent(config) {
        if (!config.isValid()) {
            return null;
        }

        // Filter available sources by selected items
        const selectedSources = this.availableDataSources.filter(source => 
            config.selectedItems.some(selectedItem => {
                const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
                return selectedId === source.id;
            })
        );

        if (selectedSources.length === 0) {
            return null;
        }

        // Build combined content based on data type
        const combinedContent = selectedSources.map(source => {
            let content = '';
            switch (config.type) {
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
            
            return {
                title: source.title,
                url: source.url,
                content: content,
                timestamp: source.timestamp
            };
        }).filter(item => item.content.trim().length > 0);

        return {
            type: config.type,
            sources: combinedContent,
            combinedText: combinedContent.map(item => 
                `## ${item.title}\n${item.content}`
            ).join('\n\n---\n\n')
        };
    }

    /**
     * Check if a configuration has valid selected sources
     */
    hasValidSelectedSources(config) {
        if (!config.isValid()) {
            return false;
        }

        const validSources = config.selectedItems.filter(selectedItem => {
            const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
            return this.availableDataSources.some(source => source.id === selectedId);
        });

        return validSources.length > 0;
    }

    /**
     * Get current configurations
     */
    getConfigurations() {
        return {
            chat: this.chatConfig.clone(),
            formFiller: this.formFillerConfig.clone()
        };
    }

    /**
     * Get available data sources
     */
    getAvailableDataSources() {
        return [...this.availableDataSources];
    }
}

// Export the class
window.DataSourceSyncManager = DataSourceSyncManager;
