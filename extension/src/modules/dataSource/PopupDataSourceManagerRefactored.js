/**
 * Popup Data Source Manager (Refactored)
 * Main manager that coordinates data source functionality across tabs
 */
class PopupDataSourceManagerRefactored {
    constructor(elements, moduleManager) {
        this.elements = elements;
        this.moduleManager = moduleManager;
        
        // Initialize components
        this.storage = new DataSourceStorage();
        this.eventEmitter = new DataSourceEventEmitter();
        this.syncManager = new DataSourceSyncManager(this.storage, this.eventEmitter);
        this.uiController = new DataSourceUIController(this.elements, this.eventEmitter);
        
        // Bind methods
        this.handleModalOpened = this.handleModalOpened.bind(this);
        this.handleApplyConfiguration = this.handleApplyConfiguration.bind(this);
        this.handleDataSourceSelectionChanged = this.handleDataSourceSelectionChanged.bind(this);
        this.handleDataSourceTypeChanged = this.handleDataSourceTypeChanged.bind(this);
    }

    /**
     * Initialize the manager
     */
    async init() {
        try {
            // Initialize components
            await this.syncManager.init();
            this.uiController.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Update available data sources from extraction history
            this.updateAvailableDataSources();
            
            // Update UI with current configurations
            this.updateAllUI();
        } catch (error) {
            console.error('[PopupDataSourceManagerRefactored] Error during initialization:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for UI events
        this.eventEmitter.on(DataSourceEventEmitter.EVENTS.MODAL_OPENED, this.handleModalOpened);
        this.eventEmitter.on('applyConfiguration', this.handleApplyConfiguration);
        this.eventEmitter.on('dataSourceSelectionChanged', this.handleDataSourceSelectionChanged);
        this.eventEmitter.on('dataSourceTypeChanged', this.handleDataSourceTypeChanged);
        
        // Listen for configuration changes
        this.eventEmitter.on(DataSourceEventEmitter.EVENTS.CHAT_CONFIG_CHANGED, (data) => {
            this.uiController.updateChatUI(data.config);
        });
        
        this.eventEmitter.on(DataSourceEventEmitter.EVENTS.FORM_FILLER_CONFIG_CHANGED, (data) => {
            this.uiController.updateFormFillerUI(data.config, this.syncManager.getAvailableDataSources());
        });
        
        this.eventEmitter.on(DataSourceEventEmitter.EVENTS.DATA_SOURCES_UPDATED, () => {
            this.updateAllUI();
        });
        
        this.eventEmitter.on(DataSourceEventEmitter.EVENTS.CONFIGURATION_APPLIED, (data) => {
            // Notify other modules about the change
            this.notifyConfigurationChanged();
        });
        
        // Listen for extraction history changes (custom event from resultsHandler)
        document.addEventListener('extractionHistoryUpdated', () => {
            this.updateAvailableDataSources();
        });
    }

    /**
     * Handle modal opened event
     */
    handleModalOpened(data) {
        const { context } = data;
        const configs = this.syncManager.getConfigurations();
        const config = context === 'formFiller' ? configs.formFiller : configs.chat;
        const availableDataSources = this.syncManager.getAvailableDataSources();
        
        this.uiController.populateModal(config, availableDataSources);
    }

    /**
     * Handle apply configuration
     */
    async handleApplyConfiguration(data) {
        try {
            const { type, selectedItemIds, context } = data;
            
            // Create new configuration
            const newConfig = new DataSourceConfig(type, selectedItemIds.map(id => ({ id })));
            newConfig.isConfigured = selectedItemIds.length > 0;
            
            // Update appropriate configuration
            if (context === 'formFiller') {
                await this.syncManager.updateFormFillerConfig(newConfig);
            } else {
                await this.syncManager.updateChatConfig(newConfig);
            }
            
            // Close modal
            this.uiController.closeModal();
            
            // Notify other modules
            this.notifyConfigurationChanged();
            
            console.log(`[PopupDataSourceManagerRefactored] Configuration applied for ${context}`);
        } catch (error) {
            console.error('[PopupDataSourceManagerRefactored] Error applying configuration:', error);
        }
    }

    /**
     * Handle data source selection change (for real-time UI updates)
     */
    handleDataSourceSelectionChanged(data) {
        // This is handled by the UI controller for immediate visual feedback
        // The actual configuration is applied when user clicks Apply
        console.log('[PopupDataSourceManagerRefactored] Data source selection changed:', data);
    }

    /**
     * Handle data source type change
     */
    handleDataSourceTypeChanged(data) {
        // Update the data source list to reflect the new type
        const configs = this.syncManager.getConfigurations();
        const currentConfig = data.context === 'formFiller' ? configs.formFiller : configs.chat;
        
        // Create temporary config with new type for UI update
        const tempConfig = currentConfig.clone();
        tempConfig.type = data.type;
        
        const availableDataSources = this.syncManager.getAvailableDataSources();
        this.uiController.updateDataSourceList(availableDataSources, tempConfig);
    }

    /**
     * Update available data sources from extraction history
     */
    updateAvailableDataSources() {
        if (this.moduleManager?.resultsHandler?.extractionHistory) {
            this.syncManager.updateAvailableDataSources(
                this.moduleManager.resultsHandler.extractionHistory
            );
        }
    }

    /**
     * Update all UI components
     */
    updateAllUI() {
        const configs = this.syncManager.getConfigurations();
        const availableDataSources = this.syncManager.getAvailableDataSources();
        
        this.uiController.updateChatUI(configs.chat);
        this.uiController.updateFormFillerUI(configs.formFiller, availableDataSources);
    }

    /**
     * Open modal for chat configuration
     */
    openModal() {
        this.uiController.openModalForContext('chat');
    }

    /**
     * Open modal for form filler configuration
     */
    openModalForFormFiller() {
        this.uiController.openModalForContext('formFiller');
    }

    /**
     * External sync methods (called from resultsHandler)
     */
    async updateChatConfiguration(config) {
        try {
            console.log('[PopupDataSourceManagerRefactored] Updating chat configuration from external source:', config);
            
            // Ensure available data sources are up to date first
            this.updateAvailableDataSources();
            
            const newConfig = DataSourceConfig.fromObject(config);
            await this.syncManager.updateChatConfig(newConfig);
            
            // Force UI update after sync
            setTimeout(() => {
                this.updateAllUI();
            }, 100);
            
            console.log('[PopupDataSourceManagerRefactored] Chat configuration updated successfully');
        } catch (error) {
            console.error('[PopupDataSourceManagerRefactored] Error updating chat configuration:', error);
        }
    }

    async updateFormFillerConfiguration(config) {
        try {
            console.log('[PopupDataSourceManagerRefactored] Updating form filler configuration from external source:', config);
            
            // Ensure available data sources are up to date first
            this.updateAvailableDataSources();
            
            const newConfig = DataSourceConfig.fromObject(config);
            await this.syncManager.updateFormFillerConfig(newConfig);
            
            // Force UI update after sync
            setTimeout(() => {
                this.updateAllUI();
            }, 100);
            
            console.log('[PopupDataSourceManagerRefactored] Form filler configuration updated successfully');
        } catch (error) {
            console.error('[PopupDataSourceManagerRefactored] Error updating form filler configuration:', error);
        }
    }

    /**
     * Get data source content methods
     */
    getChatDataSources() {
        return this.syncManager.getChatDataSources();
    }

    getFormFillerDataSources() {
        return this.syncManager.getFormFillerDataSources();
    }

    /**
     * Configuration status methods
     */
    isDataSourceConfigured() {
        const configs = this.syncManager.getConfigurations();
        return this.syncManager.hasValidSelectedSources(configs.chat);
    }

    getConfiguration() {
        return this.syncManager.getConfigurations().chat.toObject();
    }

    /**
     * Legacy compatibility methods
     */
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

    /**
     * Notify other modules of configuration changes
     */
    notifyConfigurationChanged() {
        try {
            // Notify chat handler if available
            if (this.moduleManager?.chatHandler?.onDataSourceChanged) {
                const configs = this.syncManager.getConfigurations();
                this.moduleManager.chatHandler.onDataSourceChanged(configs.chat.toObject());
            }
            
            console.log('[PopupDataSourceManagerRefactored] Configuration change notification sent');
        } catch (error) {
            console.error('[PopupDataSourceManagerRefactored] Error notifying configuration change:', error);
        }
    }
}

// Export the class
window.PopupDataSourceManagerRefactored = PopupDataSourceManagerRefactored;
