// modules/popupManager.js - Main popup manager coordinating all modules
/**
 * PopupManager - Main coordinator for popup functionality
 */

class PopupManager {
    constructor() {
        this.elements = {};
        this.apiClient = null;
        this.operationTracker = null;
        this.activeOperations = new Set(); // Track active operations for cancellation
        
        // Module instances
        this.initializer = null;
        this.eventHandlers = null;
        this.modelManager = null;
        this.settingsManager = null;
        this.uiController = null;
        this.resultsHandler = null;
        this.formFillerHandler = null;
        this.formAnalysisService = null;
        
        // State
        this.isInitialized = false;
    }

    /**
     * Set initial loading state for models
     */
    setInitialLoadingState() {
        console.log("🔧 Setting initial loading state...");
        
        // Show loading state in model dropdown
        if (this.elements.globalModelSelect) {
            this.elements.globalModelSelect.innerHTML = '<option value="">Loading models...</option>';
            this.elements.globalModelSelect.disabled = true;
            console.log("✅ Model select set to loading state");
        }
        
        // Use UIController to properly manage button states
        if (this.uiController) {
            // Disable model-dependent buttons initially until models are loaded
            this.uiController.setModelDependentButtonsEnabled(false);
            // Always keep system buttons enabled
            this.uiController.setSystemButtonsEnabled(true);
            console.log("✅ Button states set via UIController: model-dependent disabled, system enabled");
        } else {
            // Fallback: direct button management if UIController not available
            const modelDependentButtons = [
                'extractDataBtn',
                'mainChatBtn',
                'detectFormsBtn',
                'analyzeContentBtn', 
                'generateMappingBtn',
                'fillFormsBtn'
            ];
            
            modelDependentButtons.forEach(btnId => {
                const btn = this.elements[btnId] || document.getElementById(btnId);
                if (btn) {
                    btn.disabled = true;
                    console.log(`✅ Disabled model-dependent button: ${btnId}`);
                }
            });
            
            // Ensure system buttons are ALWAYS enabled from the start
            const systemButtons = [
                { element: this.elements.settingsBtn, name: 'settingsBtn' },
                { element: this.elements.globalRefreshModelsBtn, name: 'globalRefreshModelsBtn' }
            ];
            
            systemButtons.forEach(({ element, name }) => {
                if (element) {
                    element.disabled = false;
                    console.log(`✅ Enabled system button: ${name}`);
                }
            });
            
            // Enable data source configuration buttons (these are system features)
            const configButtons = [
                'openDataSourceModalBtn',
                'openFormFillerDataSourceModalBtn'
            ];
            
            configButtons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    console.log(`✅ Enabled config button: ${btnId}`);
                }
            });
        }
        
        console.log("✅ Initial loading state set - system buttons enabled, model-dependent buttons disabled");
    }

    /**
     * Initialize the popup manager and all modules
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn("⚠️ PopupManager already initialized");
            return;
        }

        try {
            console.log("🚀 Initializing PopupManager...");

            // Initialize API client first
            this.apiClient = new ApiClient();
            
            // Initialize operation tracker
            this.operationTracker = {
                currentOperation: null,
                operationId: 0,
                
                startOperation: function(operationName) {
                    this.operationId++;
                    this.currentOperation = {
                        id: this.operationId,
                        name: operationName,
                        startTime: Date.now()
                    };
                    console.log(`🔄 Started operation: ${operationName} (ID: ${this.operationId})`);
                    return this.operationId;
                },
                
                isOperationActive: function(operationId) {
                    return this.currentOperation && this.currentOperation.id === operationId;
                },
                
                endOperation: function(operationId) {
                    if (this.currentOperation && this.currentOperation.id === operationId) {
                        const duration = Date.now() - this.currentOperation.startTime;
                        console.log(`✅ Completed operation: ${this.currentOperation.name} (${duration}ms)`);
                        this.currentOperation = null;
                    }
                },
                
                cancelOperation: function() {
                    if (this.currentOperation) {
                        console.log(`❌ Cancelled operation: ${this.currentOperation.name}`);
                        this.currentOperation = null;
                    }
                }
            };

            // Initialize core modules first
            this.initializer = new PopupInitializer(this);
            
            // Initialize core services (AuthManager, ApiClient)
            await this.initializer.initializeCoreServices();
            
            // Setup DOM elements first
            await this.initializer.initializeElements();
            
            // Initialize core UI modules first (needed by other managers)
            console.log("🔧 Initializing UIController and ResultsHandler...");
            console.log("🔧 Elements object status:", {
                hasElements: !!this.elements,
                errorState: !!this.elements?.errorState,
                errorMessage: !!this.elements?.errorMessage,
                resultsSection: !!this.elements?.resultsSection,
                totalElements: Object.keys(this.elements || {}).length
            });
            
            this.uiController = new UIController(this.elements);
            this.resultsHandler = new ResultsHandler(this.elements, this.uiController);
            this.dataExtractor = new DataExtractor();
            this.formFillerHandler = new FormFillerHandler(this.apiClient);
            this.formAnalysisService = new FormAnalysisService();
            this.chatHandler = new ChatHandler(this.elements, this.apiClient);
            
            // Initialize managers after core services are ready
            this.settingsManager = new PopupSettingsManager(this);
            this.modelManager = new PopupModelManager(this);
            this.dataSourceManager = new PopupDataSourceManager(this.elements, this);
            this.eventHandlers = new PopupEventHandlers(this);
            
            // Set initial loading state for models
            this.setInitialLoadingState();

            // Update authentication status to Ready immediately (no auth required for this extension)
            console.log("🔧 Setting initial authentication status...");
            this.updateAuthenticationStatus();
            console.log("✅ Initial authentication status set to Ready");

            // Initialize settings (must be before models)
            console.log("🔧 Initializing settings manager...");
            await this.settingsManager.initialize();
            console.log("✅ Settings manager initialized");
            
            // Initialize models
            console.log("🔧 Initializing model manager...");
            await this.modelManager.loadModels();
            console.log("✅ Model manager initialized");
            
            // Setup event handlers
            console.log("🔧 Setting up event handlers...");
            this.eventHandlers.setupUI();
            console.log("✅ Event handlers setup completed");
            
            // Setup chat handler events
            console.log("🔧 Setting up chat handler events...");
            this.chatHandler.bindEvents();
            console.log("✅ Chat handler events setup completed");
            
            // Initialize data source manager
            console.log("🔧 Initializing data source manager...");
            await this.dataSourceManager.init();
            console.log("✅ Data source manager initialized");
            console.log("🔧 Data source manager elements check:", {
                hasElements: !!this.dataSourceManager.elements,
                hasModal: !!this.dataSourceManager.elements?.dataSourceModal,
                modalId: this.dataSourceManager.elements?.dataSourceModal?.id
            });

            this.isInitialized = true;
            console.log("✅ PopupManager initialized successfully");

        } catch (error) {
            console.error("❌ Failed to initialize PopupManager:", error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Handle initialization errors gracefully
     */
    handleInitializationError(error) {
        console.error("❌ Initialization failed:", error);
        
        // Update authentication status to show error
        try {
            if (this.elements.authIndicator) {
                this.elements.authIndicator.classList.remove("auth-indicator--authenticated", "auth-indicator--ready");
                this.elements.authIndicator.classList.add("auth-indicator--unauthenticated");
            }
            
            if (this.elements.authText) {
                this.elements.authText.textContent = "Error";
            }
        } catch (statusError) {
            console.error("❌ Failed to update status in error handler:", statusError);
        }
        
        // Show basic error in UI if possible
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = `Initialization failed: ${error.message}`;
            errorElement.style.display = 'block';
        }
        
        // CRITICAL: Keep system buttons enabled even on initialization failure
        try {
            // Enable system buttons directly
            const systemButtons = ['settingsBtn', 'globalRefreshModelsBtn'];
            systemButtons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    console.log(`🔧 Force-enabled system button during error: ${btnId}`);
                }
            });
            
            // Enable data source config buttons
            const configButtons = ['openDataSourceModalBtn', 'openFormFillerDataSourceModalBtn'];
            configButtons.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.disabled = false;
                    console.log(`🔧 Force-enabled config button during error: ${btnId}`);
                }
            });
        } catch (buttonError) {
            console.error("❌ Failed to enable system buttons during error handling:", buttonError);
        }
        
        // Disable only the model-dependent buttons and selects
        try {
            const modelDependentElements = document.querySelectorAll('#extractDataBtn, #mainChatBtn, #globalModelSelect');
            modelDependentElements.forEach(element => {
                if (element) {
                    element.disabled = true;
                }
            });
        } catch (disableError) {
            console.error("❌ Failed to disable model-dependent elements:", disableError);
        }
        
        console.log("🔧 Error handling completed - system buttons kept enabled");
    }

    /**
     * Get currently selected model
     */
    getSelectedModel() {
        return this.modelManager?.getSelectedModel() || null;
    }

    /**
     * Check if popup is ready for operations
     */
    isReady() {
        return this.isInitialized && 
               this.apiClient && 
               this.getSelectedModel() && 
               !this.operationTracker.currentOperation;
    }

    /**
     * Show loading overlay with cancellation option
     */
    showLoadingOverlay(message = "Processing...", showCancel = true) {
        const overlay = this.elements.loadingOverlay;
        const messageEl = this.elements.loadingMessage;
        const cancelBtn = this.elements.loadingCancelBtn;

        if (overlay) {
            overlay.style.display = 'flex';
        }
        
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (cancelBtn) {
            cancelBtn.style.display = showCancel ? 'block' : 'none';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        const overlay = this.elements.loadingOverlay;
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Cancel current operation
     */
    cancelCurrentOperation() {
        if (this.operationTracker.currentOperation) {
            console.log("🛑 User cancelled operation:", this.operationTracker.currentOperation.name);
            this.operationTracker.cancelOperation();
            this.hideLoadingOverlay();
            
            // Re-enable UI elements
            this.uiController?.setButtonsEnabled(true);
            
            // Show cancellation message
            this.resultsHandler?.showMessage("Operation cancelled by user", 'info');
        }
    }

    /**
     * Execute an operation with proper tracking and UI feedback
     */
    async executeOperation(operationName, operationFn, options = {}) {
        if (!this.isReady()) {
            console.warn("⚠️ Popup not ready for operations");
            return null;
        }

        const operationId = this.operationTracker.startOperation(operationName);
        
        try {
            // Show loading UI
            this.showLoadingOverlay(options.loadingMessage || `Processing ${operationName}...`, options.showCancel !== false);
            this.uiController?.setButtonsEnabled(false);
            
            // Execute the operation
            const result = await operationFn();
            
            // Check if operation was cancelled
            if (!this.operationTracker.isOperationActive(operationId)) {
                console.log("🛑 Operation was cancelled:", operationName);
                return null;
            }
            
            return result;
            
        } catch (error) {
            console.error(`❌ Operation failed: ${operationName}`, error);
            this.resultsHandler?.showError(`${operationName} failed: ${error.message}`);
            throw error;
            
        } finally {
            // Clean up UI
            this.hideLoadingOverlay();
            this.uiController?.setButtonsEnabled(true);
            this.operationTracker.endOperation(operationId);
        }
    }

    /**
     * Update authentication status to Ready
     */
    updateAuthenticationStatus() {
        try {
            console.log("🔧 Updating authentication status to Ready...");
            
            // Update auth indicator
            if (this.elements.authIndicator) {
                this.elements.authIndicator.classList.remove("auth-indicator--authenticated", "auth-indicator--unauthenticated");
                this.elements.authIndicator.classList.add("auth-indicator--ready");
                console.log("✅ Auth indicator updated to ready state");
            } else {
                console.warn("⚠️ Auth indicator element not found");
            }
            
            // Update auth text
            if (this.elements.authText) {
                this.elements.authText.textContent = "Ready";
                console.log("✅ Auth text updated to 'Ready'");
            } else {
                console.warn("⚠️ Auth text element not found");
            }
            
            // Hide login button since auth is not required
            if (this.elements.loginBtn) {
                this.elements.loginBtn.classList.add("hidden");
                console.log("✅ Login button hidden");
            }
            
            // Also call UIController's method as backup
            if (this.uiController) {
                this.uiController.updateAuthStatus();
            }
            
        } catch (error) {
            console.error("❌ Failed to update authentication status:", error);
        }
    }

    /**
     * Cleanup resources when popup is closed
     */
    cleanup() {
        console.log("🧹 Cleaning up PopupManager...");
        
        // Cancel any ongoing operations
        if (this.operationTracker.currentOperation) {
            this.cancelCurrentOperation();
        }
        
        // Cleanup modules if they have cleanup methods
        [this.initializer, this.eventHandlers, this.modelManager, this.settingsManager].forEach(module => {
            if (module && typeof module.cleanup === 'function') {
                try {
                    module.cleanup();
                } catch (error) {
                    console.warn("⚠️ Error during module cleanup:", error);
                }
            }
        });
        
        this.isInitialized = false;
    }
}
