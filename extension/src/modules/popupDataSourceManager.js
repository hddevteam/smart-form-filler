/**
 * Popup Data Source Manager
 * Handles the data source selection modal functionality
 */
class PopupDataSourceManager {
    constructor(elements, moduleManager) {
        this.elements = elements;
        this.moduleManager = moduleManager;
        
        // Chat tab data source configuration
        this.currentConfig = {
            type: 'markdown',
            selectedItems: []
        };
        this.isConfigured = false;
        
        // Form Filler data source configuration (separate from chat)
        this.formFillerConfig = {
            type: 'markdown',
            selectedItems: []
        };
        this.formFillerIsConfigured = false;
        
        this.availableDataSources = [];

        console.log('[PopupDataSourceManager] Initialized');
    }

    /**
     * Initialize the data source manager
     */
    async init() {
        try {
            console.log('[PopupDataSourceManager] Initializing...');
            
            // Load saved configuration
            await this.loadConfiguration();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update UI with current configuration
            this.updateUI();
            
            console.log('[PopupDataSourceManager] Initialization complete');
        } catch (error) {
            console.error('[PopupDataSourceManager] Error during initialization:', error);
        }
    }

    /**
     * Set up event listeners for the data source modal
     */
    setupEventListeners() {
        try {
            // Modal close handlers
            if (this.elements.dataSourceModalClose) {
                this.elements.dataSourceModalClose.addEventListener('click', () => {
                    this.closeModal();
                });
            }

            if (this.elements.dataSourceCancelBtn) {
                this.elements.dataSourceCancelBtn.addEventListener('click', () => {
                    this.closeModal();
                });
            }

            if (this.elements.dataSourceApplyBtn) {
                this.elements.dataSourceApplyBtn.addEventListener('click', () => {
                    this.applyConfiguration();
                });
            }

            // Data source type change handlers
            const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
            typeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.handleDataSourceTypeChange(e.target.value);
                    }
                });
            });

            // Modal click outside to close
            if (this.elements.dataSourceModal) {
                this.elements.dataSourceModal.addEventListener('click', (e) => {
                    if (e.target === this.elements.dataSourceModal) {
                        this.closeModal();
                    }
                });
            }

            // Form Filler Configure Sources button
            const formFillerDataSourceBtn = document.getElementById('openFormFillerDataSourceModalBtn');
            if (formFillerDataSourceBtn) {
                formFillerDataSourceBtn.addEventListener('click', () => {
                    this.openModalForFormFiller();
                });
            }

            console.log('[PopupDataSourceManager] Event listeners set up');
        } catch (error) {
            console.error('[PopupDataSourceManager] Error setting up event listeners:', error);
        }
    }

    /**
     * Load saved data source configuration
     */
    async loadConfiguration() {
        try {
            const result = await chrome.storage.local.get(['dataSourceConfig', 'formFillerDataSourceConfig']);
            
            // Load chat data source config
            if (result.dataSourceConfig) {
                this.currentConfig = result.dataSourceConfig;
                this.isConfigured = true;
                console.log('[PopupDataSourceManager] Loaded chat configuration:', this.currentConfig);
            } else {
                console.log('[PopupDataSourceManager] No saved chat configuration found');
            }
            
            // Load form filler data source config
            if (result.formFillerDataSourceConfig) {
                this.formFillerConfig = result.formFillerDataSourceConfig;
                this.formFillerIsConfigured = true;
                console.log('[PopupDataSourceManager] Loaded form filler configuration:', this.formFillerConfig);
            } else {
                console.log('[PopupDataSourceManager] No saved form filler configuration found');
            }
        } catch (error) {
            console.error('[PopupDataSourceManager] Error loading configuration:', error);
        }
    }

    /**
     * Save data source configuration
     */
    async saveConfiguration() {
        try {
            await chrome.storage.local.set({ 
                dataSourceConfig: this.currentConfig,
                formFillerDataSourceConfig: this.formFillerConfig
            });
            console.log('[PopupDataSourceManager] Configurations saved:', {
                chat: this.currentConfig,
                formFiller: this.formFillerConfig
            });
        } catch (error) {
            console.error('[PopupDataSourceManager] Error saving configuration:', error);
        }
    }

    /**
     * Open the data source modal
     */
    openModal() {
        try {
            console.log('[PopupDataSourceManager] Opening modal');
            console.log('[PopupDataSourceManager] Modal element:', this.elements.dataSourceModal);
            console.log('[PopupDataSourceManager] Module manager status:', {
                hasModuleManager: !!this.moduleManager,
                hasResultsHandler: !!this.moduleManager?.resultsHandler,
                hasExtractionHistory: !!this.moduleManager?.resultsHandler?.extractionHistory,
                extractionHistoryLength: this.moduleManager?.resultsHandler?.extractionHistory?.length || 0
            });
            
            if (!this.elements.dataSourceModal) {
                console.error('[PopupDataSourceManager] Modal element not found');
                console.log('[PopupDataSourceManager] Available elements:', Object.keys(this.elements));
                return;
            }

            // Store current context as Chat
            this.currentModalContext = 'chat';

            // Update available data sources from extraction history
            console.log('[PopupDataSourceManager] Calling updateAvailableDataSources...');
            this.updateAvailableDataSources();
            
            // Populate modal with current configuration
            console.log('[PopupDataSourceManager] Calling populateModal...');
            this.populateModal();
            
            // Show the modal
            this.elements.dataSourceModal.classList.remove('hidden');
            this.elements.dataSourceModal.style.display = 'flex';
            
            console.log('[PopupDataSourceManager] Modal should now be visible');
            console.log('[PopupDataSourceManager] Final available data sources count:', this.availableDataSources.length);
            
        } catch (error) {
            console.error('[PopupDataSourceManager] Error opening modal:', error);
        }
    }

    /**
     * Close the data source modal
     */
    closeModal() {
        try {
            console.log('[PopupDataSourceManager] Closing modal');
            
            if (this.elements.dataSourceModal) {
                this.elements.dataSourceModal.classList.add('hidden');
                this.elements.dataSourceModal.style.display = 'none';
            }
            
            // Clear modal context
            this.currentModalContext = null;
        } catch (error) {
            console.error('[PopupDataSourceManager] Error closing modal:', error);
        }
    }

    /**
     * Update available data sources from extraction history
     */
    updateAvailableDataSources() {
        try {
            console.log('[PopupDataSourceManager] [DEBUG] Updating available data sources...');
            console.log('[PopupDataSourceManager] [DEBUG] Module manager:', this.moduleManager);
            console.log('[PopupDataSourceManager] [DEBUG] Results handler:', this.moduleManager?.resultsHandler);
            console.log('[PopupDataSourceManager] [DEBUG] Extraction history exists:', !!this.moduleManager?.resultsHandler?.extractionHistory);
            console.log('[PopupDataSourceManager] [DEBUG] Extraction history length:', this.moduleManager?.resultsHandler?.extractionHistory?.length || 0);
            
            this.availableDataSources = [];
            
            if (this.moduleManager && this.moduleManager.resultsHandler && this.moduleManager.resultsHandler.extractionHistory) {
                const history = this.moduleManager.resultsHandler.extractionHistory;
                console.log('[PopupDataSourceManager] [DEBUG] Found extraction history with', history.length, 'items');
                console.log('[PopupDataSourceManager] [DEBUG] First item structure:', history[0] ? {
                    hasDataSources: !!history[0].dataSources,
                    hasMarkdown: !!history[0].dataSources?.markdown,
                    hasTitle: !!history[0].title,
                    hasUrl: !!history[0].url,
                    dataSourceKeys: history[0].dataSources ? Object.keys(history[0].dataSources) : []
                } : 'No items in history');
                
                history.forEach((item, index) => {
                    console.log('[PopupDataSourceManager] [DEBUG] Processing item', index, ':', item);
                    
                    // Check what content is actually available in the correct structure
                    const hasMarkdown = !!(item.dataSources && item.dataSources.markdown && item.dataSources.markdown.content);
                    const hasCleanedHtml = !!(item.dataSources && item.dataSources.cleaned && item.dataSources.cleaned.content);
                    const hasRawContent = !!(item.dataSources && item.dataSources.raw && item.dataSources.raw.content);
                    
                    console.log('[PopupDataSourceManager] [DEBUG] Content availability:', {
                        hasMarkdown, hasCleanedHtml, hasRawContent,
                        markdownLength: hasMarkdown ? item.dataSources.markdown.content.length : 0,
                        cleanedLength: hasCleanedHtml ? item.dataSources.cleaned.content.length : 0,
                        rawLength: hasRawContent ? item.dataSources.raw.content.length : 0
                    });
                    
                    // Add main page content if any content is available
                    if (item.dataSources && (hasMarkdown || hasCleanedHtml || hasRawContent)) {
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
                        console.log('[PopupDataSourceManager] [DEBUG] Added main page source:', source.title);
                        console.log('[PopupDataSourceManager] [DEBUG] Source content preview:', source.markdown.substring(0, 100) + '...');
                    } else {
                        console.log('[PopupDataSourceManager] [DEBUG] Item', index, 'missing any usable content');
                        console.log('[PopupDataSourceManager] [DEBUG] Item dataSources structure:', item.dataSources);
                    }
                    
                    // Note: The current backend extraction method returns dataSources with raw/cleaned/markdown,
                    // Note: The current backend extraction method returns dataSources with raw/cleaned/markdown,
                    // but doesn't include separate iframe data. For now, we focus on the main content.
                    // Future enhancement could include iframe-specific content if the backend provides it.
                });
            } else {
                console.log('[PopupDataSourceManager] [DEBUG] No extraction history available');
                console.log('[PopupDataSourceManager] [DEBUG] Checks:', {
                    hasModuleManager: !!this.moduleManager,
                    hasResultsHandler: !!this.moduleManager?.resultsHandler,
                    hasExtractionHistory: !!this.moduleManager?.resultsHandler?.extractionHistory
                });
            }
            
            console.log(`[PopupDataSourceManager] Found ${this.availableDataSources.length} available data sources`);
            console.log('[PopupDataSourceManager] [DEBUG] Available sources:', this.availableDataSources);
        } catch (error) {
            console.error('[PopupDataSourceManager] Error updating available data sources:', error);
        }
    }

    /**
     * Populate modal with current configuration and available data sources
     */
    populateModal() {
        try {
            const isFormFiller = this.currentModalContext === 'formFiller';
            const config = isFormFiller ? this.formFillerConfig : this.currentConfig;
            
            // Set data source type
            const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
            typeRadios.forEach(radio => {
                radio.checked = radio.value === config.type;
            });

            // Update data source list
            this.updateDataSourceList();
        } catch (error) {
            console.error('[PopupDataSourceManager] Error populating modal:', error);
        }
    }

    /**
     * Open the data source modal for Form Filler
     */
    openModalForFormFiller() {
        try {
            console.log('[PopupDataSourceManager] Opening modal for Form Filler');
            
            if (!this.elements.dataSourceModal) {
                console.error('[PopupDataSourceManager] Modal element not found');
                return;
            }

            // Store current context as Form Filler
            this.currentModalContext = 'formFiller';
            
            // Update available data sources from extraction history
            this.updateAvailableDataSources();
            
            // Populate modal with Form Filler configuration
            this.populateModalForFormFiller();
            
            // Show the modal
            this.elements.dataSourceModal.classList.remove('hidden');
            this.elements.dataSourceModal.style.display = 'flex';
            
            console.log('[PopupDataSourceManager] Modal opened for Form Filler');
            
        } catch (error) {
            console.error('[PopupDataSourceManager] Error opening modal for Form Filler:', error);
        }
    }

    /**
     * Populate modal with Form Filler configuration
     */
    populateModalForFormFiller() {
        try {
            // Set data source type
            const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
            typeRadios.forEach(radio => {
                radio.checked = radio.value === this.formFillerConfig.type;
            });

            // Update data source list
            this.updateDataSourceList();
        } catch (error) {
            console.error('[PopupDataSourceManager] Error populating modal for Form Filler:', error);
        }
    }

    /**
     * Update the data source list in the modal
     */
    updateDataSourceList() {
        try {
            console.log('[PopupDataSourceManager] [DEBUG] Updating data source list...');
            const dataSourceList = document.getElementById('dataSourceList');
            console.log('[PopupDataSourceManager] [DEBUG] Data source list element:', dataSourceList);
            console.log('[PopupDataSourceManager] [DEBUG] Available data sources count:', this.availableDataSources.length);
            
            if (!dataSourceList) {
                console.error('[PopupDataSourceManager] [DEBUG] dataSourceList element not found');
                return;
            }

            if (this.availableDataSources.length === 0) {
                console.log('[PopupDataSourceManager] [DEBUG] No data sources available, showing empty state');
                dataSourceList.innerHTML = `
                    <div class="data-source-empty">
                        <div class="data-source-empty__icon">📊</div>
                        <div class="data-source-empty__text">No data sources available</div>
                        <div class="data-source-empty__description">
                            Switch to the Data Extraction tab and extract some content first.
                        </div>
                    </div>
                `;
                return;
            }

            console.log('[PopupDataSourceManager] [DEBUG] Generating HTML for', this.availableDataSources.length, 'sources');
            
            const isFormFiller = this.currentModalContext === 'formFiller';
            const config = isFormFiller ? this.formFillerConfig : this.currentConfig;
            
            const html = this.availableDataSources.map(source => {
                // Fix: Check selectedItems properly (it contains objects with id property)
                const isSelected = config.selectedItems.some(item => 
                    (typeof item === 'object' && item.id === source.id) || item === source.id
                );
                const content = source[config.type] || source.markdown || '';
                
                console.log('[PopupDataSourceManager] [DEBUG] Processing source:', {
                    id: source.id,
                    title: source.title,
                    type: source.type,
                    contentLength: content.length,
                    isSelected,
                    context: this.currentModalContext
                });
                
                return `
                    <div class="data-source-item ${isSelected ? 'data-source-item--selected' : ''}" data-source-id="${source.id}">
                        <input type="checkbox" class="data-source-item__checkbox" value="${source.id}" ${isSelected ? 'checked' : ''}>
                        <div class="data-source-item__content">
                            <div class="data-source-item__title">${source.title}</div>
                            <div class="data-source-item__url">${source.url}</div>
                            <div class="data-source-item__meta">
                                <span class="data-source-item__time">${this.formatTimestamp(source.timestamp)}</span>
                                <span class="data-source-item__size">${content.length} chars</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            console.log('[PopupDataSourceManager] [DEBUG] Generated HTML length:', html.length);
            dataSourceList.innerHTML = html;

            // Add event listeners to checkboxes
            const checkboxes = dataSourceList.querySelectorAll('input[type="checkbox"]');
            console.log('[PopupDataSourceManager] [DEBUG] Adding event listeners to', checkboxes.length, 'checkboxes');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    this.handleDataSourceSelection(e.target.closest('.data-source-item'));
                });
            });

            // Add event listeners to items
            const items = dataSourceList.querySelectorAll('.data-source-item');
            console.log('[PopupDataSourceManager] [DEBUG] Adding event listeners to', items.length, 'items');
            items.forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.type !== 'checkbox') {
                        const checkbox = item.querySelector('input[type="checkbox"]');
                        checkbox.checked = !checkbox.checked;
                        this.handleDataSourceSelection(item);
                    }
                });
            });

            console.log('[PopupDataSourceManager] [DEBUG] Data source list updated successfully');
        } catch (error) {
            console.error('[PopupDataSourceManager] Error updating data source list:', error);
        }
    }

    /**
     * Handle data source type change
     */
    handleDataSourceTypeChange(type) {
        try {
            console.log('[PopupDataSourceManager] Data source type changed to:', type);
            this.currentConfig.type = type;
            this.updateDataSourceList();
        } catch (error) {
            console.error('[PopupDataSourceManager] Error handling data source type change:', error);
        }
    }

    /**
     * Handle data source selection
     */
    handleDataSourceSelection(item) {
        try {
            const sourceId = item.dataset.sourceId;
            const checkbox = item.querySelector('input[type="checkbox"]');
            const isSelected = checkbox.checked;
            
            const isFormFiller = this.currentModalContext === 'formFiller';
            const config = isFormFiller ? this.formFillerConfig : this.currentConfig;

            if (isSelected) {
                // Find the full data source object
                const dataSource = this.availableDataSources.find(source => source.id === sourceId);
                if (dataSource) {
                    // Check if not already selected (comparing by ID for consistency)
                    const alreadySelected = config.selectedItems.some(selectedItem => 
                        (typeof selectedItem === 'object' && selectedItem.id === sourceId) || selectedItem === sourceId
                    );
                    
                    if (!alreadySelected) {
                        // Store as object for consistency with sync operations
                        const selectedItemObject = {
                            id: dataSource.id,
                            title: dataSource.title,
                            url: dataSource.url,
                            timestamp: dataSource.timestamp,
                            content: dataSource[config.type] || dataSource.markdown || ''
                        };
                        config.selectedItems.push(selectedItemObject);
                    }
                }
                item.classList.add('data-source-item--selected');
            } else {
                // Remove by comparing ID (handle both object and string formats)
                config.selectedItems = config.selectedItems.filter(selectedItem => {
                    const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
                    return selectedId !== sourceId;
                });
                item.classList.remove('data-source-item--selected');
            }

            console.log('[PopupDataSourceManager] Selected items:', config.selectedItems);
        } catch (error) {
            console.error('[PopupDataSourceManager] Error handling data source selection:', error);
        }
    }

    /**
     * Apply the data source configuration
     */
    async applyConfiguration() {
        try {
            console.log('[PopupDataSourceManager] Applying configuration for context:', this.currentModalContext);

            const isFormFiller = this.currentModalContext === 'formFiller';
            const config = isFormFiller ? this.formFillerConfig : this.currentConfig;

            // Get selected data source type
            const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
            const selectedType = Array.from(typeRadios).find(radio => radio.checked)?.value || 'markdown';
            config.type = selectedType;

            // Get selected items and create consistent object format
            const selectedItems = [];
            const checkboxes = document.querySelectorAll('#dataSourceList input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                const sourceId = checkbox.value;
                // Find the full data source object
                const dataSource = this.availableDataSources.find(source => source.id === sourceId);
                if (dataSource) {
                    const selectedItemObject = {
                        id: dataSource.id,
                        title: dataSource.title,
                        url: dataSource.url,
                        timestamp: dataSource.timestamp,
                        content: dataSource[selectedType] || dataSource.markdown || ''
                    };
                    selectedItems.push(selectedItemObject);
                }
            });
            config.selectedItems = selectedItems;

            console.log('[PopupDataSourceManager] Selected items count:', config.selectedItems.length);

            // Mark as configured
            if (isFormFiller) {
                this.formFillerIsConfigured = true;
                // Also sync to main config if Form Filler is being configured
                this.currentConfig = { ...config };
                this.isConfigured = true;
            } else {
                this.isConfigured = true;
                // Also sync to Form Filler config if main config is being updated
                this.formFillerConfig = { ...config };
                this.formFillerIsConfigured = true;
            }

            // Save configuration
            await this.saveConfiguration();

            // Update UI for both Chat and Form Filler
            this.updateUI();
            this.updateFormFillerUI();

            // Close modal
            this.closeModal();

            // Notify other modules
            this.notifyConfigurationChanged();
            this.notifyFormFillerDataSourceChange();

            this.showMessage('✅ Data sources configured successfully', 'success');
            console.log('[PopupDataSourceManager] Configuration applied successfully and synced across tabs');
        } catch (error) {
            console.error('[PopupDataSourceManager] Error applying configuration:', error);
            this.showError('Error applying configuration');
        }
    }

    /**
     * Update UI with current configuration
     */
    updateUI() {
        try {
            // Update available data sources first to ensure we have current data
            this.updateAvailableDataSources();
            
            // Update chat tab summary element (single text element)
            const dataSourceSummaryText = document.getElementById('dataSourceSummaryText');
            const openDataSourceModalBtn = document.getElementById('openDataSourceModalBtn');

            // Check if we have valid configured sources that actually exist in available sources
            const validSelectedSources = this.currentConfig.selectedItems.filter(selectedItem => {
                const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
                return this.availableDataSources.some(source => source.id === selectedId);
            });
            
            const hasValidConfiguration = this.isConfigured && validSelectedSources.length > 0;
            
            console.log('[PopupDataSourceManager] [DEBUG] UI Update check:', {
                isConfigured: this.isConfigured,
                configuredItems: this.currentConfig.selectedItems.length,
                availableDataSources: this.availableDataSources.length,
                validSelectedSources: validSelectedSources.length,
                hasValidConfiguration
            });

            if (hasValidConfiguration) {
                // Update summary text with combined information
                if (dataSourceSummaryText) {
                    const count = validSelectedSources.length;
                    const countText = `${count} source${count !== 1 ? 's' : ''}`;
                    const typeText = this.getTypeDisplayName(this.currentConfig.type);
                    dataSourceSummaryText.textContent = `Selected: ${countText}, ${typeText}`;
                }
                
                // Update button text
                if (openDataSourceModalBtn) {
                    const buttonText = openDataSourceModalBtn.querySelector('.btn__text');
                    if (buttonText) {
                        buttonText.textContent = 'Reconfigure Sources';
                    }
                }
            } else {
                // No valid sources configured - reset configuration if items don't exist
                if (this.isConfigured && this.currentConfig.selectedItems.length > 0 && validSelectedSources.length === 0) {
                    console.log('[PopupDataSourceManager] [DEBUG] Resetting invalid configuration');
                    this.currentConfig.selectedItems = [];
                    this.isConfigured = false;
                    this.saveConfiguration(); // Save the reset state
                }
                
                // No sources configured
                if (dataSourceSummaryText) {
                    dataSourceSummaryText.textContent = 'Selected: 0 sources, No type selected';
                }
                
                if (openDataSourceModalBtn) {
                    const buttonText = openDataSourceModalBtn.querySelector('.btn__text');
                    if (buttonText) {
                        buttonText.textContent = 'Configure Sources';
                    }
                }
            }

            // Update Form Filler UI
            this.updateFormFillerUI();
            
            console.log('[PopupDataSourceManager] UI updated with configuration:', {
                configured: hasValidConfiguration,
                selectedCount: validSelectedSources.length
            });
        } catch (error) {
            console.error('[PopupDataSourceManager] Error updating UI:', error);
        }
    }

    /**
     * Update Chat tab data source configuration (called from external sync)
     */
    updateChatConfiguration(config) {
        this.currentConfig = { ...config };
        this.isConfigured = true;
        
        // Also sync to Form Filler to ensure consistency
        this.formFillerConfig = { ...config };
        this.formFillerIsConfigured = true;
        
        console.log('[PopupDataSourceManager] Chat configuration updated and synced to Form Filler:', config);
        
        // Update both UIs
        this.updateChatUI();
        this.updateFormFillerUI();
    }

    /**
     * Update Form Filler data source configuration (called from external sync)
     */
    updateFormFillerConfiguration(config) {
        this.formFillerConfig = { ...config };
        this.formFillerIsConfigured = true;
        
        // Also sync to main config to ensure consistency
        this.currentConfig = { ...config };
        this.isConfigured = true;
        
        console.log('[PopupDataSourceManager] Form Filler configuration updated and synced to Chat:', config);
        
        // Update both UIs
        this.updateFormFillerUI();
        this.updateChatUI();
        
        // Trigger form filler button state update
        this.notifyFormFillerDataSourceChange();
    }

    /**
     * Update Chat tab UI to reflect current configuration
     */
    updateChatUI() {
        try {
            // Update chat data source status
            const chatStatus = document.getElementById('chatDataSourceStatus');
            if (chatStatus && this.isConfigured) {
                const count = this.currentConfig.selectedItems.length;
                chatStatus.textContent = `${count} data source${count !== 1 ? 's' : ''} selected`;
                chatStatus.className = 'data-source-status data-source-status--configured';
            }
        } catch (error) {
            console.error('[PopupDataSourceManager] Error updating chat UI:', error);
        }
    }

    /**
     * Update Form Filler UI to reflect current configuration
     */
    updateFormFillerUI() {
        try {
            // Update available data sources first to ensure we have current data
            this.updateAvailableDataSources();
            
            const formFillerSummaryElement = document.getElementById('formFillerDataSourceSummary');
            const formFillerSummaryText = document.getElementById('formFillerDataSourceSummaryText');
            const formFillerConfigButton = document.getElementById('openFormFillerDataSourceModalBtn');

            console.log('[PopupDataSourceManager] [DEBUG] updateFormFillerUI called:', {
                formFillerIsConfigured: this.formFillerIsConfigured,
                selectedItemsCount: this.formFillerConfig.selectedItems.length,
                availableDataSourcesCount: this.availableDataSources.length,
                formFillerConfigType: this.formFillerConfig.type
            });

            // Check if we have valid configured sources
            const validSelectedSources = this.formFillerConfig.selectedItems.filter(selectedItem => {
                const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
                const found = this.availableDataSources.some(source => source.id === selectedId);
                console.log('[PopupDataSourceManager] [DEBUG] Checking source:', { selectedId, found });
                return found;
            });
            
            const hasValidConfiguration = this.formFillerIsConfigured && validSelectedSources.length > 0;

            console.log('[PopupDataSourceManager] [DEBUG] Form Filler validation:', {
                hasValidConfiguration,
                validSelectedSourcesCount: validSelectedSources.length,
                formFillerIsConfigured: this.formFillerIsConfigured
            });

            if (hasValidConfiguration) {
                // Show summary and update text
                if (formFillerSummaryElement) {
                    formFillerSummaryElement.classList.remove('hidden');
                    console.log('[PopupDataSourceManager] [DEBUG] Showing Form Filler summary');
                }
                
                if (formFillerSummaryText) {
                    const count = validSelectedSources.length;
                    const countText = `${count} source${count !== 1 ? 's' : ''}`;
                    const typeText = this.getTypeDisplayName(this.formFillerConfig.type);
                    const summaryText = `Selected: ${countText}, ${typeText}`;
                    formFillerSummaryText.textContent = summaryText;
                    console.log('[PopupDataSourceManager] [DEBUG] Updated summary text:', summaryText);
                }
                
                // Update button text
                if (formFillerConfigButton) {
                    const buttonText = formFillerConfigButton.querySelector('.btn__text');
                    if (buttonText) {
                        buttonText.textContent = 'Reconfigure Sources';
                    }
                }
            } else {
                // Hide summary when no sources
                if (formFillerSummaryElement) {
                    formFillerSummaryElement.classList.add('hidden');
                    console.log('[PopupDataSourceManager] [DEBUG] Hiding Form Filler summary');
                }
                
                if (formFillerSummaryText) {
                    formFillerSummaryText.textContent = 'Selected: 0 sources, No type selected';
                }
                
                if (formFillerConfigButton) {
                    const buttonText = formFillerConfigButton.querySelector('.btn__text');
                    if (buttonText) {
                        buttonText.textContent = 'Configure Sources';
                    }
                }
            }

            console.log('[PopupDataSourceManager] Form Filler UI updated:', {
                hasValidConfiguration,
                selectedCount: validSelectedSources.length,
                summaryVisible: hasValidConfiguration ? 'YES' : 'NO'
            });
        } catch (error) {
            console.error('[PopupDataSourceManager] Error updating form filler UI:', error);
        }
    }

    /**
     * Notify Form Filler about data source changes
     */
    notifyFormFillerDataSourceChange() {
        try {
            // Dispatch custom event for form filler to update button states
            const event = new CustomEvent('formFillerDataSourceChanged', {
                detail: {
                    hasDataSources: this.formFillerIsConfigured && this.formFillerConfig.selectedItems.length > 0,
                    config: this.formFillerConfig
                }
            });
            document.dispatchEvent(event);
            console.log('[PopupDataSourceManager] Notified Form Filler about data source change');
        } catch (error) {
            console.error('[PopupDataSourceManager] Error notifying form filler:', error);
        }
    }

    /**
     * Get type display name
     */
    getTypeDisplayName(type) {
        const names = {
            'markdown': 'Markdown',
            'cleaned': 'Cleaned HTML',
            'raw': 'Raw HTML'
        };
        return names[type] || type;
    }

    /**
     * Get configuration summary for display
     */
    getConfigSummary() {
        if (!this.currentConfig.selectedItems.length) {
            return 'No data sources selected';
        }

        const selectedSources = this.availableDataSources.filter(source => 
            this.currentConfig.selectedItems.includes(source.id)
        );

        if (selectedSources.length === 1) {
            return selectedSources[0].title;
        } else {
            return `${selectedSources.length} sources: ${selectedSources.slice(0, 2).map(s => s.title).join(', ')}${selectedSources.length > 2 ? '...' : ''}`;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (this.moduleManager && this.moduleManager.showMessage) {
            this.moduleManager.showMessage(`❌ ${message}`, "error");
        } else {
            alert(message);
        }
    }

    /**
     * Show success message
     */
    showMessage(message, type) {
        if (this.moduleManager && this.moduleManager.showMessage) {
            this.moduleManager.showMessage(message, type);
        } else {
            console.log(message);
        }
    }

    /**
     * Notify other modules that configuration has changed
     */
    notifyConfigurationChanged() {
        try {
            // Notify chat handler if available
            if (this.moduleManager && this.moduleManager.chatHandler) {
                this.moduleManager.chatHandler.onDataSourceChanged?.(this.currentConfig);
            }
            
            console.log('[PopupDataSourceManager] Configuration change notification sent');
        } catch (error) {
            console.error('[PopupDataSourceManager] Error notifying configuration change:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfiguration() {
        console.log('[PopupDataSourceManager] [DEBUG] Getting configuration:', this.currentConfig);
        console.log('[PopupDataSourceManager] [DEBUG] Is configured:', this.isConfigured);
        console.log('[PopupDataSourceManager] [DEBUG] Available data sources count:', this.availableDataSources.length);
        return this.currentConfig;
    }

    /**
     * Get selected data sources content
     */
    getSelectedDataSourcesContent() {
        console.log('[PopupDataSourceManager] [DEBUG] Getting selected data sources content');
        console.log('[PopupDataSourceManager] [DEBUG] Current config selected items:', this.currentConfig.selectedItems);
        console.log('[PopupDataSourceManager] [DEBUG] Available data sources:', this.availableDataSources.map(s => s.id));
        
        const selectedSources = this.availableDataSources.filter(source => 
            this.currentConfig.selectedItems.includes(source.id)
        );

        console.log('[PopupDataSourceManager] [DEBUG] Filtered selected sources:', selectedSources.length);

        return selectedSources.map(source => {
            const content = source[this.currentConfig.type] || source.markdown || '';
            return {
                id: source.id,
                title: source.title,
                url: source.url,
                type: source.type,
                content: content
            };
        });
    }

    /**
     * Get Form Filler data source configuration and content
     */
    getFormFillerDataSources() {
        try {
            if (!this.formFillerIsConfigured || this.formFillerConfig.selectedItems.length === 0) {
                return null;
            }

            // Fix: Handle both object and string formats in selectedItems
            const selectedSources = this.availableDataSources.filter(source => 
                this.formFillerConfig.selectedItems.some(selectedItem => {
                    const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
                    return selectedId === source.id;
                })
            );

            if (selectedSources.length === 0) {
                return null;
            }

            const dataType = this.formFillerConfig.type;
            const combinedContent = selectedSources.map(source => {
                let content = '';
                switch (dataType) {
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
                type: dataType,
                sources: combinedContent,
                combinedText: combinedContent.map(item => 
                    `## ${item.title}\n${item.content}`
                ).join('\n\n---\n\n')
            };
        } catch (error) {
            console.error('[PopupDataSourceManager] Error getting Form Filler data sources:', error);
            return null;
        }
    }

    /**
     * Get Chat data source configuration and content
     */
    getChatDataSources() {
        try {
            if (!this.isConfigured || this.currentConfig.selectedItems.length === 0) {
                return null;
            }

            const selectedSources = this.availableDataSources.filter(source => 
                this.currentConfig.selectedItems.includes(source.id)
            );

            if (selectedSources.length === 0) {
                return null;
            }

            const dataType = this.currentConfig.type;
            const combinedContent = selectedSources.map(source => {
                let content = '';
                switch (dataType) {
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
                type: dataType,
                sources: combinedContent,
                combinedText: combinedContent.map(item => 
                    `## ${item.title}\n${item.content}`
                ).join('\n\n---\n\n')
            };
        } catch (error) {
            console.error('[PopupDataSourceManager] Error getting Chat data sources:', error);
            return null;
        }
    }

    /**
     * Check if data source is configured
     */
    isDataSourceConfigured() {
        // Check if we have valid configured sources that actually exist in available sources
        const validSelectedSources = this.currentConfig.selectedItems.filter(itemId => 
            this.availableDataSources.some(source => source.id === itemId)
        );
        
        const isConfigured = this.isConfigured && validSelectedSources.length > 0;
        console.log('[PopupDataSourceManager] [DEBUG] Is data source configured:', {
            isConfigured: this.isConfigured,
            selectedItemsCount: this.currentConfig.selectedItems.length,
            availableDataSourcesCount: this.availableDataSources.length,
            validSelectedSourcesCount: validSelectedSources.length,
            result: isConfigured
        });
        return isConfigured;
    }

    /**
     * Check if modal should be shown automatically (when entering chat tab)
     */
    shouldShowModalOnChatEnter() {
        return !this.isDataSourceConfigured();
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        try {
            if (!timestamp) return 'Unknown time';
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (error) {
            return 'Invalid time';
        }
    }
}

// Export the class
window.PopupDataSourceManager = PopupDataSourceManager;
