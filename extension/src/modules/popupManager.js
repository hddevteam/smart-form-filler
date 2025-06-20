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
        // Show loading state in model dropdown
        if (this.elements.globalModelSelect) {
            this.elements.globalModelSelect.innerHTML = '<option value="">Loading models...</option>';
            this.elements.globalModelSelect.disabled = true;
        }
        
        // Disable buttons initially until models are loaded
        if (this.elements.extractDataBtn) {
            this.elements.extractDataBtn.disabled = true;
        }
        
        console.log("⏳ Initial loading state set");
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
            
            this.settingsManager = new PopupSettingsManager(this);
            this.modelManager = new PopupModelManager(this);
            this.eventHandlers = new PopupEventHandlers(this);

            // Setup DOM elements first
            await this.initializer.initializeElements();
            
            // Set initial loading state for models
            this.setInitialLoadingState();
            
            // Initialize UI modules AFTER DOM elements are ready
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
            
            // Update authentication status to Ready (no auth required)
            console.log("🔧 Updating authentication status...");
            this.uiController.updateAuthStatus();
            console.log("✅ Authentication status updated");

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
        // Show basic error in UI if possible
        const errorElement = document.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = `Initialization failed: ${error.message}`;
            errorElement.style.display = 'block';
        }
        
        // Disable all interactive elements
        const buttons = document.querySelectorAll('button');
        const selects = document.querySelectorAll('select');
        
        buttons.forEach(btn => btn.disabled = true);
        selects.forEach(select => select.disabled = true);
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
