// modules/popupInitializer.js - Popup initialization logic
/**
 * PopupInitializer - Handles all initialization logic for the popup
 */

class PopupInitializer {
    constructor(popupManager) {
        this.popupManager = popupManager;
    }

    /**
     * Initialize core services
     */
    async initializeCoreServices() {
        console.log("🔧 Initializing core services...");
        
        // Initialize AuthManager
        try {
            this.popupManager.authManager = new AuthManager();
            console.log("✅ AuthManager initialized");
        } catch (error) {
            console.error("❌ AuthManager initialization failed:", error);
            throw new Error(`AuthManager failed: ${error.message}`);
        }

        // Initialize ApiClient
        try {
            this.popupManager.apiClient = new ApiClient();
            this.popupManager.apiClient.setAuthManager(this.popupManager.authManager);
            console.log("✅ ApiClient initialized");
        } catch (error) {
            console.error("❌ ApiClient initialization failed:", error);
            throw new Error(`ApiClient failed: ${error.message}`);
        }
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        console.log("🔧 Initializing DOM elements...");
        
        // Get all DOM elements needed by the popup
        this.popupManager.elements = {
            // Main tabs and content
            mainTabs: document.querySelectorAll(".main-tab"),
            extractionTab: document.getElementById("extractionTab"),
            chatTab: document.getElementById("chatTab"),
            formFillerTab: document.getElementById("formFillerTab"),
            
            // Model selection and controls
            globalModelSelect: document.getElementById("globalModelSelect"),
            globalRefreshModelsBtn: document.getElementById("globalRefreshModelsBtn"),
            settingsBtn: document.getElementById("settingsBtn"),
            
            // Auth status
            authStatus: document.getElementById("authStatus"),
            authIndicator: document.getElementById("authIndicator"),
            authText: document.getElementById("authText"),
            
            // Main action buttons
            extractDataBtn: document.getElementById("extractDataBtn"),
            loginBtn: document.getElementById("loginBtn"),
            
            // Loading and results
            loadingState: document.getElementById("loadingState"),
            loadingDetails: document.getElementById("loadingDetails"),
            cancelLoadingBtn: document.getElementById("cancelLoadingBtn"),
            resultsSection: document.getElementById("resultsSection"),
            
            // History elements
            historyContainer: document.getElementById("historyContainer"),
            currentResultsDetail: document.getElementById("currentResultsDetail"),
            clearAllBtn: document.getElementById("clearAllBtn"),
            backToHistoryBtn: document.getElementById("backToHistoryBtn"),
            
            // Result tabs
            resultsTabs: document.querySelectorAll(".results-tab"),
            markdownPanel: document.getElementById("markdownPanel"),
            htmlPanel: document.getElementById("htmlPanel"),
            cleanedHtmlPanel: document.getElementById("cleanedHtmlPanel"),
            metadataPanel: document.getElementById("metadataPanel"),
            markdownTab: document.getElementById("markdownTab"),
            htmlTab: document.getElementById("htmlTab"),
            cleanedHtmlTab: document.getElementById("cleanedHtmlTab"),
            metadataTab: document.getElementById("metadataTab"),
            
            // Result content
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
            
            // Settings modal elements
            settingsModal: document.getElementById("settingsModal"),
            settingsModalClose: document.getElementById("settingsModalClose"),
            settingsCancelBtn: document.getElementById("settingsCancelBtn"),
            saveSettingsBtn: document.getElementById("saveSettingsBtn"),
            backendUrlInput: document.getElementById("backendUrlInput"),
            testConnectionBtn: document.getElementById("testConnectionBtn"),
            connectionStatus: document.getElementById("connectionStatus"),
            
            // Footer
            selectedMode: document.getElementById("selectedMode")
        };

        return this.validateElements();
    }

    /**
     * Validate critical DOM elements
     */
    validateElements() {
        console.log("🔧 Validating DOM elements...");
        
        const criticalElements = [
            'loadingState', 'authStatus', 'globalModelSelect', 
            'extractDataBtn', 'mainTabs', 'extractionTab', 'chatTab', 'formFillerTab'
        ];
        
        const missingCritical = criticalElements.filter(elementName => {
            const element = this.popupManager.elements[elementName];
            return !element || (Array.isArray(element) && element.length === 0);
        });
        
        if (missingCritical.length > 0) {
            const errorMsg = `Critical DOM elements missing: ${missingCritical.join(', ')}`;
            console.error(`❌ ${errorMsg}`);
            throw new Error(errorMsg);
        }

        // Validate element functionality
        let validElements = 0;
        let totalElements = 0;

        for (const [elementName, element] of Object.entries(this.popupManager.elements)) {
            totalElements++;
            const status = this.validateElement(elementName, element);
            if (status === "valid" || status.startsWith("collection")) {
                validElements++;
            }
        }

        console.log(`✅ DOM validation completed: ${validElements}/${totalElements} elements valid`);
        
        if (validElements < totalElements) {
            console.warn(`⚠️ Some elements failed validation, but proceeding with initialization`);
        }

        return true;
    }

    /**
     * Validate individual element
     */
    validateElement(elementName, element) {
        if (element === null || element === undefined) {
            console.warn(`⚠️ Element '${elementName}' is null/undefined`);
            return "missing";
        }

        if (Array.isArray(element) || element instanceof NodeList) {
            const invalidItems = [];
            for (let i = 0; i < element.length; i++) {
                const item = element[i];
                if (!item || typeof item.addEventListener !== "function") {
                    invalidItems.push(i);
                }
            }
            if (invalidItems.length > 0) {
                console.warn(`⚠️ Collection '${elementName}' has invalid items at indices: ${invalidItems.join(', ')}`);
                return `collection-partial`;
            }
            return `collection-valid`;
        }

        if (typeof element.addEventListener !== "function") {
            console.warn(`⚠️ Element '${elementName}' doesn't support addEventListener`);
            return "invalid";
        }

        return "valid";
    }

    /**
     * Initialize module handlers
     */
    async initializeModuleHandlers() {
        console.log("🔧 Initializing module handlers...");
        
        // Initialize DataExtractor
        try {
            this.popupManager.dataExtractor = new DataExtractor();
            this.popupManager.dataExtractor.setApiClient(this.popupManager.apiClient);
            console.log("✅ DataExtractor initialized");
        } catch (error) {
            console.error("❌ DataExtractor initialization failed:", error);
            throw new Error(`DataExtractor failed: ${error.message}`);
        }

        // Initialize ResultsHandler
        try {
            this.popupManager.resultsHandler = new ResultsHandler();
            this.popupManager.resultsHandler.setElements(this.popupManager.elements);
            console.log("✅ ResultsHandler initialized");
        } catch (error) {
            console.error("❌ ResultsHandler initialization failed:", error);
            throw new Error(`ResultsHandler failed: ${error.message}`);
        }

        // Initialize CopyHandler
        try {
            this.popupManager.copyHandler = new CopyHandler();
            this.popupManager.copyHandler.setElements(this.popupManager.elements);
            console.log("✅ CopyHandler initialized");
        } catch (error) {
            console.error("❌ CopyHandler initialization failed:", error);
            throw new Error(`CopyHandler failed: ${error.message}`);
        }

        // Initialize UIController
        try {
            this.popupManager.uiController = new UIController();
            this.popupManager.uiController.setElements(this.popupManager.elements);
            console.log("✅ UIController initialized");
        } catch (error) {
            console.error("❌ UIController initialization failed:", error);
            throw new Error(`UIController failed: ${error.message}`);
        }

        // Initialize ChatHandler
        try {
            this.popupManager.chatHandler = new ChatHandler();
            this.popupManager.chatHandler.setElements(this.popupManager.elements);
            this.popupManager.chatHandler.setApiClient(this.popupManager.apiClient);
            console.log("✅ ChatHandler initialized");
        } catch (error) {
            console.error("❌ ChatHandler initialization failed:", error);
            throw new Error(`ChatHandler failed: ${error.message}`);
        }

        // Initialize FormFillerHandler (optional)
        try {
            if (this.popupManager.elements.formFillerTab) {
                this.popupManager.formFillerHandler = new FormFillerHandler();
                this.popupManager.formFillerHandler.setElements(this.popupManager.elements);
                this.popupManager.formFillerHandler.setApiClient(this.popupManager.apiClient);
                console.log("✅ FormFillerHandler initialized");
            }
        } catch (error) {
            console.warn("⚠️ FormFillerHandler initialization failed (this is optional):", error);
            this.popupManager.formFillerHandler = null;
        }
    }

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        console.error("❌ PopupManager initialization failed:", error);
        
        try {
            // Try to show error in the UI
            document.body.innerHTML = `
                <div style="padding: 20px; background: #fee; border: 1px solid #fcc; border-radius: 4px; margin: 10px;">
                    <h3 style="color: #c00; margin-top: 0;">Initialization Error</h3>
                    <p style="margin-bottom: 8px;"><strong>The popup failed to initialize properly.</strong></p>
                    <p style="margin-bottom: 8px;">Error details: <code>${error.message}</code></p>
                    <p style="margin-bottom: 0;">
                        <strong>Troubleshooting:</strong><br>
                        1. Check browser console for detailed error messages<br>
                        2. Ensure all required files are loaded<br>
                        3. Try refreshing the extension popup<br>
                        4. Restart the browser if the problem persists
                    </p>
                </div>
            `;
        } catch (domError) {
            console.error("❌ Failed to show error in UI:", domError);
            // Fallback: just log the error
            alert(`Popup initialization failed: ${error.message}`);
        }
    }
}
