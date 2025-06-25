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
            this.updateSubmitButtonState();
        });
        
        document.addEventListener('formFillerConfigChanged', () => {
            // DataSourceButton component handles updates
            this.updateSubmitButtonState();
        });
        
        document.addEventListener('configurationApplied', () => {
            // DataSourceButton component handles updates
            this.updateSubmitButtonState();
        });
        
        document.addEventListener('dataSourceManagerReady', () => {
            // DataSourceButton component handles updates
            this.updateSubmitButtonState();
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
            const hasDataSources = this.hasSelectedDataSources();
            
            // Allow submit if either has content OR has data sources
            const canSubmit = hasContent || hasDataSources;
            this.submitBtn.disabled = !canSubmit || this.currentStep === 'processing';
        }
    }

    hasSelectedDataSources() {
        // Check if there are selected data sources
        const selectedSources = this.getSelectedDataSources();
        return selectedSources && selectedSources.length > 0;
    }

    async handleSubmit() {
        const content = this.contentInput?.value?.trim();
        const hasDataSources = this.hasSelectedDataSources();
        
        // Allow submit if either has content OR has data sources
        if (!content && !hasDataSources) {
            this.showError('Please enter content to analyze or select data sources');
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
            // If no content provided, try to get content from data sources
            let effectiveContent = content;
            if (!effectiveContent) {
                const selectedSources = this.getSelectedDataSources();
                if (selectedSources && selectedSources.length > 0) {
                    // Use the first selected data source content
                    effectiveContent = this.getContentFromDataSources(selectedSources);
                    console.log('[SimpleMode] Using content from data sources:', effectiveContent ? effectiveContent.substring(0, 100) + '...' : 'No content available');
                }
            }
            
            // Step 1: Detect Forms
            this.updateProgress(0, 'detecting');
            await this.formFillerHandler.detectForms();
            
            if (!this.formFillerHandler.currentForms || this.formFillerHandler.currentForms.length === 0) {
                throw new Error('No forms found on the current page');
            }

            // Step 2: Analyze Content - temporarily set content input for the API
            this.updateProgress(1, 'analyzing');
            const contentInput = document.getElementById('fillContentInput');
            const originalValue = contentInput ? contentInput.value : '';
            
            if (contentInput && effectiveContent && !content) {
                // Temporarily set the data source content for analysis
                contentInput.value = effectiveContent;
            }
            
            try {
                await this.formFillerHandler.analyzeContentWithFormStructure();
            } finally {
                // Restore original value
                if (contentInput && !content) {
                    contentInput.value = originalValue;
                }
            }
            
            if (!this.formFillerHandler.currentAnalysisResult) {
                throw new Error('Content analysis failed');
            }

            // Step 3: Generate Mapping
            this.updateProgress(2, 'generating');
            await this.formFillerHandler.generateMapping();
            
            // Always show results, even if mapping failed or returned empty results
            // This allows users to see what forms were detected, even if mapping failed
            this.showResults();
            
            // Check if mapping was successful for informational purposes
            if (!this.formFillerHandler.currentMappings || this.formFillerHandler.currentMappings.length === 0) {
                console.warn('[SimpleMode] Warning: No field mappings were generated, but continuing to show detected forms');
            }
            
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
        
        // Check if we have any valid field mappings
        const hasValidMappings = this.formFillerHandler.currentMappings && 
                                this.formFillerHandler.currentMappings.length > 0;
        
        // Show the fill section only if we have mappings
        if (this.fillSection) {
            if (hasValidMappings) {
                this.fillSection.classList.remove('hidden');
            } else {
                this.fillSection.classList.add('hidden');
            }
        }
        
        if (this.fillFormsBtn) {
            this.fillFormsBtn.disabled = !hasValidMappings;
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

        // Get field-level mappings from formFillerHandler
        const fieldMappings = this.formFillerHandler.currentMappings || [];
        const detectedForms = this.formFillerHandler.currentForms || [];
        
        // Add debug logging to understand the data structure
        console.log('[SimpleMode] Debug - Field mappings:', fieldMappings);
        console.log('[SimpleMode] Debug - Detected forms:', detectedForms);
        
        // Convert field-level mappings to form-level structure for Simple mode display
        const formMappings = this.convertToFormMappings(fieldMappings, detectedForms);
        const totalFields = fieldMappings.length;
        
        // If no successful mappings but we have detected forms, show all forms with 0 fields
        const displayMappings = formMappings.length > 0 ? formMappings : 
            detectedForms.map(form => ({
                formTitle: form.name || form.id || 'Untitled Form',
                formId: form.id,
                fields: []
            }));
        
        console.log('[SimpleMode] Debug - Converted form mappings:', formMappings);
        console.log('[SimpleMode] Debug - Display mappings:', displayMappings);
        
        const resultsHTML = `
            <div class="simple-mode__results-summary">
                <div class="simple-mode__results-stats">
                    <span class="simple-mode__stat">
                        <span class="simple-mode__stat-icon">📝</span>
                        <span class="simple-mode__stat-text">${displayMappings.length} forms ready</span>
                    </span>
                    <span class="simple-mode__stat">
                        <span class="simple-mode__stat-icon">🎯</span>
                        <span class="simple-mode__stat-text">${totalFields} fields mapped</span>
                    </span>
                </div>
                <div class="simple-mode__results-preview">
                    ${this.generateResultsPreview(displayMappings)}
                </div>
            </div>
        `;
        
        this.resultsContainer.innerHTML = resultsHTML;
    }

    convertToFormMappings(fieldMappings, detectedForms) {
        console.log('[SimpleMode] Converting field mappings to form mappings...');
        console.log('[SimpleMode] Field mappings count:', fieldMappings.length);
        console.log('[SimpleMode] Detected forms count:', detectedForms.length);
        
        // If no field mappings, return all detected forms with 0 fields
        if (!fieldMappings || fieldMappings.length === 0) {
            console.log('[SimpleMode] No field mappings found, returning empty forms');
            return detectedForms.map(form => ({
                formTitle: form.name || form.id || 'Untitled Form',
                formId: form.id,
                fields: []
            }));
        }
        
        // Group field mappings by form
        const formMap = new Map();
        
        // First, create entries for all detected forms
        detectedForms.forEach(form => {
            if (!formMap.has(form.id)) {
                formMap.set(form.id, {
                    formTitle: form.name || form.id || 'Untitled Form',
                    formId: form.id,
                    fields: []
                });
            }
        });
        
        // Then add field mappings to their respective forms
        let unmatchedFields = 0;
        fieldMappings.forEach((mapping, index) => {
            console.log(`[SimpleMode] Processing field mapping ${index}:`, mapping);
            
            // Find which form this field belongs to by matching field information
            let targetFormId = null;
            
            // Try to find the form that contains this field
            for (const form of detectedForms) {
                const hasField = form.fields.some(field => {
                    const match = field.id === mapping.fieldId || 
                                 field.name === mapping.fieldName ||
                                 field.name === mapping.fieldId ||
                                 (field.xpath && field.xpath === mapping.xpath);
                    
                    if (match) {
                        console.log(`[SimpleMode] Found matching field in form ${form.id}:`, field);
                    }
                    return match;
                });
                
                if (hasField) {
                    targetFormId = form.id;
                    break;
                }
            }
            
            // If we found a matching form, add the field mapping
            if (targetFormId && formMap.has(targetFormId)) {
                const formData = formMap.get(targetFormId);
                formData.fields.push({
                    label: mapping.fieldLabel || mapping.fieldName || mapping.fieldId,
                    name: mapping.fieldName || mapping.fieldId,
                    suggestedValue: mapping.suggestedValue || mapping.value || 'N/A'
                });
                console.log(`[SimpleMode] Added field to form ${targetFormId}`);
            } else {
                // If no matching form found, create a generic form entry
                unmatchedFields++;
                const genericFormId = 'mapped-form';
                if (!formMap.has(genericFormId)) {
                    formMap.set(genericFormId, {
                        formTitle: 'Mapped Fields',
                        formId: genericFormId,
                        fields: []
                    });
                }
                
                const genericForm = formMap.get(genericFormId);
                genericForm.fields.push({
                    label: mapping.fieldLabel || mapping.fieldName || mapping.fieldId,
                    name: mapping.fieldName || mapping.fieldId,
                    suggestedValue: mapping.suggestedValue || mapping.value || 'N/A'
                });
                console.log(`[SimpleMode] Added unmatched field to generic form:`, mapping.fieldId);
            }
        });
        
        if (unmatchedFields > 0) {
            console.log(`[SimpleMode] Warning: ${unmatchedFields} fields could not be matched to detected forms`);
        }
        
        // Convert map to array
        const result = Array.from(formMap.values());
        console.log('[SimpleMode] Final form mappings:', result);
        
        return result;
    }

    generateResultsPreview(formMappings) {
        if (!formMappings || formMappings.length === 0) {
            return '<p class="simple-mode__no-results">No mappings generated</p>';
        }

        return formMappings.map(formMapping => `
            <div class="simple-mode__form-preview">
                <div class="simple-mode__form-title">
                    <span class="simple-mode__form-icon">📋</span>
                    <span class="simple-mode__form-name">${formMapping.formTitle || 'Untitled Form'}</span>
                    <span class="simple-mode__field-count">${formMapping.fields?.length || 0} fields</span>
                </div>
                <div class="simple-mode__fields-preview">
                    ${(formMapping.fields || []).map(field => `
                        <div class="simple-mode__field-preview simple-mode__field-preview--detailed">
                            <div class="simple-mode__field-label">${field.label || field.name}</div>
                            <div class="simple-mode__field-value">${field.suggestedValue || 'N/A'}</div>
                        </div>
                    `).join('')}
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
        
        // Hide all states first to remove any borders/containers
        this.hideAllStates();
        
        // Clear results content explicitly
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = '';
            this.resultsContainer.classList.add('hidden'); // Ensure it's hidden
        }
        
        // Ensure Fill Forms button is disabled and hidden
        if (this.fillFormsBtn) {
            this.fillFormsBtn.disabled = true;
        }
        
        // Ensure Fill section is hidden
        if (this.fillSection) {
            this.fillSection.classList.add('hidden');
        }
        
        // Clear results from form filler handler
        if (this.formFillerHandler) {
            this.formFillerHandler.clearAllResults();
        }
        
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

    getContentFromDataSources(selectedSources) {
        // Extract content from selected data sources
        if (!selectedSources || selectedSources.length === 0) {
            return '';
        }
        
        // Combine content from all selected sources
        const contents = selectedSources
            .filter(source => source.content)
            .map(source => {
                let content = source.content;
                // Add source title if available
                if (source.title) {
                    content = `[${source.title}]\n${content}`;
                }
                return content;
            });
            
        return contents.join('\n\n---\n\n');
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
