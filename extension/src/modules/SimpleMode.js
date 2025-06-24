/**
 * SimpleMode.js - Simple one-click form filling interface
 */

class SimpleMode {
    constructor(formFillerHandler, dataSourceManager) {
        this.formFillerHandler = formFillerHandler;
        this.dataSourceManager = dataSourceManager;
        this.currentStep = 'idle'; // idle, detecting, analyzing, generating, success, error
        this.processingSteps = [
            { key: 'detecting', label: 'Detecting forms...', icon: '🔍' },
            { key: 'analyzing', label: 'Analyzing content...', icon: '📊' },
            { key: 'generating', label: 'Generating mapping...', icon: '🔗' }
        ];
        this.currentStepIndex = -1;
        this.lastError = null;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Get container for simple mode
        this.container = document.getElementById('formFillerSimpleMode');
        if (!this.container) {
            console.error('Simple mode container not found');
            return;
        }

        // Get form elements
        this.languageSelect = this.container.querySelector('#simpleModeLanguageSelect');
        this.dataSourceBtn = this.container.querySelector('#simpleModeDataSourceBtn');
        this.dataSourceText = this.container.querySelector('#simpleModeDataSourceText');
        this.dataSourceIcon = this.container.querySelector('#simpleModeDataSourceIcon');
        this.contentInput = this.container.querySelector('#simpleModeContentInput');
        this.submitBtn = this.container.querySelector('#simpleModeSubmitBtn');
        this.clearBtn = this.container.querySelector('#simpleModeClearBtn');
        this.progressContainer = this.container.querySelector('#simpleModeProgress');
        this.progressText = this.container.querySelector('#simpleModeProgressText');
        this.progressIcon = this.container.querySelector('#simpleModeProgressIcon');
        this.resultsContainer = this.container.querySelector('#simpleModeResults');
        this.fillFormsBtn = this.container.querySelector('#simpleModeFillFormsBtn');
        this.fillSection = this.container.querySelector('#simpleModeFillSection');
        this.errorContainer = this.container.querySelector('#simpleModeError');
        this.errorMessage = this.container.querySelector('#simpleModeErrorMessage');
        this.retryBtn = this.container.querySelector('#simpleModeRetryBtn');
        this.advancedModeBtn = this.container.querySelector('#simpleModeAdvancedBtn');
        
        // Initialize data source button
        this.initializeDataSourceButton();
    }

    initializeDataSourceButton() {
        if (!this.dataSourceBtn) return;
    }

    bindEvents() {
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', () => this.handleSubmit());
        }
        
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.handleClear());
        }
        
        if (this.fillFormsBtn) {
            this.fillFormsBtn.addEventListener('click', () => this.handleFillForms());
        }
        
        if (this.retryBtn) {
            this.retryBtn.addEventListener('click', () => this.handleRetry());
        }
        
        if (this.advancedModeBtn) {
            this.advancedModeBtn.addEventListener('click', () => this.handleSwitchToAdvanced());
        }

        // Auto-resize textarea
        if (this.contentInput) {
            this.contentInput.addEventListener('input', () => {
                this.autoResizeTextarea();
                this.updateSubmitButtonState();
            });
        }

        // Language change
        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', () => this.handleLanguageChange());
        }

        // Data source button click
        if (this.dataSourceBtn) {
            this.dataSourceBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openDataSourceModal();
            });
        }

        // Listen for data source changes from other components
        document.addEventListener('dataSourcesUpdated', () => {
            // DataSourceButton component handles updates
        });
        
        document.addEventListener('formFillerConfigChanged', () => {
            // DataSourceButton component handles updates
        });
        
        document.addEventListener('configurationApplied', () => {
            // DataSourceButton component handles updates
        });
        
        document.addEventListener('dataSourceManagerReady', () => {
            // DataSourceButton component handles updates
        });
    }

    autoResizeTextarea() {
        if (this.contentInput) {
            this.contentInput.style.height = 'auto';
            this.contentInput.style.height = Math.min(this.contentInput.scrollHeight, 200) + 'px';
        }
    }

    updateSubmitButtonState() {
        if (this.submitBtn && this.contentInput) {
            const hasContent = this.contentInput.value.trim().length > 0;
            this.submitBtn.disabled = !hasContent || this.currentStep === 'processing';
        }
    }

    async handleSubmit() {
        const content = this.contentInput?.value?.trim();
        if (!content) {
            this.showError('Please enter content to analyze');
            return;
        }

        try {
            this.showProgress();
            await this.executeWorkflow(content);
        } catch (error) {
            this.showError(`Workflow failed: ${error.message}`, error);
        }
    }

    async executeWorkflow(content) {
        this.currentStep = 'processing';
        this.currentStepIndex = 0;
        
        try {
            // Step 1: Detect Forms
            this.updateProgress(0, 'detecting');
            await this.formFillerHandler.detectForms();
            
            if (!this.formFillerHandler.currentForms || this.formFillerHandler.currentForms.length === 0) {
                throw new Error('No forms found on the current page');
            }

            // Step 2: Analyze Content
            this.updateProgress(1, 'analyzing');
            await this.formFillerHandler.analyzeContentWithFormStructure();
            
            if (!this.formFillerHandler.currentAnalysisResult) {
                throw new Error('Content analysis failed');
            }

            // Step 3: Generate Mapping
            this.updateProgress(2, 'generating');
            await this.formFillerHandler.generateMapping();
            
            if (!this.formFillerHandler.currentMappings || this.formFillerHandler.currentMappings.length === 0) {
                throw new Error('Failed to generate field mappings');
            }

            // Success
            this.showResults();
            
        } catch (error) {
            this.showError(`Step failed: ${error.message}`, error);
            throw error;
        }
    }

    updateProgress(stepIndex, stepKey) {
        this.currentStepIndex = stepIndex;
        const step = this.processingSteps[stepIndex];
        
        if (this.progressIcon) {
            this.progressIcon.textContent = step.icon;
        }
        
        if (this.progressText) {
            this.progressText.textContent = step.label;
        }

        // Add some visual feedback animation
        if (this.progressContainer) {
            this.progressContainer.classList.add('simple-mode__progress--active');
        }
    }

    showProgress() {
        this.hideAllStates();
        if (this.progressContainer) {
            this.progressContainer.classList.remove('hidden');
        }
        this.updateSubmitButtonState();
    }

    showResults() {
        this.currentStep = 'success';
        this.hideAllStates();
        
        if (this.resultsContainer) {
            this.resultsContainer.classList.remove('hidden');
            this.updateResultsDisplay();
        }
        
        // Show the fill section
        if (this.fillSection) {
            this.fillSection.classList.remove('hidden');
        }
        
        if (this.fillFormsBtn) {
            this.fillFormsBtn.disabled = false;
        }
        
        this.updateSubmitButtonState();
    }

    showError(message, error = null) {
        this.currentStep = 'error';
        this.lastError = error;
        this.hideAllStates();
        
        if (this.errorContainer) {
            this.errorContainer.classList.remove('hidden');
        }
        
        if (this.errorMessage) {
            this.errorMessage.textContent = message;
        }
        
        this.updateSubmitButtonState();
    }

    hideAllStates() {
        const containers = [this.progressContainer, this.resultsContainer, this.errorContainer, this.fillSection];
        containers.forEach(container => {
            if (container) {
                container.classList.add('hidden');
            }
        });
    }

    updateResultsDisplay() {
        if (!this.resultsContainer) return;

        const mappings = this.formFillerHandler.currentMappings || [];
        const totalFields = mappings.reduce((sum, mapping) => sum + (mapping.fields?.length || 0), 0);
        
        const resultsHTML = `
            <div class="simple-mode__results-summary">
                <div class="simple-mode__results-stats">
                    <span class="simple-mode__stat">
                        <span class="simple-mode__stat-icon">📝</span>
                        <span class="simple-mode__stat-text">${mappings.length} forms ready</span>
                    </span>
                    <span class="simple-mode__stat">
                        <span class="simple-mode__stat-icon">🎯</span>
                        <span class="simple-mode__stat-text">${totalFields} fields mapped</span>
                    </span>
                </div>
                <div class="simple-mode__results-preview">
                    ${this.generateResultsPreview(mappings)}
                </div>
            </div>
        `;
        
        this.resultsContainer.innerHTML = resultsHTML;
    }

    generateResultsPreview(mappings) {
        if (!mappings || mappings.length === 0) {
            return '<p class="simple-mode__no-results">No mappings generated</p>';
        }

        return mappings.map(mapping => `
            <div class="simple-mode__form-preview">
                <div class="simple-mode__form-title">
                    <span class="simple-mode__form-icon">📋</span>
                    <span class="simple-mode__form-name">${mapping.formTitle || 'Untitled Form'}</span>
                    <span class="simple-mode__field-count">${mapping.fields?.length || 0} fields</span>
                </div>
                <div class="simple-mode__fields-preview">
                    ${(mapping.fields || []).slice(0, 3).map(field => `
                        <div class="simple-mode__field-preview">
                            <span class="simple-mode__field-label">${field.label || field.name}</span>
                            <span class="simple-mode__field-arrow">→</span>
                            <span class="simple-mode__field-value">${this.truncateText(field.suggestedValue || 'N/A', 30)}</span>
                        </div>
                    `).join('')}
                    ${mapping.fields?.length > 3 ? `
                        <div class="simple-mode__field-preview simple-mode__field-preview--more">
                            ... and ${mapping.fields.length - 3} more fields
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    async handleFillForms() {
        try {
            if (this.fillFormsBtn) {
                this.fillFormsBtn.disabled = true;
            }
            
            await this.formFillerHandler.fillForms();
            
            // Show success message
            this.showTemporaryMessage('Forms filled successfully! ✅', 'success');
            
        } catch (error) {
            console.error('Fill forms failed:', error);
            this.showTemporaryMessage(`Fill failed: ${error.message}`, 'error');
        } finally {
            if (this.fillFormsBtn) {
                this.fillFormsBtn.disabled = false;
            }
        }
    }

    handleClear() {
        // Clear form inputs
        if (this.contentInput) {
            this.contentInput.value = '';
            this.autoResizeTextarea();
        }
        
        // Reset state
        this.currentStep = 'idle';
        this.currentStepIndex = -1;
        this.lastError = null;
        
        // Clear results from form filler handler
        if (this.formFillerHandler) {
            this.formFillerHandler.clearAllResults();
        }
        
        // Hide all states
        this.hideAllStates();
        this.updateSubmitButtonState();
        
        // Show success message
        this.showTemporaryMessage('Cleared successfully', 'success');
    }

    handleRetry() {
        if (this.contentInput?.value?.trim()) {
            this.handleSubmit();
        } else {
            this.showError('Please enter content to retry');
        }
    }

    handleSwitchToAdvanced() {
        // Emit event for mode switching
        document.dispatchEvent(new CustomEvent('switchToAdvancedMode', {
            detail: { preserveContent: true }
        }));
    }

    handleLanguageChange() {
        // Update global language setting
        if (this.languageSelect) {
            const globalLanguageSelect = document.getElementById('languageSelect');
            if (globalLanguageSelect) {
                globalLanguageSelect.value = this.languageSelect.value;
                globalLanguageSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    showTemporaryMessage(message, type = 'info') {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = `simple-mode__temp-message simple-mode__temp-message--${type}`;
        messageEl.textContent = message;
        
        // Insert after submit button
        if (this.submitBtn && this.submitBtn.parentNode) {
            this.submitBtn.parentNode.insertBefore(messageEl, this.submitBtn.nextSibling);
        }
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }

    // Data Source Management Methods
    
    getAvailableDataSources() {
        // Get available data sources from data source manager
        if (this.dataSourceManager && this.dataSourceManager.availableDataSources) {
            return this.dataSourceManager.availableDataSources;
        }
        return [];
    }

    getSelectedDataSources() {
        // Get selected data sources from data source manager
        if (this.dataSourceManager && this.dataSourceManager.getFormFillerSelectedSources) {
            const sources = this.dataSourceManager.getFormFillerSelectedSources();
            console.log('[SimpleMode] getSelectedDataSources: Found sources:', sources);
            return sources;
        }
        console.log('[SimpleMode] getSelectedDataSources: No data source manager or method available');
        return [];
    }

    openDataSourceModal() {
        // Use the data source manager to open modal for form filler context
        if (this.dataSourceManager && this.dataSourceManager.openModal) {
            this.dataSourceManager.openModal('formFiller');
        } else {
            console.warn('[SimpleMode] Data source manager not available');
        }
    }

    // Public methods for external control
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }

    isVisible() {
        return this.container && !this.container.classList.contains('hidden');
    }

    getContent() {
        return this.contentInput?.value?.trim() || '';
    }

    setContent(content) {
        if (this.contentInput) {
            this.contentInput.value = content || '';
            this.autoResizeTextarea();
            this.updateSubmitButtonState();
        }
    }

    getLanguage() {
        return this.languageSelect?.value || 'en';
    }

    setLanguage(language) {
        if (this.languageSelect) {
            this.languageSelect.value = language;
        }
    }
}

// Make it available globally
window.SimpleMode = SimpleMode;
