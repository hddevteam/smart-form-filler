// edge-extension/src/modules/formUIController.js
/**
 * Form UI Controller - Handles UI updates and display
 */

/* global FormUtils */

/**
 * Controller for form UI operations
 */
class FormUIController {
    constructor() {
        // Initialize Generate Mapping button state
        this.initializeGenerateMappingButton();
        
        // Listen for data source changes
        this.setupDataSourceListener();
    }

    /**
     * Initialize Generate Mapping button with correct initial state
     */
    initializeGenerateMappingButton() {
        const mappingButton = document.getElementById("generateMappingBtn");
        if (mappingButton) {
            // Initially disabled until analysis is completed
            mappingButton.disabled = true;
            console.log('📊 Generate Mapping button initialized with custom logic (disabled initially)');
        }
    }

    /**
     * Setup data source change listener
     */
    setupDataSourceListener() {
        document.addEventListener('formFillerDataSourceChanged', (event) => {
            console.log('📊 Form Filler received data source change event:', event.detail);
            
            // Update button states when data sources change
            const hasAnalyzed = this.isAnalysisCompleted();
            const content = this.getCurrentUserContent();
            this.updateMappingButtonState(hasAnalyzed, content);
        });
    }

    /**
     * Check if analysis has been completed
     */
    isAnalysisCompleted() {
        // Check if analysis results section is visible
        const analysisSection = document.getElementById("analysisResultsSection");
        return analysisSection && !analysisSection.classList.contains("hidden");
    }

    /**
     * Get current user content
     */
    getCurrentUserContent() {
        const contentInput = document.getElementById("fillContentInput");
        return contentInput ? contentInput.value.trim() : "";
    }

    /**
     * Get selected form filler model
     * @returns {string|null} Selected model name or null if service unavailable
     */
    getSelectedFormFillerModel() {
        // Use global model selector instead of form-specific one
        const globalModelSelect = document.getElementById("globalModelSelect");
        const selectedValue = globalModelSelect?.value;
        
        // If no value selected or selector is disabled (service unavailable), return null
        if (!selectedValue || globalModelSelect?.disabled) {
            return null;
        }
        
        return selectedValue;
    }
    
    /**
     * Get selected language
     * @returns {string} Selected language code
     */
    getSelectedLanguage() {
        const languageSelect = document.getElementById("languageSelect");
        return languageSelect ? languageSelect.value : "zh";
    }
    
    /**
     * Get display name for language code
     * @param {string} languageCode - Language code (e.g., "en", "zh", "fr")
     * @returns {string} Display name
     */
    getLanguageDisplayName(languageCode) {
        const languageNames = {
            "en": "English",
            "zh": "Chinese (Simplified)",
            "zh-CN": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            "fr": "Français",
            "de": "Deutsch",
            "es": "Español",
            "ja": "Japanese",
            "ko": "한국어",
            "pt": "Português",
            "ru": "Русский",
            "it": "Italiano",
            "ar": "العربية"
        };
        
        return languageNames[languageCode] || languageCode.charAt(0).toUpperCase() + languageCode.slice(1);
    }
    
    /**
     * Set recommended language and update dropdown
     * @param {string} languageCode - Recommended language code
     */
    setRecommendedLanguage(languageCode) {
        const languageSelect = document.getElementById("languageSelect");
        if (languageSelect && (languageCode === "en" || languageCode === "zh")) {
            // Check if the recommended language option already exists
            const existingOption = Array.from(languageSelect.options).find(option => option.value === languageCode);
            
            if (existingOption) {
                // Select the recommended language
                languageSelect.value = languageCode;
                console.log(`🌐 Language dropdown updated to GPT recommendation: ${languageCode}`);
            } else {
                // Add new option if it doesn't exist (fallback case)
                const newOption = document.createElement("option");
                newOption.value = languageCode;
                // Get language display name or use the code itself
                const displayName = this.getLanguageDisplayName(languageCode);
                newOption.textContent = `${displayName} (Recommended)`;
                languageSelect.appendChild(newOption);
                languageSelect.value = languageCode;
                console.log(`🌐 Added and selected new language option: ${languageCode}`);
            }
            
            // Add visual indicator for recommended choice
            const options = languageSelect.querySelectorAll("option");
            options.forEach(option => {
                if (option.value === languageCode) {
                    option.textContent = option.textContent.includes("(Recommended)") ? 
                        option.textContent : 
                        option.textContent + " (Recommended)";
                } else {
                    option.textContent = option.textContent.replace(" (Recommended)", "");
                }
            });
        }
    }
    
    /**
     * Set detection loading state
     * @param {boolean} isLoading - Loading state
     */
    setDetectionLoading(isLoading) {
        const button = document.getElementById("detectFormsBtn");
        if (button) {
            button.disabled = isLoading;
            button.innerHTML = isLoading ? 
                "<span class=\"spinner\"></span> Detecting..." : 
                "Detect Forms";
        }
    }
    
    /**
     * Set analysis loading state
     * @param {boolean} isLoading - Loading state
     */
    setAnalysisLoading(isLoading) {
        const button = document.getElementById("analyzeContentBtn");
        if (button) {
            button.disabled = isLoading;
            button.innerHTML = isLoading ? 
                "<span class=\"spinner\"></span> Analyzing..." : 
                "Analyze Content";
        }
    }
    
    /**
     * Set mapping loading state
     * @param {boolean} isLoading - Loading state
     */
    setMappingLoading(isLoading) {
        const button = document.getElementById("generateMappingBtn");
        if (button) {
            button.disabled = isLoading;
            button.innerHTML = isLoading ? 
                "<span class=\"spinner\"></span> Generating..." : 
                "Generate Mapping";
        }
    }
    
    /**
     * Set fill loading state
     * @param {boolean} isLoading - Loading state
     */
    setFillLoading(isLoading) {
        const button = document.getElementById("fillFormsBtn");
        if (button) {
            button.disabled = isLoading;
            button.innerHTML = isLoading ? 
                "<span class=\"spinner\"></span> Filling..." : 
                "Fill Forms";
        }
    }
    
    /**
     * Update analyze button state based on content
     */
    updateAnalyzeButtonState() {
        const analyzeButton = document.getElementById("analyzeContentBtn");
        
        if (analyzeButton) {
            // Form detection must be done, but content is optional
            analyzeButton.disabled = false;
            console.log('[FormUIController] Analyze Content button enabled after form detection');
        }
    }
    
    /**
     * Update mapping button state
     * @param {boolean} hasAnalyzed - Whether analysis is completed
     * @param {string} content - User content
     */
    updateMappingButtonState(hasAnalyzed, content) {
        const mappingButton = document.getElementById("generateMappingBtn");
        
        if (mappingButton) {
            // Check if we have data sources configured
            let hasDataSources = false;
            if (window.popupManager && window.popupManager.dataSourceManager) {
                const dataSources = window.popupManager.dataSourceManager.getFormFillerDataSources();
                hasDataSources = dataSources && dataSources.sources && dataSources.sources.length > 0;
            }
            
            const hasUserContent = content && content.trim().length > 0;
            
            // Enable if analysis is done AND (user has content OR data sources are configured)
            mappingButton.disabled = !hasAnalyzed || (!hasUserContent && !hasDataSources);
        }
    }
    
    /**
     * Update fill button states
     * @param {boolean} hasMappings - Whether mappings are available
     */
    updateFillButtonStates(hasMappings) {
        const fillButton = document.getElementById("fillFormsBtn");
        
        if (fillButton) {
            fillButton.disabled = !hasMappings;
        }
    }
    
    /**
     * Reset analysis state in UI
     */
    resetAnalysisState() {
        // Hide results sections
        const sections = [
            "analysisResultsSection",
            "fieldMappingSection",
            "fillActionsSection"
        ];
        
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.add("hidden");
            }
        });
    }
    
    /**
     * Reset only mapping and fill state (preserve analysis results)
     */
    resetMappingState() {
        // Hide only mapping and fill sections, keep analysis results
        const sections = [
            "fieldMappingSection",
            "fillActionsSection"
        ];
        
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.classList.add("hidden");
            }
        });
    }
    
    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this._showMessage(message, "success");
    }
    
    /**
     * Show info message
     * @param {string} message - Info message
     */
    showInfo(message) {
        this._showMessage(message, "info");
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this._showMessage(message, "error");
    }
    
    /**
     * Clear messages
     */
    clearMessages() {
        const messageContainer = document.getElementById("formFillerMessages");
        if (messageContainer) {
            messageContainer.innerHTML = "";
        }
    }
    
    /**
     * Show message
     * @param {string} message - Message text
     * @param {string} type - Message type
     * @private
     */
    _showMessage(message, type) {
        const messageContainer = document.getElementById("formFillerMessages");
        if (!messageContainer) return;
        
        const messageEl = document.createElement("div");
        messageEl.className = `message message--${type}`;
        messageEl.innerHTML = `
            <span class="message__icon"></span>
            <span class="message__text">${FormUtils.escapeHtml(message)}</span>
        `;
        
        // Clear previous messages of the same type
        const existingMessages = messageContainer.querySelectorAll(`.message--${type}`);
        existingMessages.forEach(msg => msg.remove());
        
        messageContainer.appendChild(messageEl);
        
        // Auto-clear success and info messages after delay
        if (type === "success" || type === "info") {
            setTimeout(() => {
                messageEl.remove();
            }, type === "success" ? 5000 : 3000);
        }
    }
    
    /**
     * Display form detection results
     * @param {Object} results - Detection results
     */
    displayFormDetectionResults(results, forms) {
        const resultsContainer = document.getElementById("formDetectionResults");
        const formsCountEl = document.getElementById("formsFoundCount");
        const fieldsCountEl = document.getElementById("fieldsFoundCount");
        const sourceStatsEl = document.getElementById("sourceStats");
        const iframeStatsContainer = document.getElementById("iframeStatsContainer");
        const formsListEl = document.getElementById("formsList");

        if (!resultsContainer || !formsCountEl || !fieldsCountEl || !formsListEl) return;

        // Update summary
        const formsCount = results.summary?.totalForms || results.forms?.length || 0;
        const fieldsCount = results.summary?.totalFields || 0;
        
        formsCountEl.textContent = formsCount;
        fieldsCountEl.textContent = fieldsCount;

        // Update iframe statistics if available
        if (results.summary?.sources && sourceStatsEl && iframeStatsContainer) {
            const sources = results.summary.sources;
            if (sources.iframes > 0) {
                sourceStatsEl.textContent = `Main + ${sources.uniqueIframes} iframe${sources.uniqueIframes > 1 ? "s" : ""}`;
                iframeStatsContainer.classList.remove("hidden");
            } else {
                iframeStatsContainer.classList.add("hidden");
            }
        }

        // Generate forms list HTML
        if (forms && forms.length > 0) {
            formsListEl.innerHTML = forms.map(form => {
                return `
                <div class="form-item">
                    <div class="form-item__header">
                        <span class="form-item__title">${FormUtils.escapeHtml(form.name || form.id || "Unnamed Form")}</span>
                        <span class="form-item__source">${FormUtils.getFormSourceInfo(form)}</span>
                        <span class="form-item__count">${form.fields.length} fields</span>
                    </div>
                    <div class="form-item__fields">
                        ${form.fields.map(field => {
        const fieldName = field.label || field.name || field.id || "Unlabeled field";
        const fieldType = field.type ? ` (${field.type})` : "";
        const fieldSource = field.source && field.source !== "main" ? 
            ` [${field.iframePath || field.source}]` : "";
        const fieldCaption = field.title ? 
            `<div class="field-item__caption">${FormUtils.escapeHtml(field.title)}</div>` : "";
                            
        return `<div class="field-item">
                                <div class="field-item__main">${FormUtils.escapeHtml(fieldName)}${fieldType}${fieldSource}</div>
                                ${fieldCaption}
                            </div>`;
    }).join("")}
                    </div>
                </div>
                `;
            }).join("");
        } else {
            formsListEl.innerHTML = `
                <div class="form-filler-empty">
                    <div class="form-filler-empty__icon">📋</div>
                    <div class="form-filler-empty__text">No forms found</div>
                    <div class="form-filler-empty__description">This page doesn't contain any detectable form fields.</div>
                </div>
            `;
        }

        resultsContainer.classList.remove("hidden");
        
        // Show Content Analysis section after form detection
        const analysisSection = document.getElementById("analysisResultsSection");
        if (analysisSection) {
            analysisSection.classList.remove("hidden");
        }
    }
    
    /**
     * Display form relevance analysis results (Stage 1)
     * @param {Object} relevanceData - Relevance data
     * @param {Array} currentForms - Form array
     */
    displayFormRelevanceResults(relevanceData, currentForms) {
        // Don't modify the original forms list, just display analysis results
        this._displayContentAnalysisResults(relevanceData, currentForms);
        
        // Show field mapping section
        const fieldMappingSection = document.getElementById("fieldMappingSection");
        if (fieldMappingSection) {
            fieldMappingSection.classList.remove("hidden");
        }
    }
    
    /**
     * Display content analysis results in dedicated section
     * @param {Object} relevanceData - Relevance data
     * @param {Array} currentForms - Form array
     * @private
     */
    _displayContentAnalysisResults(relevanceData, currentForms) {
        const analysisResultsEl = document.getElementById("analysisResults");
        const analysisResultsContainer = document.getElementById("analysisResultsContainer");
        
        if (!analysisResultsEl || !analysisResultsContainer) {
            console.warn("⚠️ Cannot display analysis results: missing elements");
            return;
        }
        
        // Find the recommended form
        const recommendedForm = currentForms.find(f => f.id === relevanceData.recommendedForm);
        if (!recommendedForm) {
            console.warn("⚠️ Recommended form not found");
            return;
        }
        
        // Generate field list with descriptions (similar to Detect Forms style)
        const fieldsHtml = recommendedForm.fields.map(field => {
            const fieldName = field.label || field.name || field.id || "Unlabeled field";
            const fieldType = field.type ? ` (${field.type})` : "";
            const fieldSource = field.source && field.source !== "main" ? 
                ` [${field.iframePath || field.source}]` : "";
            
            // Get field description from analysis results
            const fieldDescription = relevanceData.fieldDescriptions && relevanceData.fieldDescriptions[field.id] ? 
                relevanceData.fieldDescriptions[field.id].description : null;
            
            const fieldCaption = field.title ? 
                `<div class="field-item__caption">${FormUtils.escapeHtml(field.title)}</div>` : "";
            
            const descriptionHtml = fieldDescription ? 
                `<div class="field-item__description">${FormUtils.escapeHtml(fieldDescription)}</div>` : "";
                
            return `
                <div class="field-item">
                    <div class="field-item__main">${FormUtils.escapeHtml(fieldName)}${fieldType}${fieldSource}</div>
                    ${fieldCaption}
                    ${descriptionHtml}
                </div>
            `;
        }).join("");
        
        // Build analysis results HTML (similar to form detection results style)
        const formDescriptionHtml = relevanceData.formDescription ? 
            `<div class="content-analysis__description">
                <span class="description-label">Form Purpose:</span>
                <span class="description-text">${FormUtils.escapeHtml(relevanceData.formDescription)}</span>
            </div>` : "";
        
        const analysisHtml = `
            <div class="content-analysis">
                <div class="content-analysis__summary">
                    <span class="summary-item">
                        <span class="summary-label">Selected Form:</span>
                        <span class="summary-value">${FormUtils.escapeHtml(recommendedForm.name || recommendedForm.id || "Unnamed Form")}</span>
                    </span>
                    <span class="summary-item">
                        <span class="summary-label">Confidence:</span>
                        <span class="summary-value">${Math.round(relevanceData.confidence * 100)}%</span>
                    </span>
                    <span class="summary-item">
                        <span class="summary-label">Fields:</span>
                        <span class="summary-value">${recommendedForm.fields.length}</span>
                    </span>
                </div>
                
                ${formDescriptionHtml}
                
                <div class="form-item form-item--selected">
                    <div class="form-item__header">
                        <span class="form-item__title">${FormUtils.escapeHtml(recommendedForm.name || recommendedForm.id || "Unnamed Form")}</span>
                        <span class="form-item__source">${FormUtils.getFormSourceInfo(recommendedForm)}</span>
                        <span class="form-item__count">${recommendedForm.fields.length} fields</span>
                        <span class="form-item__badge">Selected</span>
                    </div>
                    <div class="form-item__fields">
                        ${fieldsHtml}
                    </div>
                </div>
            </div>
        `;
        
        // Update the analysis results container
        analysisResultsEl.innerHTML = analysisHtml;
        
        // Show analysis results container
        analysisResultsContainer.classList.remove("hidden");
    }
    
    /**
     * Display mapping results
     * @param {Array} mappings - Field mappings
     * @param {number} confidence - Confidence score
     */
    displayMappingResults(mappings, confidence) {
        const mappingResultsEl = document.getElementById("mappingResults");
        const mappingResultsContainer = document.getElementById("mappingResultsContainer");
        
        if (!mappingResultsEl) return;
        
        // Create a confidence indicator
        const confidenceClass = confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";
        const confidencePercent = Math.round(confidence * 100);
        
        // Generate mapping fields HTML using same format as content analysis
        const mappingFieldsHtml = mappings.map(mapping => {
            // Support both new simplified format and legacy format
            const fieldValue = mapping.suggestedValue || mapping.value || "";
            const fieldType = mapping.fieldType || "";
            const xpath = mapping.xpath || "";
            
            // Use the same field title logic as Content Analysis Results
            // Priority: mapping.fieldLabel > mapping.fieldName > mapping.fieldId (same as field.label || field.name || field.id)
            const friendlyFieldName = mapping.fieldLabel || mapping.fieldName || mapping.fieldId || "Unlabeled field";
            
            // Build field display exactly like content analysis field items
            const fieldTypeDisplay = fieldType ? ` (${fieldType})` : "";
            const fieldSource = mapping.source && mapping.source !== "main" ? 
                ` [${mapping.iframePath || mapping.source}]` : "";
            
            // Use field.title equivalent as caption (like Content Analysis Results)
            const fieldCaption = mapping.title ? 
                `<div class="field-item__caption">${FormUtils.escapeHtml(mapping.title)}</div>` : "";
            
            // Suggested value display
            const valueHtml = fieldValue ? 
                `<div class="field-item__value">
                    <span class="value-text">${FormUtils.escapeHtml(fieldValue)}</span>
                </div>` : "";
                
            return `
                <div class="field-item field-item--mapping" data-field-id="${FormUtils.escapeHtml(mapping.fieldId)}" data-xpath="${FormUtils.escapeHtml(xpath)}">
                    <div class="field-item__main">${FormUtils.escapeHtml(friendlyFieldName)}${fieldTypeDisplay}${fieldSource}</div>
                    ${fieldCaption}
                    ${valueHtml}
                </div>
            `;
        }).join("");
        
        // Use similar layout to content analysis results
        mappingResultsEl.innerHTML = `
            <div class="mapping-results">
                <div class="mapping-results__summary">
                    <span class="summary-item">
                        <span class="summary-label">Mapping Results:</span>
                        <span class="summary-value">${mappings.length} fields</span>
                    </span>
                    <span class="summary-item">
                        <span class="summary-label">Confidence:</span>
                        <span class="summary-value confidence--${confidenceClass}">${confidencePercent}%</span>
                    </span>
                </div>
                
                <div class="form-item form-item--mapping">
                    <div class="form-item__header">
                        <span class="form-item__title">Field Mapping Results</span>
                        <span class="form-item__count">${mappings.length} mappings</span>
                        <span class="form-item__badge form-item__badge--mapping">Generated</span>
                    </div>
                    <div class="form-item__fields">
                        ${mappingFieldsHtml}
                    </div>
                </div>
            </div>
        `;
        
        // Show mapping results container
        mappingResultsEl.classList.remove("hidden");
        if (mappingResultsContainer) {
            mappingResultsContainer.classList.remove("hidden");
        }
        
        // Show fill actions section
        const fillActionsSection = document.getElementById("fillActionsSection");
        if (fillActionsSection) {
            fillActionsSection.classList.remove("hidden");
        }
    }
    
    /**
     * Display fill results
     * @param {Object} results - Fill results
     */
    displayFillResults(results) {
        const summary = results.summary || {};
        const successCount = summary.success || 0;
        const failCount = summary.fail || 0;
        const totalCount = summary.total || 0;
        
        this.showSuccess(`Form filling completed: ${successCount}/${totalCount} fields filled${failCount > 0 ? `, ${failCount} failed` : ""}`);
    }
}

// Make FormUIController available globally
window.FormUIController = FormUIController;
