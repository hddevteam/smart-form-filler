// modules/popupEventHandlers.js - Event handling logic for popup
/**
 * PopupEventHandlers - Handles all user interactions and events
 */
class PopupEventHandlers {
    constructor(popupManager) {
        this.popupManager = popupManager;
    }

    /**
     * Setup all UI event handlers
     */
    setupUI() {
        try {
            console.log("🔧 Setting up UI handlers...");
            const handlers = {
                extractData: () => this.handleExtractData(),
                login: () => this.handleLogin(),
                copy: () => this.popupManager.copyHandler.handleCopy(),
                chat: () => this.handleSwitchToChat(),
                clearAll: () => this.handleClearAll(),
                backToHistory: () => this.handleBackToHistory(),
                retry: () => this.handleRetry(),
                cancelLoading: () => this.handleCancelLoading(),
                switchTab: (tabName) => this.popupManager.resultsHandler.switchResultTab(tabName),
                switchMainTab: (tabName) => this.handleMainTabSwitch(tabName),
                updateChatSendButtonState: () => this.handleUpdateChatSendButtonState()
            };
            
            console.log("🔧 Binding UI events...");
            this.popupManager.uiController.bindEvents(handlers);
            this.bindRefreshModelEvents();
            this.bindSettingsEvents();
            this.bindDataSourceEvents();
            this.bindFormFillerEvents();
            console.log("✅ UI setup completed");
        } catch (error) {
            console.error("❌ UI setup failed:", error);
            throw new Error(`UI setup failed: ${error.message}`);
        }
    }

    /**
     * Handle updating chat send button state
     */
    handleUpdateChatSendButtonState() {
        console.log("🔧 Updating chat send button state...");
        if (this.popupManager.chatHandler) {
            this.popupManager.chatHandler.updateSendButtonState();
        }
    }

    /**
     * Handle data extraction
     */
    async handleExtractData() {
        try {
            // Check if a model is selected and service is available
            const selectedModel = this.popupManager.uiController.getSelectedModel();
            if (!selectedModel) {
                this.popupManager.resultsHandler.showError("Please select an AI model first");
                return;
            }
            
            // Create operation ID for cancellation tracking
            const operationId = `extract-${Date.now()}`;
            this.popupManager.activeOperations.add(operationId);
            
            this.popupManager.uiController.showLoading("Extracting data sources...");
            this.popupManager.uiController.updateLoadingDetails("Getting page content and iframe data");
            
            // Check if operation was cancelled
            if (!this.popupManager.activeOperations.has(operationId)) {
                console.log("🚫 Operation cancelled before starting");
                return;
            }
            
            // Get current tab content and metadata
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get page title
            let pageTitle = tab.title || "Untitled Page";
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => document.title
                });
                if (results && results[0] && results[0].result) {
                    pageTitle = results[0].result;
                }
            } catch (error) {
                console.warn("Could not get page title:", error);
            }
            
            // Check if operation was cancelled
            if (!this.popupManager.activeOperations.has(operationId)) {
                console.log("🚫 Operation cancelled before content extraction");
                return;
            }
            
            const content = await this.popupManager.dataExtractor.getPageContent(tab);
            
            // Validate extracted content
            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                console.error("❌ No valid content extracted from page");
                this.popupManager.uiController.hideLoading();
                this.popupManager.resultsHandler.showError(
                    "Failed to extract page content. This could be due to:\n" +
                    "• Content scripts not properly loaded\n" +
                    "• Page restrictions preventing access\n" +
                    "• Empty or invalid page content\n\n" +
                    "Try refreshing the page and the extension, then try again."
                );
                return;
            }
            
            console.log(`✅ Content extracted successfully: ${content.length} characters`);
            
            // Check if operation was cancelled
            if (!this.popupManager.activeOperations.has(operationId)) {
                console.log("🚫 Operation cancelled after content extraction");
                return;
            }
            
            this.popupManager.uiController.updateLoadingDetails("Extracting iframe contents...");
            
            // Extract iframe contents with enhanced processing
            const iframeContents = await this.popupManager.dataExtractor.extractIframeContents(tab);
            
            // Check if operation was cancelled
            if (!this.popupManager.activeOperations.has(operationId)) {
                console.log("🚫 Operation cancelled after iframe extraction");
                return;
            }

            // Enhanced logging for iframe extraction
            console.log("🔧 Iframe extraction results:", {
                totalIframes: iframeContents.length,
                withContent: iframeContents.filter(iframe => iframe.content && iframe.content.length > 0).length,
                breakdown: iframeContents.map(iframe => ({
                    index: iframe.index,
                    src: iframe.src,
                    hasContent: !!(iframe.content && iframe.content.length > 0),
                    contentLength: iframe.content ? iframe.content.length : 0,
                    accessible: iframe.metadata?.accessible
                }))
            });
            
            // Process extraction results
            this.processExtractionResults(iframeContents);
            
            this.popupManager.uiController.updateLoadingDetails("Processing with code-based extraction");
            
            // Call API endpoint
            const endpoint = "/extension/extract-data-sources";
            
            console.log(`🔧 [API_DEBUG] Using endpoint: ${endpoint}`);
            console.log("🔧 [API_DEBUG] Request payload summary:", {
                url: tab.url,
                title: pageTitle,
                contentLength: content.length,
                modelSelected: this.popupManager.uiController.getSelectedModel(),
                iframeContentsCount: iframeContents.length
            });
            
            const response = await this.popupManager.apiClient.makeRequest(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    url: tab.url,
                    title: pageTitle,
                    content: content,
                    model: this.popupManager.uiController.getSelectedModel(),
                    iframeContents: iframeContents
                })
            });
            
            // Parse the JSON response
            const result = await response.json();
            
            // Store current page URL for adding to results
            result.currentPageUrl = tab.url;
            
            this.popupManager.uiController.hideLoading();
            this.popupManager.resultsHandler.showExtractionResults(result);
            
        } catch (error) {
            console.error("Data extraction error:", error);
            this.popupManager.uiController.hideLoading();
            this.popupManager.resultsHandler.showError("Data extraction failed: " + error.message);
        } finally {
            // Always clean up the operation ID
            this.popupManager.activeOperations.delete(operationId);
        }
    }

    /**
     * Process iframe extraction results
     */
    processExtractionResults(iframeContents) {
        if (iframeContents && iframeContents.length > 0) {
            const accessibleCount = iframeContents.filter(iframe => iframe.metadata?.accessible).length;
            const totalSize = iframeContents.reduce((sum, iframe) => sum + (iframe.content ? iframe.content.length : 0), 0);
            this.popupManager.uiController.updateLoadingDetails(`Found ${accessibleCount}/${iframeContents.length} iframes with content (${Math.round(totalSize/1024)}KB total)`);
            
            // Log any issues with iframe extraction
            const withoutContent = iframeContents.filter(iframe => !iframe.content || iframe.content.length === 0);
            if (withoutContent.length > 0) {
                console.log(`🔧 ${withoutContent.length} iframes without content:`, withoutContent.map(iframe => ({
                    index: iframe.index,
                    src: iframe.src,
                    reason: iframe.metadata?.error || "Unknown"
                })));
            }
        } else {
            this.popupManager.uiController.updateLoadingDetails("No iframe content found, processing main page...");
            console.log("🔧 No iframe contents extracted - this may indicate a frontend extraction issue");
        }
    }

    /**
     * Handle login
     */
    async handleLogin() {
        try {
            console.log("🔧 Starting login process...");
            await this.popupManager.authManager.login();
            
            // Refresh authentication status
            const isAuthenticated = await this.popupManager.authManager.checkAuthenticationStatus();
            if (isAuthenticated) {
                this.popupManager.uiController.updateAuthStatus();
                this.popupManager.uiController.setButtonsEnabled(true);
            }
        } catch (error) {
            console.error("Login error:", error);
            this.popupManager.resultsHandler.showError("Login failed: " + error.message);
        }
    }

    /**
     * Handle clear all history
     */
    async handleClearAll() {
        this.popupManager.resultsHandler.clearAllHistory();
    }

    /**
     * Handle back to history list
     */
    async handleBackToHistory() {
        this.popupManager.resultsHandler.showHistoryList();
    }

    /**
     * Handle retry (always extract mode)
     */
    async handleRetry() {
        await this.handleExtractData();
    }

    /**
     * Handle cancel loading operation
     */
    handleCancelLoading() {
        console.log("🚫 Cancelling active operations...");
        
        // Clear all active operations
        this.popupManager.activeOperations.clear();
        
        // Hide loading state
        this.popupManager.uiController.hideLoading();
        
        // Show cancellation message
        this.popupManager.showMessage("⚠️ Operation cancelled by user", "warning");
        
        console.log("✅ Active operations cancelled");
    }

    /**
     * Handle main tab switching
     */
    handleMainTabSwitch(tabName) {
        console.log("🔧 Switching to main tab:", tabName);
        
        // Update tab states
        this.popupManager.elements.mainTabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle("main-tab--active", isActive);
        });
        
        // Update content visibility
        if (this.popupManager.elements.extractionTab) {
            this.popupManager.elements.extractionTab.classList.toggle("main-tab-content--active", tabName === "extraction");
        }
        if (this.popupManager.elements.chatTab) {
            this.popupManager.elements.chatTab.classList.toggle("main-tab-content--active", tabName === "chat");
        }
        if (this.popupManager.elements.formFillerTab) {
            this.popupManager.elements.formFillerTab.classList.toggle("main-tab-content--active", tabName === "formfiller");
        }
        
        // Update footer mode indicator
        if (this.popupManager.elements.selectedMode) {
            let modeText = "Data Extraction";
            if (tabName === "chat") modeText = "Chat with Data";
            else if (tabName === "formfiller") modeText = "Form Filler";
            this.popupManager.elements.selectedMode.textContent = modeText;
        }
        
        // Handle tab-specific initialization
        if (tabName === "chat") {
            this.initializeChatTab();
        } else if (tabName === "formfiller") {
            this.initializeFormFillerTab();
        }
    }

    /**
     * Initialize chat tab
     */
    initializeChatTab() {
        try {
            console.log("🔧 [CHAT_DEBUG] Initializing chat tab...");
            console.log("🔧 [CHAT_DEBUG] PopupManager exists:", !!this.popupManager);
            console.log("🔧 [CHAT_DEBUG] ChatHandler exists:", !!this.popupManager.chatHandler);
            console.log("🔧 [CHAT_DEBUG] DataSourceManager exists:", !!this.popupManager.dataSourceManager);
            console.log("🔧 [CHAT_DEBUG] ResultsHandler exists:", !!this.popupManager.resultsHandler);
            console.log("🔧 [CHAT_DEBUG] Extraction history exists:", !!this.popupManager.resultsHandler?.extractionHistory);
            console.log("🔧 [CHAT_DEBUG] Extraction history length:", this.popupManager.resultsHandler?.extractionHistory?.length || 0);
            
            // Check if required components are available
            if (!this.popupManager.chatHandler) {
                console.error("❌ [CHAT_DEBUG] ChatHandler not available");
                return;
            }
            
            // Initialize chat with current data source configuration
            if (this.popupManager.dataSourceManager) {
                const config = this.popupManager.dataSourceManager.getConfiguration();
                console.log("🔧 [CHAT_DEBUG] Current data source config:", config);
                console.log("🔧 [CHAT_DEBUG] Is data source configured:", this.popupManager.dataSourceManager.isDataSourceConfigured());
                console.log("🔧 [CHAT_DEBUG] Should show modal on chat enter:", this.popupManager.dataSourceManager.shouldShowModalOnChatEnter());
                
                if (this.popupManager.chatHandler.onDataSourceChanged) {
                    this.popupManager.chatHandler.onDataSourceChanged(config);
                } else {
                    console.error("❌ [CHAT_DEBUG] chatHandler.onDataSourceChanged method not found");
                }
                
                // Show data source modal if not configured AND we have extraction data
                const hasExtractionData = this.popupManager.resultsHandler?.extractionHistory?.length > 0;
                console.log("🔧 [CHAT_DEBUG] Has extraction data:", hasExtractionData);
                
                if (this.popupManager.dataSourceManager.shouldShowModalOnChatEnter() && hasExtractionData) {
                    console.log("🔧 [CHAT_DEBUG] Auto-opening data source modal...");
                    setTimeout(() => {
                        this.popupManager.dataSourceManager.openModal();
                    }, 100);
                } else {
                    console.log("🔧 [CHAT_DEBUG] Not auto-opening modal:", {
                        shouldShow: this.popupManager.dataSourceManager.shouldShowModalOnChatEnter(),
                        hasData: hasExtractionData
                    });
                }
            } else {
                console.warn("⚠️ [CHAT_DEBUG] DataSourceManager not available");
            }
            
            // Set extraction history
            if (this.popupManager.resultsHandler?.extractionHistory) {
                console.log("🔧 [CHAT_DEBUG] Setting extraction history in chat handler");
                this.popupManager.chatHandler.setExtractionHistory(this.popupManager.resultsHandler.extractionHistory);
            }
            
            // Update UI components
            if (this.popupManager.chatHandler.updateDataSourceList) {
                console.log("🔧 [CHAT_DEBUG] Updating data source list in chat handler");
                this.popupManager.chatHandler.updateDataSourceList();
            }
            
            // Show chat interface and update send button state
            console.log("🔧 [CHAT_DEBUG] Showing chat interface and updating send button state");
            this.popupManager.chatHandler.showChat();
            
            // Force update send button state after initialization
            setTimeout(() => {
                console.log("🔧 [CHAT_DEBUG] Force updating send button state after delay");
                this.popupManager.chatHandler.updateSendButtonState();
            }, 100);
            
            console.log("✅ [CHAT_DEBUG] Chat tab initialized successfully");
        } catch (error) {
            console.error("❌ [CHAT_DEBUG] Failed to initialize chat tab:", error);
        }
    }

    /**
     * Initialize form filler tab
     */
    initializeFormFillerTab() {
        if (this.popupManager.formFillerHandler) {
            console.log("🔧 Initializing Form Filler tab");
            setTimeout(() => {
                console.log("🔄 Re-initializing Form Filler event listeners");
                this.popupManager.formFillerHandler.initializeEventListeners();
            }, 100);
        }
    }

    /**
     * Handle switch to chat (from results)
     */
    async handleSwitchToChat() {
        try {
            // Switch to chat tab
            this.handleMainTabSwitch("chat");
            
            // Update chat handler with latest extraction history
            this.popupManager.chatHandler.setExtractionHistory(this.popupManager.resultsHandler.extractionHistory);
            this.popupManager.chatHandler.updateDataSourceList();
            
            console.log("💬 Switched to chat tab");
        } catch (error) {
            console.error("Switch to chat error:", error);
            this.popupManager.resultsHandler.showError("Failed to switch to chat: " + error.message);
        }
    }

    /**
     * Bind refresh model button events
     */
    bindRefreshModelEvents() {
        if (this.popupManager.elements.globalRefreshModelsBtn) {
            this.popupManager.elements.globalRefreshModelsBtn.addEventListener("click", async () => {
                await this.popupManager.modelManager.refreshModels();
            });
        }
    }

    /**
     * Bind form filler events
     */
    bindFormFillerEvents() {
        if (this.popupManager.elements.clearAllFormFillerBtn) {
            this.popupManager.elements.clearAllFormFillerBtn.addEventListener("click", () => {
                this.clearAllFormFillerData();
            });
        }
    }

    /**
     * Bind settings events
     */
    bindSettingsEvents() {
        // Settings button
        if (this.popupManager.elements.settingsBtn) {
            this.popupManager.elements.settingsBtn.addEventListener("click", () => {
                this.popupManager.settingsManager.openSettings();
            });
        }

        // Close settings
        if (this.popupManager.elements.settingsModalClose) {
            this.popupManager.elements.settingsModalClose.addEventListener("click", () => {
                this.popupManager.settingsManager.closeSettings();
            });
        }

        if (this.popupManager.elements.settingsCancelBtn) {
            this.popupManager.elements.settingsCancelBtn.addEventListener("click", () => {
                this.popupManager.settingsManager.closeSettings();
            });
        }

        // Save settings
        if (this.popupManager.elements.settingsSaveBtn) {
            this.popupManager.elements.settingsSaveBtn.addEventListener("click", () => {
                this.popupManager.settingsManager.saveSettings();
            });
        }

        // Test connection
        if (this.popupManager.elements.testConnectionBtn) {
            this.popupManager.elements.testConnectionBtn.addEventListener("click", () => {
                this.popupManager.settingsManager.testConnection();
            });
        }

        // Close modal on backdrop click
        if (this.popupManager.elements.settingsModal) {
            this.popupManager.elements.settingsModal.addEventListener("click", (e) => {
                if (e.target === this.popupManager.elements.settingsModal || e.target.classList.contains('modal__backdrop')) {
                    this.popupManager.settingsManager.closeSettings();
                }
            });
        }
    }

    /**
     * Bind data source events
     */
    bindDataSourceEvents() {
        console.log("🔧 [DEBUG] Starting to bind data source events...");
        console.log("🔧 [DEBUG] Current DOM state:", {
            totalElements: document.querySelectorAll('*').length,
            hasDataSourceModal: !!document.getElementById('dataSourceModal'),
            hasOpenButton: !!document.getElementById('openDataSourceModalBtn'),
            popupManagerExists: !!this.popupManager,
            dataSourceManagerExists: !!this.popupManager?.dataSourceManager
        });
        
        // Try immediate binding
        const attemptBinding = () => {
            const openDataSourceModalBtn = document.getElementById('openDataSourceModalBtn');
            const dataSourceModal = document.getElementById('dataSourceModal');
            
            console.log("🔧 [DEBUG] Element check:", {
                buttonFound: !!openDataSourceModalBtn,
                modalFound: !!dataSourceModal,
                buttonDisabled: openDataSourceModalBtn?.disabled,
                modalClassList: dataSourceModal?.classList.toString()
            });
            
            if (openDataSourceModalBtn && dataSourceModal) {
                // Remove existing listeners and clone to ensure clean binding
                const newButton = openDataSourceModalBtn.cloneNode(true);
                openDataSourceModalBtn.parentNode.replaceChild(newButton, openDataSourceModalBtn);
                
                // Add click handler
                newButton.addEventListener("click", (e) => {
                    console.log("🔧 [DEBUG] Button clicked!");
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Manual modal display test
                    console.log("🔧 [DEBUG] Showing modal manually...");
                    dataSourceModal.classList.remove('hidden');
                    dataSourceModal.style.display = 'flex';
                    
                    // Also try via data source manager
                    try {
                        if (this.popupManager?.dataSourceManager) {
                            console.log("🔧 [DEBUG] Also calling dataSourceManager.openModal()");
                            this.popupManager.dataSourceManager.openModal();
                        }
                    } catch (error) {
                        console.error("❌ [DEBUG] Error in dataSourceManager:", error);
                    }
                });
                
                console.log("✅ [DEBUG] Button binding successful");
                return true;
            }
            
            return false;
        };
        
        // Try multiple times with delays
        if (!attemptBinding()) {
            setTimeout(() => attemptBinding(), 100);
            setTimeout(() => attemptBinding(), 500);
            setTimeout(() => attemptBinding(), 1000);
        }
    }

    /**
     * Clear all form filler data and reset UI state
     */
    clearAllFormFillerData() {
        try {
            console.log("🗑️ Clearing all form filler data...");
            
            // Clear content input
            const fillContentInput = document.getElementById("fillContentInput");
            if (fillContentInput) {
                fillContentInput.value = "";
            }
            
            // Reset language select to default
            const languageSelect = document.getElementById("languageSelect");
            if (languageSelect) {
                languageSelect.value = "zh";
            }
            
            // Hide and clear all result sections
            const sectionsToHide = [
                this.popupManager.elements.formDetectionResults,
                this.popupManager.elements.analysisResultsSection,
                this.popupManager.elements.fieldMappingSection,
                this.popupManager.elements.fillActionsSection
            ];
            
            sectionsToHide.forEach(section => {
                if (section) {
                    section.classList.add('hidden');
                }
            });
            
            // Hide all section headers to restore initial state
            const sectionHeadersToHide = [
                'advancedFormDetection .section__header.advanced-mode__section-header--collapsible',
                'advancedContentAnalysis .section__header.advanced-mode__section-header--collapsible',
                'advancedFieldMapping .section__header.advanced-mode__section-header--collapsible'
            ];
            
            sectionHeadersToHide.forEach(headerSelector => {
                const header = document.querySelector(headerSelector);
                if (header) {
                    header.classList.add('hidden');
                }
            });
            
            // Hide advanced mode sections that should be hidden initially
            const advancedSectionsToHide = [
                'advancedContentAnalysis',
                'advancedFieldMapping',
                'advancedFillActions'
            ];
            
            advancedSectionsToHide.forEach(sectionId => {
                const section = document.getElementById(sectionId);
                if (section) {
                    section.classList.add('hidden');
                }
            });
            
            // Clear dynamic content containers
            const containersToClear = [
                'formsList', 'analysisResults', 'mappingResults', 'fillResults'
            ];
            
            containersToClear.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = "";
                }
            });
            
            // Clear user input fields
            const inputFieldsToClear = [
                'sourceText', 'formDescription', 'userDataDescription'
            ];
            
            inputFieldsToClear.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = "";
                }
            });
            
            // Reset button states
            const buttonsToDisable = [
                this.popupManager.elements.analyzeContentBtn,
                this.popupManager.elements.generateMappingBtn,
                this.popupManager.elements.fillFormsBtn
            ];
            
            buttonsToDisable.forEach(button => {
                if (button) {
                    button.disabled = true;
                }
            });
            
            // Reset counters
            const formsFoundCount = document.getElementById("formsFoundCount");
            const fieldsFoundCount = document.getElementById("fieldsFoundCount");
            const sourceStats = document.getElementById("sourceStats");
            
            if (formsFoundCount) formsFoundCount.textContent = "0";
            if (fieldsFoundCount) fieldsFoundCount.textContent = "0";
            if (sourceStats) sourceStats.textContent = "Main + 0 iframes";
            
            // Clear form filler handler state if available
            if (this.popupManager.formFillerHandler) {
                this.popupManager.formFillerHandler.currentForms = [];
                this.popupManager.formFillerHandler.analyzedData = null;
                this.popupManager.formFillerHandler.currentMappings = [];
                this.popupManager.formFillerHandler.selectedFormId = null;
                this.popupManager.formFillerHandler.lastAnalyzedContent = "";
                this.popupManager.formFillerHandler.currentAnalysisResult = null;
                this.popupManager.formFillerHandler.currentFormDescription = "";
            }
            
            this.popupManager.showMessage("✅ All form filler data cleared successfully", "success");
            console.log("✅ Form filler data cleared successfully");
            
        } catch (error) {
            console.error("❌ Error clearing form filler data:", error);
            this.popupManager.showMessage("❌ Error clearing form filler data", "error");
        }
    }
}
