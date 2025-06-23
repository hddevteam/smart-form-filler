/**
 * Data Source UI Controller
 * Handles UI updates and interactions for data source management
 */
class DataSourceUIController {
    constructor(elements, eventEmitter) {
        this.elements = elements;
        this.eventEmitter = eventEmitter;
        this.currentModalContext = null; // 'chat' or 'formFiller'
    }

    /**
     * Initialize UI controller
     */
    init() {
        this.setupEventListeners();
        console.log('[DataSourceUIController] Initialized');
    }

    /**
     * Setup event listeners for UI interactions
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
                    this.handleApplyConfiguration();
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
                    this.openModalForContext('formFiller');
                });
            }

            console.log('[DataSourceUIController] Event listeners set up');
        } catch (error) {
            console.error('[DataSourceUIController] Error setting up event listeners:', error);
        }
    }

    /**
     * Open modal for specific context
     */
    openModalForContext(context) {
        if (!this.elements.dataSourceModal) {
            console.error('[DataSourceUIController] Modal element not found');
            return;
        }

        this.currentModalContext = context;
        this.elements.dataSourceModal.classList.remove('hidden');
        this.elements.dataSourceModal.style.display = 'flex';
        
        this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.MODAL_OPENED, {
            context: context
        });
        
        console.log(`[DataSourceUIController] Modal opened for context: ${context}`);
    }

    /**
     * Close modal
     */
    closeModal() {
        if (this.elements.dataSourceModal) {
            this.elements.dataSourceModal.classList.add('hidden');
            this.elements.dataSourceModal.style.display = 'none';
        }
        
        const previousContext = this.currentModalContext;
        this.currentModalContext = null;
        
        this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.MODAL_CLOSED, {
            context: previousContext
        });
        
        console.log('[DataSourceUIController] Modal closed');
    }

    /**
     * Update data source list in modal
     */
    updateDataSourceList(availableDataSources, currentConfig) {
        try {
            const dataSourceList = document.getElementById('dataSourceList');
            if (!dataSourceList) {
                console.error('[DataSourceUIController] dataSourceList element not found');
                return;
            }

            if (availableDataSources.length === 0) {
                this.showEmptyDataSourceList(dataSourceList);
                return;
            }

            const html = availableDataSources.map(source => {
                const isSelected = currentConfig.selectedItems.some(item => 
                    (typeof item === 'object' && item.id === source.id) || item === source.id
                );
                const content = source[currentConfig.type] || source.markdown || '';
                
                return `
                    <div class="data-source-item ${isSelected ? 'data-source-item--selected' : ''}" data-source-id="${source.id}">
                        <input type="checkbox" class="data-source-item__checkbox" value="${source.id}" ${isSelected ? 'checked' : ''}>
                        <div class="data-source-item__content">
                            <div class="data-source-item__title">${this.escapeHtml(source.title)}</div>
                            <div class="data-source-item__url">${this.escapeHtml(source.url)}</div>
                            <div class="data-source-item__meta">
                                <span class="data-source-item__time">${this.formatTimestamp(source.timestamp)}</span>
                                <span class="data-source-item__size">${content.length} chars</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            dataSourceList.innerHTML = html;
            this.attachDataSourceListeners(dataSourceList);
            
            console.log('[DataSourceUIController] Data source list updated');
        } catch (error) {
            console.error('[DataSourceUIController] Error updating data source list:', error);
        }
    }

    /**
     * Show empty data source list
     */
    showEmptyDataSourceList(container) {
        container.innerHTML = `
            <div class="data-source-empty">
                <div class="data-source-empty__icon">📊</div>
                <div class="data-source-empty__text">No data sources available</div>
                <div class="data-source-empty__description">
                    Switch to the Data Extraction tab and extract some content first.
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to data source items
     */
    attachDataSourceListeners(container) {
        // Add event listeners to checkboxes
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.handleDataSourceSelection(e.target.closest('.data-source-item'));
            });
        });

        // Add event listeners to items
        const items = container.querySelectorAll('.data-source-item');
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    this.handleDataSourceSelection(item);
                }
            });
        });
    }

    /**
     * Handle data source selection change
     */
    handleDataSourceSelection(item) {
        const sourceId = item.dataset.sourceId;
        const checkbox = item.querySelector('input[type="checkbox"]');
        const isSelected = checkbox.checked;
        
        if (isSelected) {
            item.classList.add('data-source-item--selected');
        } else {
            item.classList.remove('data-source-item--selected');
        }

        // Emit selection change event
        this.eventEmitter.emit('dataSourceSelectionChanged', {
            sourceId: sourceId,
            isSelected: isSelected,
            context: this.currentModalContext
        });
    }

    /**
     * Handle data source type change
     */
    handleDataSourceTypeChange(type) {
        this.eventEmitter.emit('dataSourceTypeChanged', {
            type: type,
            context: this.currentModalContext
        });
    }

    /**
     * Handle apply configuration
     */
    handleApplyConfiguration() {
        // Get selected data source type
        const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
        const selectedType = Array.from(typeRadios).find(radio => radio.checked)?.value || 'markdown';

        // Get selected items
        const checkboxes = document.querySelectorAll('#dataSourceList input[type="checkbox"]:checked');
        const selectedItemIds = Array.from(checkboxes).map(checkbox => checkbox.value);

        this.eventEmitter.emit('applyConfiguration', {
            type: selectedType,
            selectedItemIds: selectedItemIds,
            context: this.currentModalContext
        });
    }

    /**
     * Update modal with configuration
     */
    populateModal(config, availableDataSources) {
        try {
            // Set data source type
            const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
            typeRadios.forEach(radio => {
                radio.checked = radio.value === config.type;
            });

            // Update data source list
            this.updateDataSourceList(availableDataSources, config);
        } catch (error) {
            console.error('[DataSourceUIController] Error populating modal:', error);
        }
    }

    /**
     * Update chat UI status
     */
    updateChatUI(config) {
        try {
            // Update the actual data source summary text element in Chat tab
            const dataSourceSummaryText = document.getElementById('dataSourceSummaryText');
            if (dataSourceSummaryText) {
                if (config.isValid()) {
                    const count = config.getCount();
                    const typeText = this.getTypeDisplayName(config.type);
                    dataSourceSummaryText.textContent = `Selected: ${count} source${count !== 1 ? 's' : ''}, ${typeText}`;
                } else {
                    dataSourceSummaryText.textContent = 'Selected: 0 sources, No type selected';
                }
            }
            
            // Also check for legacy chatDataSourceStatus element (for backward compatibility)
            const chatStatus = document.getElementById('chatDataSourceStatus');
            if (chatStatus) {
                if (config.isValid()) {
                    const count = config.getCount();
                    chatStatus.textContent = `${count} data source${count !== 1 ? 's' : ''} selected`;
                    chatStatus.className = 'data-source-status data-source-status--configured';
                } else {
                    chatStatus.textContent = 'No data sources configured';
                    chatStatus.className = 'data-source-status';
                }
            }
            
            // Update chat configuration button (actual button ID is openDataSourceModalBtn)
            const chatConfigBtn = document.getElementById('openDataSourceModalBtn');
            if (chatConfigBtn) {
                const buttonText = chatConfigBtn.querySelector('.btn__text');
                if (buttonText) {
                    buttonText.textContent = config.isValid() ? 'Reconfigure Sources' : 'Configure Sources';
                }
            }
            
            console.log('[DataSourceUIController] Chat UI updated:', {
                isValid: config.isValid(),
                count: config.getCount(),
                type: config.type,
                elementFound: !!dataSourceSummaryText
            });
        } catch (error) {
            console.error('[DataSourceUIController] Error updating chat UI:', error);
        }
    }

    /**
     * Update form filler UI status
     */
    updateFormFillerUI(config, availableDataSources) {
        try {
            const formFillerSummaryElement = document.getElementById('formFillerDataSourceSummary');
            const formFillerSummaryText = document.getElementById('formFillerDataSourceSummaryText');
            const formFillerConfigButton = document.getElementById('openFormFillerDataSourceModalBtn');

            // Check if configuration has valid sources
            const validSelectedSources = config.selectedItems.filter(selectedItem => {
                const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
                return availableDataSources.some(source => source.id === selectedId);
            });
            
            const hasValidConfiguration = config.isValid() && validSelectedSources.length > 0;

            if (hasValidConfiguration) {
                // Show summary and update text
                if (formFillerSummaryElement) {
                    formFillerSummaryElement.classList.remove('hidden');
                }
                
                if (formFillerSummaryText) {
                    const count = validSelectedSources.length;
                    const countText = `${count} source${count !== 1 ? 's' : ''}`;
                    const typeText = this.getTypeDisplayName(config.type);
                    const summaryText = `Selected: ${countText}, ${typeText}`;
                    formFillerSummaryText.textContent = summaryText;
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
                }
                
                // Reset button text
                if (formFillerConfigButton) {
                    const buttonText = formFillerConfigButton.querySelector('.btn__text');
                    if (buttonText) {
                        buttonText.textContent = 'Configure Sources';
                    }
                }
            }
        } catch (error) {
            console.error('[DataSourceUIController] Error updating form filler UI:', error);
        }
    }

    /**
     * Get display name for data source type
     */
    getTypeDisplayName(type) {
        const displayNames = {
            'markdown': 'Markdown',
            'cleaned': 'Cleaned HTML',
            'raw': 'Raw HTML'
        };
        return displayNames[type] || type;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    /**
     * Get current modal context
     */
    getCurrentModalContext() {
        return this.currentModalContext;
    }
}

// Export the class
window.DataSourceUIController = DataSourceUIController;
