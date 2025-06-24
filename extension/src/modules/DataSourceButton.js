/**
 * DataSourceButton.js - Reusable data source button component
 */

class DataSourceButton {
    constructor(buttonId, textId, iconId, context, dataSourceManager) {
        this.buttonId = buttonId;
        this.textId = textId;
        this.iconId = iconId;
        this.context = context; // 'chat' or 'formFiller'
        this.dataSourceManager = dataSourceManager;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.button = document.getElementById(this.buttonId);
        this.textElement = document.getElementById(this.textId);
        this.iconElement = document.getElementById(this.iconId);

        if (!this.button || !this.textElement || !this.iconElement) {
            console.error(`[DataSourceButton] Elements not found for ${this.context}:`, {
                button: !!this.button,
                text: !!this.textElement,
                icon: !!this.iconElement
            });
        }
    }

    bindEvents() {
        if (this.button) {
            this.button.addEventListener('click', () => this.handleClick());
        }

        // Listen for data source changes
        document.addEventListener('dataSourcesUpdated', () => this.updateButtonState());
        document.addEventListener('chatConfigChanged', () => {
            if (this.context === 'chat') {
                this.updateButtonState();
            }
        });
        document.addEventListener('formFillerConfigChanged', () => {
            if (this.context === 'formFiller') {
                this.updateButtonState();
            }
        });
        document.addEventListener('configurationApplied', () => this.updateButtonState());
        document.addEventListener('dataSourceManagerReady', () => this.updateButtonState());
    }

    handleClick() {
        // Open the data source modal with the appropriate context
        if (this.dataSourceManager && this.dataSourceManager.openModal) {
            this.dataSourceManager.openModal(this.context);
        } else {
            // Fallback: use the existing modal trigger
            this.openDataSourceModal();
        }
    }

    openDataSourceModal() {
        // Find the appropriate modal button and trigger it
        let modalBtnId;
        if (this.context === 'chat') {
            modalBtnId = 'openDataSourceModalBtn';
        } else {
            modalBtnId = 'openFormFillerDataSourceModalBtn';
        }

        const modalBtn = document.getElementById(modalBtnId);
        if (modalBtn) {
            modalBtn.click();
        } else {
            console.warn(`[DataSourceButton] Modal button ${modalBtnId} not found`);
        }
    }

    updateButtonState() {
        if (!this.button || !this.textElement || !this.iconElement) {
            return;
        }

        // Get selected sources for the appropriate context
        const selectedSources = this.getSelectedDataSources();
        
        if (selectedSources.length === 0) {
            // No sources selected - show default state
            this.textElement.textContent = 'Configure sources';
            this.button.classList.remove('simple-mode__data-source-btn--has-selection');
            this.iconElement.textContent = '⚙️';
        } else if (selectedSources.length === 1) {
            // Single source selected - show source name
            const sourceName = selectedSources[0].title || selectedSources[0].url || 'Data source';
            this.textElement.textContent = `Selected: ${this.truncateText(sourceName, 25)}`;
            this.button.classList.add('simple-mode__data-source-btn--has-selection');
            this.iconElement.textContent = '✅';
        } else {
            // Multiple sources selected - show count
            this.textElement.textContent = `Selected: ${selectedSources.length} sources`;
            this.button.classList.add('simple-mode__data-source-btn--has-selection');
            this.iconElement.textContent = '✅';
        }

        // Update text styling
        if (selectedSources.length > 0) {
            this.textElement.classList.add('simple-mode__data-source-text--selected');
        } else {
            this.textElement.classList.remove('simple-mode__data-source-text--selected');
        }

        console.log(`[DataSourceButton] Updated ${this.context} button state: ${selectedSources.length} sources`);
    }

    getSelectedDataSources() {
        if (!this.dataSourceManager) {
            return [];
        }

        try {
            if (this.context === 'chat') {
                return this.dataSourceManager.getChatSelectedSources ? 
                       this.dataSourceManager.getChatSelectedSources() : [];
            } else {
                return this.dataSourceManager.getFormFillerSelectedSources ? 
                       this.dataSourceManager.getFormFillerSelectedSources() : [];
            }
        } catch (error) {
            console.error(`[DataSourceButton] Error getting selected sources for ${this.context}:`, error);
            return [];
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Public methods
    setDataSourceManager(dataSourceManager) {
        this.dataSourceManager = dataSourceManager;
        this.updateButtonState();
    }

    refresh() {
        this.updateButtonState();
    }
}

// Make it available globally
window.DataSourceButton = DataSourceButton;
