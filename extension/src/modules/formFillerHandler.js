// edge-extension/src/modules/formFillerHandler.js
/**
 * Form Filler Handler - Manages the form filling workflow in the UI
 */

/* global chrome, FormDetectionService, FormAnalysisService, FormUIController, FormUtils */

/**
 * Main controller class for form filling workflow
 */
class FormFillerHandler {
    /**
     * Constructor
     * @param {Object} apiClient - API client
     * @param {Object} uiController - Optional UI controller (will create one if not provided)
     */
    constructor(apiClient, uiController) {
        this.apiClient = apiClient;
        // Only use uiController if it's an instance of FormUIController, otherwise create a new one
        this.uiController = (uiController instanceof FormUIController) ? uiController : new FormUIController();
        console.log("🔧 FormFillerHandler initialized with", 
            (uiController instanceof FormUIController) ? "provided FormUIController" : "new FormUIController");
        this.detectionService = new FormDetectionService();
        this.analysisService = new FormAnalysisService(apiClient);
        
        // State management
        this.currentForms = [];
        this.analyzedData = null;
        this.currentMappings = [];
        this.selectedFormId = null;
        this.lastAnalyzedContent = "";
        this.currentAnalysisResult = null; // Store Analyze Content results
        this.currentFormDescription = ""; // Store form description
        
        this.initializeEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        console.log("🔧 Initializing Form Filler event listeners...");
        
        // Detect forms button
        const detectBtn = document.getElementById("detectFormsBtn");
        if (detectBtn) {
            console.log("✅ 'Detect Forms' button found, binding click event");
            detectBtn.addEventListener("click", () => {
                console.log("🔍 'Detect Forms' button clicked!");
                this.detectForms();
            });
        } else {
            console.warn("⚠️ 'Detect Forms' button not found in DOM");
        }

        // Analyze content button
        const analyzeBtn = document.getElementById("analyzeContentBtn");
        if (analyzeBtn) {
            console.log("✅ 'Analyze Content' button found, binding click event");
            analyzeBtn.addEventListener("click", () => {
                console.log("🔍 'Analyze Content' button clicked!");
                this.analyzeContentWithFormStructure();
            });
        } else {
            console.warn("⚠️ 'Analyze Content' button not found in DOM");
        }

        // Generate mapping button
        const generateBtn = document.getElementById("generateMappingBtn");
        if (generateBtn) {
            console.log("✅ 'Generate Mapping' button found, binding click event");
            generateBtn.addEventListener("click", () => {
                console.log("🔍 'Generate Mapping' button clicked!");
                this.generateMapping();
            });
        } else {
            console.warn("⚠️ 'Generate Mapping' button not found in DOM");
        }

        // Fill forms button
        const fillBtn = document.getElementById("fillFormsBtn");
        if (fillBtn) {
            console.log("✅ 'Fill Forms' button found, binding click event");
            fillBtn.addEventListener("click", () => {
                console.log("🔍 'Fill Forms' button clicked!");
                this.fillForms();
            });
        } else {
            console.warn("⚠️ 'Fill Forms' button not found in DOM");
        }

        // Content input change
        const contentInput = document.getElementById("fillContentInput");
        if (contentInput) {
            console.log("✅ 'Content Input' field found, binding input event");
            contentInput.addEventListener("input", () => {
                console.log("📝 'Content Input' changed!");
                this.onContentInputChange();
            });
        } else {
            console.warn("⚠️ 'Content Input' field not found in DOM");
        }
        
        console.log("✅ Form Filler event listeners initialized!");
    }

    /**
     * Detect forms on the current page
     */
    async detectForms() {
        console.log("🔍 Starting form detection...");
        
        try {
            const results = await this.detectionService.detectForms(
                (isLoading) => this.uiController.setDetectionLoading(isLoading),
                (message) => this.uiController.showInfo(message),
                (error) => this.uiController.showError(error)
            );
            
            this.currentForms = results.forms || [];
            this.uiController.displayFormDetectionResults(results, this.currentForms);
            
            // Enable analyze button
            this.uiController.updateAnalyzeButtonState();
            
            // Clear any previous messages
            this.uiController.clearMessages();
            
        } catch (error) {
            console.error("❌ Form detection error:", error);
            this.uiController.showError("Form detection failed: " + error.message);
        }
    }

    /**
     * Analyze content using enhanced two-stage AI analysis
     */
    async analyzeContentWithFormStructure() {
        console.log("🔍 Starting Stage 1: Form relevance analysis...");
        
        // Validate dependencies
        if (!this.apiClient) {
            this.uiController.showError("API client not initialized");
            return;
        }
        
        const content = document.getElementById("fillContentInput")?.value?.trim();
        
        if (!this.currentForms.length) {
            this.uiController.showError("Please detect forms first");
            return;
        }

        try {
            // Show loading state
            this.uiController.setAnalysisLoading(true);
            this.uiController.showInfo("Stage 1: Analyzing form relevance...");
            
            // Get selected model
            const model = this.uiController.getSelectedFormFillerModel();
            if (!model) {
                this.uiController.setAnalysisLoading(false);
                this.uiController.showError("❌ Service unavailable: Please check backend connection and try again");
                return;
            }
            
            // Get page HTML for enhanced analysis
            let pageHtml = "";
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs[0]) {
                    const rawPageHtml = await this.detectionService.extractPageHtml(tabs[0].id);
                    // Clean HTML before sending to backend
                    pageHtml = FormUtils.cleanHtml(rawPageHtml);
                    console.log(`📄 HTML cleaned: ${rawPageHtml?.length || 0} -> ${pageHtml?.length || 0} characters`);
                }
            } catch (htmlError) {
                console.warn("⚠️ HTML extraction failed:", htmlError);
                // Continue without HTML
            }
            
            // Perform relevance analysis (Stage 1)
            const relevanceData = await this.analysisService.analyzeFormRelevance(
                content, 
                this.currentForms,
                pageHtml,
                model
            );
            
            // Store analysis results and recommended form ID for Stage 2
            this.currentAnalysisResult = relevanceData;
            this.selectedFormId = relevanceData.recommendedForm;
            this.lastAnalyzedContent = content;
            this.currentFormDescription = relevanceData.formDescription || ""; // Store form description
            
            // Update language dropdown with GPT's recommendation if available
            if (relevanceData.recommendedLanguage) {
                this.uiController.setRecommendedLanguage(relevanceData.recommendedLanguage);
            }
            
            // Update UI to show relevant forms
            this.uiController.displayFormRelevanceResults(relevanceData, this.currentForms);
            
            // Update Generate Mapping button state based on content availability
            this.uiController.updateMappingButtonState(true, content);
            
            // Clear loading message
            this.uiController.clearMessages();
            
            // Show appropriate success message based on whether user content was provided
            if (content) {
                this.uiController.showSuccess("Form relevance analysis completed! You can now generate field mappings.");
            } else {
                this.uiController.showSuccess("Page context analysis completed! To generate field mappings, please enter content to fill and try again.");
            }
            
        } catch (error) {
            console.error("❌ Stage 1 analysis error:", error);
            this.uiController.showError("Form relevance analysis failed: " + error.message);
        } finally {
            this.uiController.setAnalysisLoading(false);
        }
    }

    /**
     * Generate field mapping using AI (Stage 2: Field Mapping Analysis)
     */
    async generateMapping() {
        console.log("🗺️ Starting Stage 2: Field mapping analysis...");
        
        if (!this.selectedFormId || !this.currentForms.length) {
            this.uiController.showError("Please run content analysis first to select a relevant form");
            return;
        }

        const content = document.getElementById("fillContentInput")?.value?.trim();
        if (!content) {
            this.uiController.showError("Please enter content to analyze");
            return;
        }

        try {
            // Show loading state
            this.uiController.setMappingLoading(true);
            this.uiController.showInfo("Stage 2: Analyzing field mappings...");
            
            const selectedForm = this.currentForms.find(form => form.id === this.selectedFormId);
            if (!selectedForm) {
                throw new Error("Selected form not found");
            }
            
            const model = this.uiController.getSelectedFormFillerModel();
            if (!model) {
                this.uiController.setAnalysisLoading(false);
                this.uiController.showError("❌ Service unavailable: Please check backend connection and try again");
                return;
            }
            
            const selectedLanguage = this.uiController.getSelectedLanguage();
            
            // Get selected Form Filler data sources
            let dataSources = null;
            if (window.popupManager && window.popupManager.dataSourceManager) {
                dataSources = window.popupManager.dataSourceManager.getFormFillerDataSources();
                if (dataSources) {
                    console.log("📊 Including Form Filler data sources in mapping generation:", {
                        type: dataSources.type,
                        sourceCount: dataSources.sources.length,
                        totalContentLength: dataSources.combinedText.length
                    });
                }
            }
            
            // Perform field mapping analysis (Stage 2)
            const mappingData = await this.analysisService.analyzeFieldMapping(
                content,
                selectedForm,
                model,
                this.currentAnalysisResult, // Pass Analyze Content results
                selectedLanguage, // Pass selected language
                dataSources // Pass selected data sources
            );
            
            // Store results
            this.analyzedData = mappingData.extractedInfo || {};
            this.currentMappings = mappingData.mappings || [];
            
            // Display results
            this.uiController.displayMappingResults(mappingData.mappings, mappingData.confidence);
            
            // Enable fill actions
            this.uiController.updateFillButtonStates(true);
            
            // Clear loading message
            this.uiController.clearMessages();
            this.uiController.showSuccess("Field mapping analysis completed! You can now fill the forms.");
            
        } catch (error) {
            console.error("❌ Stage 2 analysis error:", error);
            this.uiController.showError("Field mapping analysis failed: " + error.message);
        } finally {
            this.uiController.setMappingLoading(false);
        }
    }

    /**
     * Fill forms with mapped data
     */
    async fillForms() {
        if (!this.currentMappings.length) {
            this.uiController.showError("Please generate field mappings first");
            return;
        }

        console.log("✍️ Filling forms...");
        
        try {
            // Show loading state
            this.uiController.setFillLoading(true);
            
            // Fill forms using detection service
            const results = await this.detectionService.fillForms(this.currentMappings);
            this.uiController.displayFillResults(results);
            
        } catch (error) {
            console.error("❌ Form filling error:", error);
            this.uiController.showError("Form filling failed: " + error.message);
        } finally {
            this.uiController.setFillLoading(false);
        }
    }

    /**
     * Handle content input changes
     */
    onContentInputChange() {
        const content = document.getElementById("fillContentInput")?.value?.trim();
        this.uiController.updateAnalyzeButtonState();
        this.uiController.updateMappingButtonState(this.selectedFormId !== null, content);
        
        // Only reset mapping section if content changed (keep Analyze Content results)
        if (content !== this.lastAnalyzedContent) {
            this.lastAnalyzedContent = "";
            
            // Use the new partial reset method to preserve analysis results
            this.uiController.resetMappingState();
            
            // Clear current mappings
            this.currentMappings = [];
            this.uiController.updateFillButtonStates(false);
            
            // If we still have analysis results and content, show the mapping section again
            if (this.currentAnalysisResult && content) {
                const fieldMappingSection = document.getElementById("fieldMappingSection");
                if (fieldMappingSection) {
                    fieldMappingSection.classList.remove("hidden");
                }
            }
        }
    }
}

// Make FormFillerHandler available globally
window.FormFillerHandler = FormFillerHandler;
