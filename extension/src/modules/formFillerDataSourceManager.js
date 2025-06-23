// modules/formFillerDataSourceManager.js
/**
 * Form Filler Data Source Manager
 * Manages data source configuration specifically for the Form Filler functionality
 */

class FormFillerDataSourceManager {
    constructor(popupDataSourceManager) {
        this.popupDataSourceManager = popupDataSourceManager;
        this.currentConfig = {
            type: 'markdown',
            selectedItems: []
        };
        this.isConfigured = false;
        
        console.log('[FormFillerDataSourceManager] Initialized');
        this.initializeEventListeners();
        this.loadConfiguration();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Configure Sources button
        const openBtn = document.getElementById('openFormFillerDataSourceModalBtn');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                console.log('[FormFillerDataSourceManager] Opening data source modal for Form Filler');
                this.openDataSourceModal();
            });
        }

        // Listen for data source configuration changes from the main manager
        document.addEventListener('dataSourceConfigurationChanged', (event) => {
            console.log('[FormFillerDataSourceManager] Data source configuration changed', event.detail);
            this.updateFromMainConfig(event.detail);
        });
    }

    /**
     * Open the data source modal
     */
    openDataSourceModal() {
        if (this.popupDataSourceManager) {
            // Set a flag to indicate this is for Form Filler
            this.popupDataSourceManager.isFormFillerMode = true;
            this.popupDataSourceManager.formFillerCallback = (config) => {
                this.handleConfigurationUpdate(config);
            };
            this.popupDataSourceManager.openModal();
        }
    }

    /**
     * Handle configuration update from modal
     */
    handleConfigurationUpdate(config) {
        this.currentConfig = { ...config };
        this.isConfigured = config.selectedItems && config.selectedItems.length > 0;
        this.saveConfiguration();
        this.updateUI();
        
        console.log('[FormFillerDataSourceManager] Configuration updated:', {
            type: this.currentConfig.type,
            selectedCount: this.currentConfig.selectedItems.length,
            isConfigured: this.isConfigured
        });
        
        // Notify Form Filler Handler to update button states
        this.notifyFormFillerHandler();
    }

    /**
     * Notify Form Filler Handler about data source configuration changes
     */
    notifyFormFillerHandler() {
        try {
            // Dispatch custom event to notify that Form Filler data sources changed
            const event = new CustomEvent('formFillerDataSourcesChanged', {
                detail: {
                    isConfigured: this.isConfigured,
                    selectedCount: this.currentConfig.selectedItems.length,
                    type: this.currentConfig.type
                }
            });
            document.dispatchEvent(event);
            
            console.log('[FormFillerDataSourceManager] Notified Form Filler Handler about configuration change');
        } catch (error) {
            console.error('[FormFillerDataSourceManager] Error notifying Form Filler Handler:', error);
        }
    }

    /**
     * Update from main configuration (when data sources change)
     */
    updateFromMainConfig(mainConfig) {
        // Only update if we have a valid configuration
        if (this.isConfigured && this.currentConfig.selectedItems.length > 0) {
            // Check if our selected items still exist
            const validItems = this.currentConfig.selectedItems.filter(itemId => 
                mainConfig.availableDataSources.some(source => source.id === itemId)
            );
            
            if (validItems.length !== this.currentConfig.selectedItems.length) {
                this.currentConfig.selectedItems = validItems;
                this.isConfigured = validItems.length > 0;
                this.saveConfiguration();
                this.updateUI();
            }
        }
    }

    /**
     * Get configured data sources with content
     */
    getConfiguredDataSources() {
        if (!this.isConfigured || !this.popupDataSourceManager) {
            return [];
        }

        const availableDataSources = this.popupDataSourceManager.availableDataSources || [];
        const selectedSources = this.currentConfig.selectedItems.map(itemId => {
            const source = availableDataSources.find(s => s.id === itemId);
            if (source) {
                // Get the content based on selected type
                let content = '';
                switch (this.currentConfig.type) {
                    case 'markdown':
                        content = source.markdown || '';
                        break;
                    case 'cleaned':
                        content = source.cleanedHtml || '';
                        break;
                    case 'raw':
                        content = source.html || '';
                        break;
                    default:
                        content = source.markdown || source.cleanedHtml || source.html || '';
                }

                return {
                    id: source.id,
                    title: source.title,
                    url: source.url,
                    type: this.currentConfig.type,
                    content: content,
                    extractedAt: source.extractedAt
                };
            }
            return null;
        }).filter(Boolean);

        console.log('[FormFillerDataSourceManager] Retrieved configured data sources:', {
            count: selectedSources.length,
            type: this.currentConfig.type
        });

        return selectedSources;
    }

    /**
     * Get data sources content for AI reference
     */
    getDataSourcesForAI() {
        const sources = this.getConfiguredDataSources();
        if (sources.length === 0) {
            return '';
        }

        let referenceContent = '\n\n--- REFERENCE DATA SOURCES ---\n';
        sources.forEach((source, index) => {
            referenceContent += `\n[Data Source ${index + 1}: ${source.title}]\n`;
            referenceContent += `URL: ${source.url}\n`;
            referenceContent += `Type: ${source.type}\n`;
            referenceContent += `Content:\n${source.content}\n`;
            referenceContent += '---\n';
        });

        return referenceContent;
    }

    /**
     * Load configuration from storage
     */
    loadConfiguration() {
        try {
            const saved = localStorage.getItem('formFillerDataSourceConfig');
            if (saved) {
                const config = JSON.parse(saved);
                this.currentConfig = {
                    type: config.type || 'markdown',
                    selectedItems: config.selectedItems || []
                };
                this.isConfigured = this.currentConfig.selectedItems.length > 0;
                console.log('[FormFillerDataSourceManager] Loaded configuration:', this.currentConfig);
            }
        } catch (error) {
            console.error('[FormFillerDataSourceManager] Error loading configuration:', error);
        }
        this.updateUI();
    }

    /**
     * Save configuration to storage
     */
    saveConfiguration() {
        try {
            localStorage.setItem('formFillerDataSourceConfig', JSON.stringify(this.currentConfig));
            console.log('[FormFillerDataSourceManager] Configuration saved');
        } catch (error) {
            console.error('[FormFillerDataSourceManager] Error saving configuration:', error);
        }
    }

    /**
     * Update UI with current configuration
     */
    updateUI() {
        const summaryElement = document.getElementById('formFillerDataSourceSummary');
        const summaryTextElement = document.getElementById('formFillerDataSourceSummaryText');
        const openBtn = document.getElementById('openFormFillerDataSourceModalBtn');

        if (!this.popupDataSourceManager) {
            return;
        }

        // Check if we have valid configured sources that actually exist
        const availableDataSources = this.popupDataSourceManager.availableDataSources || [];
        const validSelectedSources = this.currentConfig.selectedItems.filter(itemId => 
            availableDataSources.some(source => source.id === itemId)
        );
        
        const hasValidConfiguration = this.isConfigured && validSelectedSources.length > 0;

        if (hasValidConfiguration) {
            // Show summary
            if (summaryElement) {
                summaryElement.classList.remove('hidden');
            }
            
            // Update summary text
            if (summaryTextElement) {
                const count = validSelectedSources.length;
                const countText = `${count} source${count !== 1 ? 's' : ''}`;
                const typeText = this.getTypeDisplayName(this.currentConfig.type);
                summaryTextElement.textContent = `Selected: ${countText}, ${typeText}`;
            }
            
            // Update button text
            if (openBtn) {
                const buttonText = openBtn.querySelector('.btn__text');
                if (buttonText) {
                    buttonText.textContent = 'Reconfigure Sources';
                }
            }
        } else {
            // Hide summary
            if (summaryElement) {
                summaryElement.classList.add('hidden');
            }
            
            // Reset configuration if items don't exist
            if (this.isConfigured && this.currentConfig.selectedItems.length > 0 && validSelectedSources.length === 0) {
                console.log('[FormFillerDataSourceManager] Resetting invalid configuration');
                this.currentConfig.selectedItems = [];
                this.isConfigured = false;
                this.saveConfiguration();
            }
            
            // Update button text
            if (openBtn) {
                const buttonText = openBtn.querySelector('.btn__text');
                if (buttonText) {
                    buttonText.textContent = 'Configure Sources';
                }
            }
        }
    }

    /**
     * Get display name for data type
     */
    getTypeDisplayName(type) {
        switch (type) {
            case 'markdown': return 'Markdown';
            case 'cleaned': return 'Cleaned HTML';
            case 'raw': return 'Raw HTML';
            default: return 'Unknown';
        }
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = FormFillerDataSourceManager;
}
