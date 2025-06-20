// modules/popupModelManager.js - Model management for popup
/**
 * PopupModelManager - Handles AI model loading, selection and management
 */

class PopupModelManager {
    constructor(popupManager) {
        this.popupManager = popupManager;
    }

    /**
     * Get currently selected model from global selector
     */
    getSelectedModel() {
        const selectedValue = this.popupManager.elements.globalModelSelect?.value;
        
        if (!selectedValue || this.popupManager.elements.globalModelSelect?.disabled) {
            return null;
        }
        
        return selectedValue;
    }

    /**
     * Set the selected model in global selector
     */
    setSelectedModel(modelId) {
        if (this.popupManager.elements.globalModelSelect) {
            this.popupManager.elements.globalModelSelect.value = modelId;
        }
    }

    /**
     * Load and populate AI models dropdown
     */
    async loadModels() {
        try {
            console.log("🔧 Loading AI models...");
            console.log("🔧 API Client available:", !!this.popupManager.apiClient);
            console.log("🔧 Global model select element:", !!this.popupManager.elements?.globalModelSelect);
            
            if (!this.popupManager.apiClient) {
                throw new Error("API client not initialized");
            }
            
            const models = await this.popupManager.apiClient.getAvailableModels();
            console.log("🔧 Available models received:", models?.length || 0);
            console.log("🔧 First few models:", models?.slice(0, 3));
            
            if (!models || models.length === 0) {
                console.warn("⚠️ No models available from backend");
                this.handleNoModelsAvailable();
                return;
            }

            // Group models by type for better organization
            const groupedModels = this.groupModelsByType(models);
            console.log("🔧 Grouped models:", { 
                cloudCount: groupedModels.cloud.length, 
                ollamaCount: groupedModels.ollama.length 
            });
            
            // Update global model selector
            if (this.popupManager.elements.globalModelSelect) {
                this.populateModelSelect(this.popupManager.elements.globalModelSelect, groupedModels, models);
                this.popupManager.elements.globalModelSelect.disabled = false;
                
                // Try to restore previously selected model or set default
                const preferredModel = this.getPreferredModel(models);
                if (preferredModel) {
                    this.setSelectedModel(preferredModel);
                    console.log("🔧 Set preferred model:", preferredModel);
                }
            } else {
                console.error("❌ Global model select element not found!");
            }
            
            // Enable UI controls when models are available
            console.log("🔧 UI Controller available:", !!this.popupManager.uiController);
            if (this.popupManager.uiController) {
                this.popupManager.uiController.setButtonsEnabled(true);
                console.log("🔧 Buttons enabled");
            } else {
                console.warn("⚠️ UI Controller not available, cannot enable buttons");
            }
            
            console.log("✅ Models loaded successfully");
            
        } catch (error) {
            console.error("❌ Failed to load models:", error);
            console.error("❌ Error stack:", error.stack);
            this.handleModelLoadError(error);
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
            if (model.source === "ollama" || model.id.includes("ollama") || model.name?.toLowerCase().includes("ollama")) {
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
        // Clear existing options
        selectElement.innerHTML = "";
        
        // Add cloud models first
        if (groupedModels.cloud.length > 0) {
            const cloudGroup = document.createElement("optgroup");
            cloudGroup.label = "Cloud Models";
            
            groupedModels.cloud.forEach(model => {
                const option = document.createElement("option");
                option.value = model.id;
                option.textContent = model.name || model.id;
                if (model.description) {
                    option.title = model.description;
                }
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
                option.textContent = model.name || model.id;
                if (model.description) {
                    option.title = model.description;
                }
                ollamaGroup.appendChild(option);
            });
            
            selectElement.appendChild(ollamaGroup);
        }
        
        // If no models are grouped, add them directly (fallback)
        if (groupedModels.cloud.length === 0 && groupedModels.ollama.length === 0) {
            allModels.forEach(model => {
                const option = document.createElement("option");
                option.value = model.id;
                option.textContent = model.name || model.id;
                if (model.description) {
                    option.title = model.description;
                }
                selectElement.appendChild(option);
            });
        }
        
        // Add fallback option if no models available
        if (selectElement.children.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No models available";
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }

    /**
     * Get preferred model from available models
     */
    getPreferredModel(models) {
        if (!models || models.length === 0) return null;
        
        // Try to restore from localStorage
        const savedModel = localStorage.getItem('smart-form-filler-selected-model');
        if (savedModel && models.find(m => m.id === savedModel)) {
            return savedModel;
        }
        
        // Fallback to first available model
        return models[0].id;
    }

    /**
     * Handle case when no models are available
     */
    handleNoModelsAvailable() {
        if (this.popupManager.elements.globalModelSelect) {
            this.popupManager.elements.globalModelSelect.innerHTML = '<option value="">Service unavailable</option>';
            this.popupManager.elements.globalModelSelect.disabled = true;
        }
        
        // Disable main action buttons
        this.popupManager.uiController?.setButtonsEnabled(false);
        
        console.warn("⚠️ No AI models available - features disabled");
    }

    /**
     * Handle model loading error
     */
    handleModelLoadError(error) {
        console.error("❌ Model loading failed:", error);
        
        if (this.popupManager.elements.globalModelSelect) {
            this.popupManager.elements.globalModelSelect.innerHTML = '<option value="">Service unavailable</option>';
            this.popupManager.elements.globalModelSelect.disabled = true;
        }
        
        // Disable main action buttons
        this.popupManager.uiController?.setButtonsEnabled(false);
        
        // Show error message
        this.popupManager.resultsHandler?.showError("Failed to load AI models: " + error.message);
    }

    /**
     * Refresh models from server (including Ollama models)
     */
    async refreshModels() {
        try {
            console.log("🔄 Refreshing models...");
            
            // Disable refresh button during refresh
            if (this.popupManager.elements.globalRefreshModelsBtn) {
                this.popupManager.elements.globalRefreshModelsBtn.disabled = true;
                this.popupManager.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">⏳</span>';
            }
            
            // First refresh Ollama models specifically
            try {
                const ollamaResult = await this.popupManager.apiClient.refreshOllamaModels();
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
            if (this.popupManager.elements.globalRefreshModelsBtn) {
                this.popupManager.elements.globalRefreshModelsBtn.disabled = false;
                this.popupManager.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">🔄</span>';
            }
        }
    }

    /**
     * Show refresh success feedback
     */
    showRefreshSuccess() {
        if (this.popupManager.elements.globalRefreshModelsBtn) {
            this.popupManager.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">✅</span>';
            setTimeout(() => {
                this.popupManager.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">🔄</span>';
            }, 2000);
        }
    }

    /**
     * Show refresh error feedback
     */
    showRefreshError(error) {
        if (this.popupManager.elements.globalRefreshModelsBtn) {
            this.popupManager.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">❌</span>';
            this.popupManager.elements.globalRefreshModelsBtn.title = `Refresh failed: ${error.message}`;
            setTimeout(() => {
                this.popupManager.elements.globalRefreshModelsBtn.innerHTML = '<span class="btn__icon">🔄</span>';
                this.popupManager.elements.globalRefreshModelsBtn.title = "Refresh Ollama models";
            }, 3000);
        }
    }

    /**
     * Save currently selected model to localStorage
     */
    saveSelectedModel() {
        const selectedModel = this.getSelectedModel();
        if (selectedModel) {
            localStorage.setItem('smart-form-filler-selected-model', selectedModel);
        }
    }

    /**
     * Handle model selection change
     */
    onModelSelectionChange() {
        // Save the selected model
        this.saveSelectedModel();
        
        // Update UI state based on model availability
        const selectedModel = this.getSelectedModel();
        this.popupManager.uiController?.setButtonsEnabled(!!selectedModel);
        
        console.log("🔧 Model selection changed:", selectedModel || "none");
    }
}
