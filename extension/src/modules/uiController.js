// modules/uiController.js
/**
 * UI Controller Module
 * Handles UI state management and event binding
 */

class UIController {
    constructor(elements) {
        this.elements = elements;
        this.currentMode = "extract"; // Fixed to extract mode only
        console.log("🔧 UIController initialized for Data Extraction mode");
    }

    /**
     * Initialize all UI elements
     */
    initializeElements() {
        console.log("🔧 Initializing UI controller elements...");
        
        // Verify elements were passed from main
        if (!this.elements) {
            console.error("❌ No elements object provided to UIController");
            return;
        }
        
        // Check if key elements exist
        console.log("🔧 Copy button element:", this.elements.copyBtn);
        console.log("🔧 HTML text element:", this.elements.htmlText);
        console.log("🔧 Cleaned HTML text element:", this.elements.cleanedHtmlText);
        console.log("🔧 Markdown text element:", this.elements.markdownText);
        console.log("🔧 Metadata data element:", this.elements.metadataData);
        console.log("🔧 Main tabs element count:", this.elements.mainTabs ? this.elements.mainTabs.length : 0);
        console.log("🔧 Result tabs element count:", this.elements.resultsTabs ? this.elements.resultsTabs.length : 0);
        
        // Directly query DOM to confirm element existence
        const copyBtnDirect = document.getElementById("copyBtn");
        console.log("🔧 Copy button found by direct query:", !!copyBtnDirect);
        if (copyBtnDirect) {
            console.log("🔧 Copy button innerHTML:", copyBtnDirect.innerHTML);
            console.log("🔧 Copy button parent:", copyBtnDirect.parentElement?.className);
        }
        
        // Check main tabs
        const mainTabsDirect = document.querySelectorAll(".main-tab");
        console.log("🔧 Main tabs found by direct query:", mainTabsDirect.length);
        
        // Ensure all key elements are found
        const missingElements = [];
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key] && key !== "resultsTabs" && key !== "mainTabs") {
                missingElements.push(key);
            }
        });
        
        if (missingElements.length > 0) {
            console.warn("⚠️ Missing elements:", missingElements);
        } else {
            console.log("✅ All elements found successfully");
        }
    }

    /**
     * Safe event binding helper
     */
    safeBindEvent(element, eventType, handler, elementName) {
        try {
            if (!element) {
                console.warn(`⚠️ Element "${elementName}" is null or undefined, skipping event binding`);
                return false;
            }
            
            if (typeof element.addEventListener !== "function") {
                console.error(`❌ Element "${elementName}" does not have addEventListener method. Element type:`, typeof element, element);
                return false;
            }
            
            element.addEventListener(eventType, handler);
            console.log(`✅ Successfully bound ${eventType} event to "${elementName}"`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to bind ${eventType} event to "${elementName}":`, error);
            console.error("   Element details:", element);
            return false;
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents(handlers) {
        console.log("🔧 Binding events for Data Extraction mode...");
        
        try {
            // Main tab switching
            if (this.elements.mainTabs && this.elements.mainTabs.length > 0) {
                console.log("🔧 Binding main tab events. Tabs found:", this.elements.mainTabs.length);
                this.elements.mainTabs.forEach((tab, index) => {
                    this.safeBindEvent(tab, "click", () => {
                        if (handlers.switchMainTab) {
                            handlers.switchMainTab(tab.dataset.tab);
                        }
                    }, `mainTab[${index}]`);
                });
            } else {
                console.warn("⚠️ No main tabs found for event binding");
            }
            
            // Action buttons
            this.safeBindEvent(this.elements.extractDataBtn, "click", handlers.extractData, "extractDataBtn");
            this.safeBindEvent(this.elements.loginBtn, "click", handlers.login, "loginBtn");
            
            // Copy and clear buttons
            this.safeBindEvent(this.elements.copyBtn, "click", () => {
                console.log("🔧 Copy button clicked!");
                if (handlers.copy) handlers.copy();
            }, "copyBtn");
            
            this.safeBindEvent(this.elements.chatBtn, "click", () => {
                console.log("🔧 Chat button clicked!");
                if (handlers.chat) handlers.chat();
            }, "chatBtn");
            
            this.safeBindEvent(this.elements.retryBtn, "click", handlers.retry, "retryBtn");
            
            // Result tabs
            if (this.elements.resultsTabs && this.elements.resultsTabs.length > 0) {
                console.log("🔧 Binding result tab events. Tabs found:", this.elements.resultsTabs.length);
                this.elements.resultsTabs.forEach((tab, index) => {
                    this.safeBindEvent(tab, "click", () => {
                        if (handlers.switchTab) {
                            handlers.switchTab(tab.dataset.tab);
                        }
                    }, `resultsTab[${index}]`);
                });
            } else {
                console.warn("⚠️ No result tabs found for event binding");
            }
            
            // History management buttons
            this.safeBindEvent(this.elements.clearAllBtn, "click", handlers.clearAll, "clearAllBtn");
            this.safeBindEvent(this.elements.backToHistoryBtn, "click", handlers.backToHistory, "backToHistoryBtn");
            
            // Loading cancel button
            this.safeBindEvent(this.elements.cancelLoadingBtn, "click", handlers.cancelLoading, "cancelLoadingBtn");
            
            // Global model selector change event
            const globalModelSelect = document.getElementById("globalModelSelect");
            if (globalModelSelect) {
                this.safeBindEvent(globalModelSelect, "change", () => {
                    console.log("🔧 Global model selection changed, updating chat send button state");
                    // Notify chat handler if it exists
                    if (handlers.updateChatSendButtonState) {
                        handlers.updateChatSendButtonState();
                    }
                }, "globalModelSelect");
            }
            
            console.log("✅ Event binding completed");
        } catch (error) {
            console.error("❌ Critical error during event binding:", error);
            throw new Error(`Event binding failed: ${error.message}`);
        }
    }

    /**
     * Get current mode (always extract)
     */
    getCurrentMode() {
        return "extract";
    }

    /**
     * Get selected language
     */
    getSelectedLanguage() {
        return this.elements.languageSelect?.value || "auto";
    }

    /**
     * Get selected model from global selector
     */
    getSelectedModel() {
        const globalModelSelect = document.getElementById("globalModelSelect");
        const selectedValue = globalModelSelect?.value;
        
        // If no value selected or selector is disabled (service unavailable), return null
        if (!selectedValue || globalModelSelect?.disabled) {
            return null;
        }
        
        return selectedValue;
    }

    /**
     * Get selected form filler model (now uses global selector)
     */
    getSelectedFormFillerModel() {
        const globalModelSelect = document.getElementById("globalModelSelect");
        const selectedValue = globalModelSelect?.value;
        
        // If no value selected or selector is disabled (service unavailable), return null
        if (!selectedValue || globalModelSelect?.disabled) {
            return null;
        }
        
        return selectedValue;
    }

    /**
     * Show loading state
     */
    showLoading(message) {
        this.elements.loadingState.classList.remove("hidden");
        this.elements.resultsSection.classList.add("hidden");
        this.elements.errorState.classList.add("hidden");
        
        if (message && this.elements.loadingDetails) {
            this.elements.loadingDetails.textContent = message;
        }
    }

    /**
     * Update loading details
     */
    updateLoadingDetails(details) {
        if (this.elements.loadingDetails) {
            this.elements.loadingDetails.textContent = details;
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.elements.loadingState.classList.add("hidden");
    }

    /**
     * Clear all results
     */
    clearResults() {
        // Clear text content
        if (this.elements.outputText) this.elements.outputText.textContent = "";
        if (this.elements.markdownText) this.elements.markdownText.textContent = "";
        if (this.elements.htmlText) this.elements.htmlText.textContent = "";
        if (this.elements.cleanedHtmlText) this.elements.cleanedHtmlText.textContent = "";
        if (this.elements.metadataData) this.elements.metadataData.textContent = "";
        if (this.elements.resultsMeta) this.elements.resultsMeta.textContent = "";
        
        // Hide results section
        this.elements.resultsSection.classList.add("hidden");
        this.elements.errorState.classList.add("hidden");
        
        console.log("🔧 Results cleared");
    }

    /**
     * Update authentication status display
     */
    updateAuthStatus() {
        // Since Edge extension endpoints don't require auth, always show as ready
        if (this.elements.authIndicator) {
            this.elements.authIndicator.classList.remove("auth-indicator--authenticated", "auth-indicator--unauthenticated");
            this.elements.authIndicator.classList.add("auth-indicator--ready");
        }
        
        if (this.elements.authText) {
            this.elements.authText.textContent = "Ready";
        }
        
        // Hide login button since auth is not required
        if (this.elements.loginBtn) {
            this.elements.loginBtn.classList.add("hidden");
        }
    }

    /**
     * Enable/disable action buttons
     */
    setButtonsEnabled(enabled) {
        if (this.elements.extractDataBtn) {
            this.elements.extractDataBtn.disabled = !enabled;
        }
        if (this.elements.copyBtn) {
            this.elements.copyBtn.disabled = !enabled;
        }
    }

    /**
     * Enable/disable only model-dependent buttons (extract, chat, etc.)
     * Keep system buttons (settings, refresh) always enabled
     */
    setModelDependentButtonsEnabled(enabled) {
        // Extract button needs models
        if (this.elements.extractDataBtn) {
            this.elements.extractDataBtn.disabled = !enabled;
        }
        
        // Chat button needs models (if exists)
        if (this.elements.mainChatBtn) {
            this.elements.mainChatBtn.disabled = !enabled;
        }
        
        // Form filler buttons need models - but generateMappingBtn has custom logic
        const formFillerButtons = [
            'detectFormsBtn',
            'analyzeContentBtn', 
            'fillFormsBtn'
        ];
        
        formFillerButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = !enabled;
            }
        });
        
        // generateMappingBtn has its own custom logic in FormUIController.updateMappingButtonState()
        // Don't control it here to avoid conflicts
        
        // Copy button doesn't need models, keep it enabled
        if (this.elements.copyBtn) {
            this.elements.copyBtn.disabled = false;
        }
    }

    /**
     * Ensure system buttons (settings, refresh) are always enabled
     */
    setSystemButtonsEnabled(enabled) {
        // Settings button should always be enabled
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.disabled = !enabled;
        }
        
        // Refresh models button should always be enabled
        if (this.elements.globalRefreshModelsBtn) {
            this.elements.globalRefreshModelsBtn.disabled = !enabled;
        }
        
        // Data source configuration buttons should be enabled
        const configButtons = [
            'openDataSourceModalBtn',
            'openFormFillerDataSourceModalBtn'
        ];
        
        configButtons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = !enabled;
            }
        });
    }

    /**
     * Update main chat button state based on available data
     */
    updateMainChatButtonState(hasHistory) {
        if (this.elements.mainChatBtn) {
            this.elements.mainChatBtn.disabled = !hasHistory;
            
            if (hasHistory) {
                this.elements.mainChatBtn.title = "Chat with extracted data sources";
            } else {
                this.elements.mainChatBtn.title = "Extract data sources first to enable chat";
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = UIController;
}
