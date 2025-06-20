/* global chrome, AuthManager, ApiClient, DataExtractor, ResultsHandler, ChatHandler, CopyHandler, UIController, FormFillerHandler */
// popup-main.js - Main popup manager with modular structure
/**
 * Main Popup Manager - Coordinates all modules
 */

class PopupManager {
    constructor() {
        console.log("PopupManager: Starting initialization...");
        
        try {
            // Verify DOM is ready
            if (document.readyState === "loading") {
                console.warn("⚠️ DOM not ready yet, initialization may fail");
            }
            
            // Initialize core services first
            console.log("🔧 Initializing core services...");
            try {
                this.authManager = new AuthManager();
                console.log("✅ AuthManager initialized");
            } catch (error) {
                console.error("❌ AuthManager initialization failed:", error);
                throw new Error(`AuthManager failed: ${error.message}`);
            }
            
            try {
                this.apiClient = new ApiClient();
                this.apiClient.setAuthManager(this.authManager);
                console.log("✅ ApiClient initialized");
            } catch (error) {
                console.error("❌ ApiClient initialization failed:", error);
                throw new Error(`ApiClient failed: ${error.message}`);
            }
            
            // Initialize DOM elements with error handling
            console.log("🔧 Initializing DOM elements...");
            try {
                this.initializeElements();
                console.log("✅ DOM elements initialized");
            } catch (error) {
                console.error("❌ DOM elements initialization failed:", error);
                throw new Error(`DOM initialization failed: ${error.message}`);
            }
            
            // Verify critical elements exist before proceeding
            if (!this.elements.loadingState || !this.elements.authStatus) {
                throw new Error("Critical DOM elements missing. Check HTML structure.");
            }
            
            // Initialize modules with error handling
            console.log("🔧 Initializing modules...");
            try {
                this.dataExtractor = new DataExtractor();
                console.log("✅ DataExtractor initialized");
                
                this.uiController = new UIController(this.elements);
                console.log("✅ UIController initialized");
                
                this.resultsHandler = new ResultsHandler(this.elements, this.uiController);
                console.log("✅ ResultsHandler initialized");
                
                this.chatHandler = new ChatHandler(this.elements, this.apiClient);
                console.log("✅ ChatHandler initialized");
                
                this.copyHandler = new CopyHandler(this.elements, this.resultsHandler);
                console.log("✅ CopyHandler initialized");
                
                // Initialize form filler handler if elements are available
                if (this.elements.formFillerTab) {
                    // Pass apiClient, but don't pass uiController, let FormFillerHandler create its own FormUIController
                    this.formFillerHandler = new FormFillerHandler(this.apiClient);
                    console.log("✅ FormFillerHandler initialized with its own FormUIController");
                } else {
                    console.warn("⚠️ FormFillerHandler not initialized - missing form filler elements");
                }
            } catch (error) {
                console.error("❌ Module initialization failed:", error);
                throw new Error(`Module initialization failed: ${error.message}`);
            }
            
            // Setup UI and events with error handling
            console.log("🔧 Setting up UI...");
            try {
                this.setupUI();
                console.log("✅ UI setup completed");
            } catch (error) {
                console.error("❌ UI setup failed:", error);
                throw new Error(`UI setup failed: ${error.message}`);
            }
            
            // Initialize the popup
            console.log("🔧 Initializing popup...");
            try {
                this.init();
                console.log("✅ Popup initialization completed");
            } catch (error) {
                console.error("❌ Popup initialization failed:", error);
                throw new Error(`Popup initialization failed: ${error.message}`);
            }
            
        } catch (error) {
            console.error("PopupManager: Constructor error:", error);
            console.error("Stack trace:", error.stack);
            this.showInitializationError(error);
        }
    }
    
    /**
     * Show initialization error to user
     */
    showInitializationError(error) {
        document.body.innerHTML = `
            <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
                <h3>Initialization Error</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Possible causes:</strong></p>
                <ul>
                    <li>Extension files are corrupted or missing</li>
                    <li>DOM elements are missing from popup.html</li>
                    <li>JavaScript modules failed to load</li>
                </ul>
                <p><strong>Try:</strong></p>
                <ul>
                    <li>Reloading the extension</li>
                    <li>Closing and reopening the popup</li>
                    <li>Reinstalling the extension</li>
                </ul>
                <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px;">
                    Reload Popup
                </button>
            </div>
        `;
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        console.log("🔧 Initializing DOM elements...");
        
        this.elements = {
            // Status and auth
            authStatus: document.getElementById("authStatus"),
            authIndicator: document.getElementById("authIndicator"),
            authText: document.getElementById("authText"),
            
            // Model selection (now global in header)
            globalModelSelect: document.getElementById("globalModelSelect"),
            globalRefreshModelsBtn: document.getElementById("globalRefreshModelsBtn"),
            
            // Settings
            settingsBtn: document.getElementById("settingsBtn"),
            settingsModal: document.getElementById("settingsModal"),
            settingsCloseBtn: document.getElementById("settingsCloseBtn"),
            settingsCancelBtn: document.getElementById("settingsCancelBtn"),
            settingsSaveBtn: document.getElementById("settingsSaveBtn"),
            backendUrl: document.getElementById("backendUrl"),
            testConnectionBtn: document.getElementById("testConnectionBtn"),
            connectionStatus: document.getElementById("connectionStatus"),
            
            // Main tabs
            mainTabs: document.querySelectorAll(".main-tab"),
            extractionTab: document.getElementById("extractionTab"),
            chatTab: document.getElementById("chatTab"),
            formFillerTab: document.getElementById("formFillerTab"),
            
            // Action buttons
            extractDataBtn: document.getElementById("extractDataBtn"),
            loginBtn: document.getElementById("loginBtn"),
            
            // Loading and results
            loadingState: document.getElementById("loadingState"),
            loadingDetails: document.getElementById("loadingDetails"),
            resultsSection: document.getElementById("resultsSection"),
            
            // History elements
            historyContainer: document.getElementById("historyContainer"),
            currentResultsDetail: document.getElementById("currentResultsDetail"),
            clearAllBtn: document.getElementById("clearAllBtn"),
            backToHistoryBtn: document.getElementById("backToHistoryBtn"),
            
            // Result tabs (removed outputPanel and outputText)
            resultsTabs: document.querySelectorAll(".results-tab"),
            markdownPanel: document.getElementById("markdownPanel"),
            htmlPanel: document.getElementById("htmlPanel"),
            cleanedHtmlPanel: document.getElementById("cleanedHtmlPanel"),
            metadataPanel: document.getElementById("metadataPanel"),
            markdownTab: document.getElementById("markdownTab"),
            htmlTab: document.getElementById("htmlTab"),
            cleanedHtmlTab: document.getElementById("cleanedHtmlTab"),
            metadataTab: document.getElementById("metadataTab"),
            
            // Result content (removed outputText)
            markdownText: document.getElementById("markdownText"),
            htmlText: document.getElementById("htmlText"),
            cleanedHtmlText: document.getElementById("cleanedHtmlText"),
            metadataData: document.getElementById("metadataData"),
            
            // Actions
            copyBtn: document.getElementById("copyBtn"),
            chatBtn: document.getElementById("chatBtn"),
            
            // Chat elements
            dataSourceTypeSelect: document.getElementById("dataSourceTypeSelect"),
            dataSourceList: document.getElementById("dataSourceList"),
            chatMessages: document.getElementById("chatMessages"),
            chatInput: document.getElementById("chatInput"),
            sendChatBtn: document.getElementById("sendChatBtn"),
            clearChatBtn: document.getElementById("clearChatBtn"),
            
            // Error handling
            errorState: document.getElementById("errorState"),
            errorMessage: document.getElementById("errorMessage"),
            retryBtn: document.getElementById("retryBtn"),
            
            // Form Filler elements
            fillContentInput: document.getElementById("fillContentInput"),
            detectFormsBtn: document.getElementById("detectFormsBtn"),
            analyzeContentBtn: document.getElementById("analyzeContentBtn"),
            generateMappingBtn: document.getElementById("generateMappingBtn"),
            fillFormsBtn: document.getElementById("fillFormsBtn"),
            clearAllFormFillerBtn: document.getElementById("clearAllFormFillerBtn"),
            formDetectionResults: document.getElementById("formDetectionResults"),
            analysisResultsSection: document.getElementById("analysisResultsSection"),
            fieldMappingSection: document.getElementById("fieldMappingSection"),
            fillActionsSection: document.getElementById("fillActionsSection"),
            
            // Footer
            selectedMode: document.getElementById("selectedMode")
        };
        
        // Debug: log element counts
        console.log("🔧 Main tabs found:", this.elements.mainTabs.length);
        console.log("🔧 Result tabs found:", this.elements.resultsTabs.length);
        
        // Check critical elements
        const criticalElements = ["loadingState", "authStatus", "extractDataBtn"];
        const missingCritical = criticalElements.filter(id => !this.elements[id]);
        
        if (missingCritical.length > 0) {
            console.error("❌ Missing critical elements:", missingCritical);
        } else {
            console.log("✅ All critical elements found");
        }
        
        // Comprehensive element check with addEventListener validation
        console.log("🔧 Validating all elements and their addEventListener capability...");
        const elementValidation = {};
        
        Object.keys(this.elements).forEach(key => {
            const element = this.elements[key];
            let status = "unknown";
            
            if (element === null || element === undefined) {
                status = "missing";
            } else if (Array.isArray(element) || element instanceof NodeList) {
                status = `collection (${element.length} items)`;
                // Check each item in collection
                const invalidItems = [];
                Array.from(element).forEach((item, index) => {
                    if (!item || typeof item.addEventListener !== "function") {
                        invalidItems.push(index);
                    }
                });
                if (invalidItems.length > 0) {
                    status += ` - invalid items: [${invalidItems.join(", ")}]`;
                }
            } else if (typeof element.addEventListener !== "function") {
                status = "no addEventListener method";
            } else {
                status = "valid";
            }
            
            elementValidation[key] = status;
            
            if (status !== "valid" && !status.startsWith("collection")) {
                console.warn(`⚠️ Element "${key}": ${status}`);
            } else {
                console.log(`✅ Element "${key}": ${status}`);
            }
        });
        
        // Summary report
        const validElements = Object.keys(elementValidation).filter(key => 
            elementValidation[key] === "valid" || elementValidation[key].startsWith("collection")
        ).length;
        const totalElements = Object.keys(elementValidation).length;
        
        console.log(`🔧 Element validation complete: ${validElements}/${totalElements} elements valid`);
        
        if (validElements < totalElements) {
            console.warn("⚠️ Some elements failed validation. Check logs above for details.");
        }
    }

    /**
     * Get currently selected model from global selector
     * @returns {string} The selected model ID, or null if service unavailable
     */
    getSelectedModel() {
        const selectedValue = this.elements.globalModelSelect?.value;
        
        // If no value selected or selector is disabled (service unavailable), return null
        if (!selectedValue || this.elements.globalModelSelect?.disabled) {
            return null;
        }
        
        return selectedValue;
    }

    /**
     * Set the selected model in global selector
     * @param {string} modelId - The model ID to select
     */
    setSelectedModel(modelId) {
        if (this.elements.globalModelSelect) {
            this.elements.globalModelSelect.value = modelId;
        }
    }

    /**
     * Setup UI and bind events
     */
    setupUI() {
        try {
            console.log("🔧 Setting up UI...");
            
            this.uiController.initializeElements();
            console.log("✅ UI elements initialized");
            
            // Bind event handlers
            const handlers = {
                extractData: () => this.handleExtractData(),
                login: () => this.handleLogin(),
                copy: () => this.copyHandler.handleCopy(),
                chat: () => this.handleSwitchToChat(),
                clearAll: () => this.handleClearAll(),
                backToHistory: () => this.handleBackToHistory(),
                retry: () => this.handleRetry(),
                switchTab: (tabName) => this.resultsHandler.switchResultTab(tabName),
                switchMainTab: (tabName) => this.handleMainTabSwitch(tabName)
            };
            
            console.log("🔧 Binding UI events...");
            this.uiController.bindEvents(handlers);
            console.log("✅ UI events bound");
            
            // Bind refresh model events
            console.log("🔧 Binding refresh model events...");
            this.bindRefreshModelEvents();
            console.log("✅ Refresh model events bound");
            
            // Bind settings events
            console.log("🔧 Binding settings events...");
            this.bindSettingsEvents();
            console.log("✅ Settings events bound");
            
            // Bind form filler events
            console.log("🔧 Binding form filler events...");
            this.bindFormFillerEvents();
            console.log("✅ Form filler events bound");
            
            // Bind chat events
            console.log("🔧 Binding chat events...");
            this.chatHandler.bindEvents();
            console.log("✅ Chat events bound");
            
            // Set up relationship between chat handler and results handler
            this.chatHandler.setExtractionHistory(this.resultsHandler.extractionHistory);
            
            console.log("✅ UI setup completed successfully");
        } catch (error) {
            console.error("❌ Error in setupUI:", error);
            throw new Error(`UI setup failed: ${error.message}`);
        }
    }

    /**
     * Initialize the popup
     */
    async init() {
        try {
            console.log("🔧 Initializing popup...");
            
            this.uiController.showLoading("Checking authentication...");
            
            // Since extension endpoints don't require authentication, always enable
            this.uiController.updateAuthStatus();
            this.uiController.setButtonsEnabled(true);
            
            // Load models
            await this.loadModels();
            
            this.uiController.hideLoading();
            console.log("✅ Popup initialization completed");
            
        } catch (error) {
            console.error("❌ Initialization error:", error);
            this.uiController.hideLoading();
            this.resultsHandler.showError("Failed to initialize: " + error.message);
        }
    }

    /**
     * Load and populate AI models dropdown
     */
    async loadModels() {
        try {
            console.log("🔧 Loading AI models...");
            
            // Get models from API
            const models = await this.apiClient.getAvailableModels();
            console.log("🔧 Received models:", models);
            
            // Clear current options
            this.elements.globalModelSelect.innerHTML = "";
            
            // Group models by type
            const groupedModels = this.groupModelsByType(models);
            
            // Add models to dropdown with grouping
            this.populateModelSelect(this.elements.globalModelSelect, groupedModels, models);
            
            // Set default selection (prefer gpt-4.1-nano if available, otherwise first model)
            const preferredModel = models.find(m => m.id === "gpt-4.1-nano") || models[0];
            if (preferredModel) {
                this.elements.globalModelSelect.value = preferredModel.id;
            }
            
            // Enable the dropdown
            this.elements.globalModelSelect.disabled = false;
            
            // Update chat models if chat handler is available
            if (this.chatHandler) {
                this.chatHandler.populateChatModels();
            }
            
            console.log(`✅ Loaded ${models.length} models, selected: ${this.elements.globalModelSelect.value}`);
            
        } catch (error) {
            console.error("❌ Failed to load models:", error);
            
            // Show service unavailable message instead of fallback models
            this.elements.globalModelSelect.innerHTML = "";
            
            // Add service unavailable option
            const unavailableOption = document.createElement("option");
            unavailableOption.value = "";
            unavailableOption.textContent = "⚠️ Service unavailable - Check backend connection";
            unavailableOption.disabled = true;
            this.elements.globalModelSelect.appendChild(unavailableOption);
            
            // Set the unavailable option as selected
            this.elements.globalModelSelect.value = "";
            this.elements.globalModelSelect.disabled = true;
            
            // Show additional connection error option if it's a network error
            if (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("NetworkError")) {
                const networkErrorOption = document.createElement("option");
                networkErrorOption.value = "";
                networkErrorOption.textContent = "🔌 Backend server not running (localhost:3001)";
                networkErrorOption.disabled = true;
                this.elements.globalModelSelect.appendChild(networkErrorOption);
            }
            
            console.log("❌ Models unavailable due to backend connection error");
        }
    }

    /**
     * Group models by type for better organization
     */
    groupModelsByType(models) {
        const grouped = {
            cloud: [],
            ollama: []
        };
        
        models.forEach(model => {
            if (model.type === "ollama" || model.id.startsWith("ollama:")) {
                grouped.ollama.push(model);
            } else {
                grouped.cloud.push(model);
            }
        });
        
        return grouped;
    }

    /**
     * Populate model select element with grouped options
     */
    populateModelSelect(selectElement, groupedModels, allModels) {
        // Add cloud models first
        if (groupedModels.cloud.length > 0) {
            const cloudGroup = document.createElement("optgroup");
            cloudGroup.label = "Cloud Models";
            
            groupedModels.cloud.forEach(model => {
                const option = document.createElement("option");
                option.value = model.id;
                option.textContent = model.name;
                cloudGroup.appendChild(option);
            });
            
            selectElement.appendChild(cloudGroup);
        }
        
        // Add Ollama models if available
        if (groupedModels.ollama.length > 0) {
            const ollamaGroup = document.createElement("optgroup");
            ollamaGroup.label = "Local Models (Ollama)";
            
            groupedModels.ollama.forEach(model => {
                const option = document.createElement("option");
                option.value = model.id;
                option.textContent = model.name;
                ollamaGroup.appendChild(option);
            });
            
            selectElement.appendChild(ollamaGroup);
        }
        
        // If no models are grouped, add them directly (fallback)
        if (groupedModels.cloud.length === 0 && groupedModels.ollama.length === 0) {
            allModels.forEach(model => {
                const option = document.createElement("option");
                option.value = model.id;
                option.textContent = model.name;
                selectElement.appendChild(option);
            });
        }
    }

    /**
     * Handle data extraction
     */
    async handleExtractData() {
        try {
            // Check if a model is selected and service is available
            const selectedModel = this.uiController.getSelectedModel();
            if (!selectedModel) {
                this.resultsHandler.showError("❌ Service unavailable: Please check backend connection and try again");
                return;
            }
            
            this.uiController.showLoading("Extracting data sources...");
            this.uiController.updateLoadingDetails("Getting page content and iframe data");
            
            // Get current tab content and metadata
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get page title
            let pageTitle = tab.title || "Untitled Page";
            try {
                const titleResults = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: () => document.title
                });
                if (titleResults && titleResults[0] && titleResults[0].result) {
                    pageTitle = titleResults[0].result;
                }
            } catch (error) {
                console.warn("Could not get page title:", error);
            }
            
            const content = await this.dataExtractor.getPageContent(tab);
            
            this.uiController.updateLoadingDetails("Extracting iframe contents...");
            
            // Extract iframe contents with enhanced processing
            const iframeContents = await this.dataExtractor.extractIframeContents(tab);
            
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
            
            // Provide detailed user feedback about iframe extraction
            if (iframeContents && iframeContents.length > 0) {
                const accessibleCount = iframeContents.filter(iframe => iframe.content && iframe.content.length > 0).length;
                const totalSize = iframeContents.reduce((sum, iframe) => sum + (iframe.content ? iframe.content.length : 0), 0);
                this.uiController.updateLoadingDetails(`Found ${accessibleCount}/${iframeContents.length} iframes with content (${Math.round(totalSize/1024)}KB total)`);
                
                // Log any issues with iframe extraction
                const withoutContent = iframeContents.filter(iframe => !iframe.content || iframe.content.length === 0);
                if (withoutContent.length > 0) {
                    console.log("🔧 Iframes without content:", withoutContent.map(iframe => ({
                        index: iframe.index,
                        src: iframe.src,
                        error: iframe.metadata?.error
                    })));
                }
            } else {
                this.uiController.updateLoadingDetails("No iframe content found, processing main page...");
                console.log("🔧 No iframe contents extracted - this may indicate a frontend extraction issue");
            }
            
            this.uiController.updateLoadingDetails("Processing with code-based extraction");
            
            // Call new code-based data source extraction API
            // Always use official endpoint
            const endpoint = "/extension/extract-data-sources";
            
            console.log(`🔧 [API_DEBUG] Using endpoint: ${endpoint}`);
            console.log("🔧 [API_DEBUG] Request payload summary:", {
                url: tab.url,
                title: pageTitle,
                contentLength: content.length,
                modelSelected: this.uiController.getSelectedModel(),
                iframeContentsCount: iframeContents.length
            });
            
            const response = await this.apiClient.makeRequest(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    url: tab.url,
                    title: pageTitle,
                    content: content,
                    model: this.uiController.getSelectedModel(),
                    iframeContents: iframeContents
                })
            });
            
            // Parse the JSON response
            const result = await response.json();
            
            // Store current page URL for adding to results
            result.currentPageUrl = tab.url;
            
            this.uiController.hideLoading();
            this.resultsHandler.showExtractionResults(result);
            
        } catch (error) {
            console.error("Data extraction error:", error);
            this.uiController.hideLoading();
            this.resultsHandler.showError("Data extraction failed: " + error.message);
        }
    }

    /**
     * Handle login
     */
    async handleLogin() {
        try {
            console.log("🔧 Starting login process...");
            await this.authManager.login();
            
            // Refresh authentication status
            const isAuthenticated = await this.authManager.checkAuthenticationStatus();
            if (isAuthenticated) {
                this.uiController.updateAuthStatus();
                this.uiController.setButtonsEnabled(true);
            }
        } catch (error) {
            console.error("Login error:", error);
            this.resultsHandler.showError("Login failed: " + error.message);
        }
    }

    /**
     * Handle clear all history
     */
    async handleClearAll() {
        this.resultsHandler.clearAllHistory();
    }

    /**
     * Handle back to history list
     */
    async handleBackToHistory() {
        this.resultsHandler.showHistoryList();
    }

    /**
     * Handle retry (always extract mode)
     */
    async handleRetry() {
        // Only extract mode is supported now
        await this.handleExtractData();
    }



    /**
     * Handle main tab switching
     */
    handleMainTabSwitch(tabName) {
        console.log("🔧 Switching to main tab:", tabName);
        
        // Update tab states
        this.elements.mainTabs.forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle("main-tab--active", isActive);
        });
        
        // Update content visibility
        if (this.elements.extractionTab) {
            this.elements.extractionTab.classList.toggle("main-tab-content--active", tabName === "extraction");
        }
        if (this.elements.chatTab) {
            this.elements.chatTab.classList.toggle("main-tab-content--active", tabName === "chat");
        }
        if (this.elements.formFillerTab) {
            this.elements.formFillerTab.classList.toggle("main-tab-content--active", tabName === "formfiller");
        }
        
        // Update footer mode indicator
        if (this.elements.selectedMode) {
            let modeText = "Data Extraction";
            if (tabName === "chat") modeText = "Chat with Data";
            else if (tabName === "formfiller") modeText = "Form Filler";
            this.elements.selectedMode.textContent = modeText;
        }
        
        // If switching to chat, update chat data sources and models
        if (tabName === "chat") {
            this.chatHandler.setExtractionHistory(this.resultsHandler.extractionHistory);
            this.chatHandler.updateDataSourceList();
            // Ensure chat models are populated
            this.chatHandler.populateChatModels();
        }
        
        // If switching to form filler, ensure it's properly initialized
        if (tabName === "formfiller" && this.formFillerHandler) {
            console.log("🔧 Initializing Form Filler tab");
            // Re-initialize event listeners, ensuring event binding after DOM elements are available
            setTimeout(() => {
                console.log("🔄 Re-initializing Form Filler event listeners");
                this.formFillerHandler.initializeEventListeners();
            }, 100); // Set a short delay to ensure DOM is fully rendered
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
            this.chatHandler.setExtractionHistory(this.resultsHandler.extractionHistory);
            this.chatHandler.updateDataSourceList();
            
            console.log("💬 Switched to chat tab");
        } catch (error) {
            console.error("Switch to chat error:", error);
            this.resultsHandler.showError("Failed to switch to chat: " + error.message);
        }
    }

    /**
     * Bind refresh model button events
     */
    bindRefreshModelEvents() {
        // Global refresh models button in header
        if (this.elements.globalRefreshModelsBtn) {
            this.elements.globalRefreshModelsBtn.addEventListener("click", async () => {
                await this.refreshModels();
            });
        }
    }

    /**
     * Bind settings events
     */
    bindSettingsEvents() {
        // Settings button
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener("click", () => {
                this.openSettings();
            });
        }

        // Close settings
        if (this.elements.settingsCloseBtn) {
            this.elements.settingsCloseBtn.addEventListener("click", () => {
                this.closeSettings();
            });
        }

        if (this.elements.settingsCancelBtn) {
            this.elements.settingsCancelBtn.addEventListener("click", () => {
                this.closeSettings();
            });
        }

        // Save settings
        if (this.elements.settingsSaveBtn) {
            this.elements.settingsSaveBtn.addEventListener("click", () => {
                this.saveSettings();
            });
        }

        // Test connection
        if (this.elements.testConnectionBtn) {
            this.elements.testConnectionBtn.addEventListener("click", () => {
                this.testConnection();
            });
        }

        // Close modal on backdrop click
        if (this.elements.settingsModal) {
            this.elements.settingsModal.addEventListener("click", (e) => {
                if (e.target === this.elements.settingsModal || e.target.classList.contains('modal__backdrop')) {
                    this.closeSettings();
                }
            });
        }
    }

    /**
     * Refresh models from server (including Ollama models)
     */
    async refreshModels() {
        try {
            console.log("🔄 Refreshing models...");
            
            // Disable refresh button during refresh
            if (this.elements.globalRefreshModelsBtn) {
                this.elements.globalRefreshModelsBtn.disabled = true;
                this.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">⏳</span>';
            }
            
            // First refresh Ollama models specifically
            try {
                const ollamaResult = await this.apiClient.refreshOllamaModels();
                console.log("🔄 Ollama models refreshed:", ollamaResult);
            } catch (error) {
                console.warn("⚠️ Failed to refresh Ollama models (this is normal if Ollama is not running):", error.message);
            }
            
            // Then reload all models
            await this.loadModels();
            
            console.log("✅ Models refreshed successfully");
            
            // Show temporary success indicator
            this.showRefreshSuccess();
            
        } catch (error) {
            console.error("❌ Failed to refresh models:", error);
            this.showRefreshError(error);
        } finally {
            // Re-enable refresh button
            if (this.elements.globalRefreshModelsBtn) {
                this.elements.globalRefreshModelsBtn.disabled = false;
                this.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">🔄</span>';
            }
        }
    }

    /**
     * Show refresh success feedback
     */
    showRefreshSuccess() {
        if (this.elements.globalRefreshModelsBtn) {
            this.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">✅</span>';
            setTimeout(() => {
                this.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">🔄</span>';
            }, 2000);
        }
    }

    /**
     * Show refresh error feedback
     */
    showRefreshError(error) {
        if (this.elements.globalRefreshModelsBtn) {
            this.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">❌</span>';
            this.elements.globalRefreshModelsBtn.title = `Refresh failed: ${error.message}`;
            setTimeout(() => {
                this.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">🔄</span>';
                this.elements.globalRefreshModelsBtn.title = "Refresh Ollama models";
            }, 3000);
        }
    }

    /**
     * Open settings modal
     */
    openSettings() {
        if (this.elements.settingsModal) {
            // Load current backend URL
            if (this.elements.backendUrl) {
                this.elements.backendUrl.value = this.apiClient.getStoredBackendUrl() || "http://localhost:3001";
            }
            
            // Clear connection status
            if (this.elements.connectionStatus) {
                this.elements.connectionStatus.classList.add('hidden');
            }
            
            this.elements.settingsModal.classList.remove('hidden');
        }
    }

    /**
     * Close settings modal
     */
    closeSettings() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.classList.add('hidden');
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        const newUrl = this.elements.backendUrl?.value?.trim();
        
        if (!newUrl) {
            this.showConnectionStatus('error', 'Backend URL cannot be empty');
            return;
        }

        // Validate URL format
        try {
            new URL(newUrl);
        } catch (error) {
            this.showConnectionStatus('error', 'Invalid URL format');
            return;
        }

        // Save the URL
        const saved = this.apiClient.setBackendUrl(newUrl);
        
        if (saved) {
            // Test the new connection
            const connected = await this.testConnection(false);
            
            if (connected) {
                this.showConnectionStatus('success', 'Settings saved and connection verified!');
                
                // Reload models with new backend
                setTimeout(async () => {
                    await this.loadModels();
                    this.closeSettings();
                }, 1000);
            } else {
                this.showConnectionStatus('error', 'Settings saved but connection failed');
            }
        } else {
            this.showConnectionStatus('error', 'Failed to save settings');
        }
    }

    /**
     * Test backend connection
     */
    async testConnection(showStatus = true) {
        if (showStatus) {
            this.showConnectionStatus('testing', 'Testing connection...');
        }
        
        // Update base URL temporarily for testing
        const testUrl = this.elements.backendUrl?.value?.trim();
        if (testUrl) {
            const originalUrl = this.apiClient.baseUrl;
            this.apiClient.baseUrl = testUrl.replace(/\/$/, '');
            
            try {
                const connected = await this.apiClient.testConnection();
                
                if (showStatus) {
                    if (connected) {
                        this.showConnectionStatus('success', 'Connection successful!');
                    } else {
                        this.showConnectionStatus('error', 'Connection failed');
                    }
                }
                
                // Restore original URL if this was just a test
                if (showStatus) {
                    this.apiClient.baseUrl = originalUrl;
                }
                
                return connected;
            } catch (error) {
                if (showStatus) {
                    this.showConnectionStatus('error', `Connection error: ${error.message}`);
                    this.apiClient.baseUrl = originalUrl;
                }
                return false;
            }
        } else {
            if (showStatus) {
                this.showConnectionStatus('error', 'Please enter a backend URL');
            }
            return false;
        }
    }

    /**
     * Show connection status
     */
    showConnectionStatus(type, message) {
        if (!this.elements.connectionStatus) return;
        
        // Clear previous status classes
        this.elements.connectionStatus.classList.remove('connection-status--success', 'connection-status--error', 'connection-status--testing');
        
        // Add appropriate class
        this.elements.connectionStatus.classList.add(`connection-status--${type}`);
        
        // Set icon and text
        const iconElement = this.elements.connectionStatus.querySelector('.connection-status__icon');
        const textElement = this.elements.connectionStatus.querySelector('.connection-status__text');
        
        if (iconElement && textElement) {
            switch (type) {
                case 'success':
                    iconElement.textContent = '✅';
                    break;
                case 'error':
                    iconElement.textContent = '❌';
                    break;
                case 'testing':
                    iconElement.textContent = '🔄';
                    break;
            }
            textElement.textContent = message;
        }
        
        // Show status
        this.elements.connectionStatus.classList.remove('hidden');
    }

    /**
     * Bind form filler events
     */
    bindFormFillerEvents() {
        // Clear All button
        if (this.elements.clearAllFormFillerBtn) {
            this.elements.clearAllFormFillerBtn.addEventListener("click", () => {
                this.clearAllFormFillerData();
            });
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
                languageSelect.value = "zh"; // Reset to default Chinese
            }
            
            // Hide and clear all result sections
            const sectionsToHide = [
                this.elements.formDetectionResults,
                this.elements.analysisResultsSection,
                this.elements.fieldMappingSection,
                this.elements.fillActionsSection
            ];
            
            sectionsToHide.forEach(section => {
                if (section) {
                    section.classList.add('hidden');
                }
            });
            
            // Clear dynamic content containers
            const containersToClear = [
                'formsList',
                'analysisResults', 
                'mappingResults',
                'fillResults'
            ];
            
            containersToClear.forEach(containerId => {
                const container = document.getElementById(containerId);
                if (container) {
                    container.innerHTML = "";
                }
            });
            
            // Clear user input fields
            const inputFieldsToClear = [
                'sourceText',           // Source text for analysis
                'formDescription',      // Form description input
                'userDataDescription'   // User data description
            ];
            
            inputFieldsToClear.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.value = "";
                }
            });
            
            // Reset button states
            const buttonsToDisable = [
                this.elements.analyzeContentBtn,
                this.elements.generateMappingBtn,
                this.elements.fillFormsBtn
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
            if (this.formFillerHandler) {
                this.formFillerHandler.currentForms = [];
                this.formFillerHandler.analyzedData = null;
                this.formFillerHandler.currentMappings = [];
                this.formFillerHandler.selectedFormId = null;
                this.formFillerHandler.lastAnalyzedContent = "";
                this.formFillerHandler.currentAnalysisResult = null;
                this.formFillerHandler.currentFormDescription = "";
            }
            
            this.showMessage("✅ All form filler data cleared successfully", "success");
            console.log("✅ Form filler data cleared successfully");
            
        } catch (error) {
            console.error("❌ Error clearing form filler data:", error);
            this.showMessage("❌ Error clearing form filler data", "error");
        }
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM loaded, initializing PopupManager...");
    window.popupManager = new PopupManager();
});

console.log("🚀 Modular popup script loaded");
