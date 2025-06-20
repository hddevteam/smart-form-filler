// modules/popupSettingsManager.js - Settings and configuration management for popup
/**
 * PopupSettingsManager - Handles backend configuration, settings persistence and UI
 */

class PopupSettingsManager {
    constructor(popupManager) {
        this.popupManager = popupManager;
        this.settings = {
            backendUrl: 'http://localhost:3001',
            preferredModel: null,
            autoConnect: true
        };
    }

    /**
     * Initialize settings manager
     */
    async initialize() {
        this.loadSettings();
        this.setupSettingsModal();
        await this.applyBackendUrl();
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('smart-form-filler-settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
                console.log("📋 Settings loaded:", this.settings);
            }
        } catch (error) {
            console.warn("⚠️ Failed to load settings from localStorage:", error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('smart-form-filler-settings', JSON.stringify(this.settings));
            console.log("💾 Settings saved:", this.settings);
        } catch (error) {
            console.error("❌ Failed to save settings:", error);
        }
    }

    /**
     * Get current backend URL
     */
    getBackendUrl() {
        return this.settings.backendUrl;
    }

    /**
     * Set backend URL and save
     */
    setBackendUrl(url) {
        this.settings.backendUrl = url;
        this.saveSettings();
    }

    /**
     * Apply backend URL to API client
     */
    async applyBackendUrl() {
        if (this.popupManager.apiClient && this.settings.backendUrl) {
            this.popupManager.apiClient.setBackendUrl(this.settings.backendUrl);
            console.log("🔧 Backend URL applied:", this.settings.backendUrl);
        } else {
            console.warn("⚠️ Cannot apply backend URL:", {
                hasApiClient: !!this.popupManager.apiClient,
                hasBackendUrl: !!this.settings.backendUrl
            });
        }
    }

    /**
     * Setup settings modal functionality
     */
    setupSettingsModal() {
        console.log("🔧 Setting up settings modal...");
        
        const settingsBtn = this.popupManager.elements.settingsBtn;
        const settingsModal = this.popupManager.elements.settingsModal;
        const settingsModalClose = this.popupManager.elements.settingsModalClose;
        const backendUrlInput = this.popupManager.elements.backendUrlInput;
        const testConnectionBtn = this.popupManager.elements.testConnectionBtn;
        const connectionStatus = this.popupManager.elements.connectionStatus;
        const saveSettingsBtn = this.popupManager.elements.saveSettingsBtn;

        console.log("🔧 Settings elements status:", {
            settingsBtn: !!settingsBtn,
            settingsModal: !!settingsModal,
            settingsModalClose: !!settingsModalClose,
            backendUrlInput: !!backendUrlInput,
            testConnectionBtn: !!testConnectionBtn,
            connectionStatus: !!connectionStatus,
            saveSettingsBtn: !!saveSettingsBtn
        });

        if (!settingsBtn || !settingsModal) {
            console.warn("⚠️ Settings modal elements not found");
            return;
        }

        // Open settings modal
        settingsBtn.addEventListener('click', () => {
            console.log("🔧 Settings button clicked!");
            this.openSettingsModal();
        });

        // Close settings modal
        if (settingsModalClose) {
            settingsModalClose.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }

        // Cancel button
        const settingsCancelBtn = this.popupManager.elements.settingsCancelBtn;
        if (settingsCancelBtn) {
            settingsCancelBtn.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }

        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.closeSettingsModal();
            }
        });

        // Test connection button
        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => {
                this.testConnection();
            });
        }

        // Save settings button
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettingsFromModal();
            });
        }

        // Auto-test connection when URL changes
        if (backendUrlInput) {
            backendUrlInput.addEventListener('input', () => {
                this.clearConnectionStatus();
            });
        }
    }

    /**
     * Open settings modal and populate with current values
     */
    openSettingsModal() {
        console.log("🔧 Opening settings modal...");
        const settingsModal = this.popupManager.elements.settingsModal;
        const backendUrlInput = this.popupManager.elements.backendUrlInput;

        if (settingsModal) {
            // Remove hidden class first, then set display
            settingsModal.classList.remove('hidden');
            settingsModal.style.display = 'flex'; // Use flex to ensure proper centering
            
            // Force a reflow to ensure styles are applied
            settingsModal.offsetHeight;
            
            console.log("✅ Settings modal opened", {
                classList: settingsModal.classList.toString(),
                display: settingsModal.style.display,
                position: getComputedStyle(settingsModal).position,
                zIndex: getComputedStyle(settingsModal).zIndex
            });
        } else {
            console.error("❌ Settings modal element not found");
        }

        if (backendUrlInput) {
            backendUrlInput.value = this.settings.backendUrl;
        }

        this.clearConnectionStatus();
    }

    /**
     * Close settings modal
     */
    closeSettingsModal() {
        console.log("🔧 Closing settings modal...");
        const settingsModal = this.popupManager.elements.settingsModal;
        if (settingsModal) {
            settingsModal.style.display = 'none';
            settingsModal.classList.add('hidden');
            console.log("✅ Settings modal closed");
        }
    }

    /**
     * Test connection to backend
     */
    async testConnection() {
        const backendUrlInput = this.popupManager.elements.backendUrlInput;
        const testConnectionBtn = this.popupManager.elements.testConnectionBtn;
        const connectionStatus = this.popupManager.elements.connectionStatus;

        if (!backendUrlInput || !connectionStatus) {
            console.warn("⚠️ Test connection elements not found");
            return;
        }

        const testUrl = backendUrlInput.value.trim();
        if (!testUrl) {
            this.showConnectionStatus('Please enter a backend URL', 'error');
            return;
        }

        // Disable test button and show loading
        if (testConnectionBtn) {
            testConnectionBtn.disabled = true;
            const btnText = testConnectionBtn.querySelector('.btn__text');
            if (btnText) {
                btnText.textContent = 'Testing...';
            } else {
                testConnectionBtn.textContent = 'Testing...';
            }
        }

        try {
            // Create temporary API client for testing
            const tempApiClient = new (this.popupManager.apiClient.constructor)();
            tempApiClient.setBackendUrl(testUrl);

            // Test basic health check
            const response = await tempApiClient.testConnection();
            
            if (response.success) {
                this.showConnectionStatus('✅ Connection successful', 'success');
            } else {
                this.showConnectionStatus('❌ Connection failed: ' + (response.error || 'Unknown error'), 'error');
            }

        } catch (error) {
            console.error("❌ Connection test failed:", error);
            this.showConnectionStatus('❌ Connection failed: ' + error.message, 'error');
        } finally {
            // Re-enable test button
            if (testConnectionBtn) {
                testConnectionBtn.disabled = false;
                const btnText = testConnectionBtn.querySelector('.btn__text');
                if (btnText) {
                    btnText.textContent = 'Test';
                } else {
                    testConnectionBtn.textContent = 'Test Connection';
                }
            }
        }
    }

    /**
     * Show connection status message
     */
    showConnectionStatus(message, type = 'info') {
        const connectionStatus = this.popupManager.elements.connectionStatus;
        if (!connectionStatus) return;

        connectionStatus.textContent = message;
        connectionStatus.className = `connection-status ${type}`;
        connectionStatus.style.display = 'block';
    }

    /**
     * Clear connection status
     */
    clearConnectionStatus() {
        const connectionStatus = this.popupManager.elements.connectionStatus;
        if (connectionStatus) {
            connectionStatus.style.display = 'none';
            connectionStatus.textContent = '';
        }
    }

    /**
     * Save settings from modal
     */
    async saveSettingsFromModal() {
        const backendUrlInput = this.popupManager.elements.backendUrlInput;
        const saveSettingsBtn = this.popupManager.elements.saveSettingsBtn;

        if (!backendUrlInput) {
            console.warn("⚠️ Backend URL input not found");
            return;
        }

        const newBackendUrl = backendUrlInput.value.trim();
        if (!newBackendUrl) {
            this.showConnectionStatus('Please enter a valid backend URL', 'error');
            return;
        }

        // Disable save button during save
        if (saveSettingsBtn) {
            saveSettingsBtn.disabled = true;
            saveSettingsBtn.textContent = 'Saving...';
        }

        try {
            // Save the new URL
            const oldUrl = this.settings.backendUrl;
            this.setBackendUrl(newBackendUrl);
            
            // Apply the new URL to API client
            await this.applyBackendUrl();
            
            // If URL changed, reload models
            if (oldUrl !== newBackendUrl) {
                console.log("🔄 Backend URL changed, reloading models...");
                await this.popupManager.modelManager.loadModels();
            }

            this.showConnectionStatus('✅ Settings saved successfully', 'success');
            
            // Close modal after delay
            setTimeout(() => {
                this.closeSettingsModal();
            }, 1500);

        } catch (error) {
            console.error("❌ Failed to save settings:", error);
            this.showConnectionStatus('❌ Failed to save settings: ' + error.message, 'error');
        } finally {
            // Re-enable save button
            if (saveSettingsBtn) {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = 'Save Settings';
            }
        }
    }

    /**
     * Reset settings to default values
     */
    resetSettings() {
        this.settings = {
            backendUrl: 'http://localhost:3001',
            preferredModel: null,
            autoConnect: true
        };
        this.saveSettings();
        console.log("🔄 Settings reset to defaults");
    }

    /**
     * Export settings as JSON
     */
    exportSettings() {
        try {
            const settingsJson = JSON.stringify(this.settings, null, 2);
            const blob = new Blob([settingsJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'smart-form-filler-settings.json';
            a.click();
            
            URL.revokeObjectURL(url);
            console.log("📤 Settings exported");
        } catch (error) {
            console.error("❌ Failed to export settings:", error);
        }
    }

    /**
     * Import settings from JSON
     */
    async importSettings(file) {
        try {
            const text = await file.text();
            const importedSettings = JSON.parse(text);
            
            // Validate imported settings
            if (typeof importedSettings === 'object' && importedSettings !== null) {
                this.settings = { ...this.settings, ...importedSettings };
                this.saveSettings();
                await this.applyBackendUrl();
                console.log("📥 Settings imported successfully");
                return true;
            } else {
                throw new Error("Invalid settings file format");
            }
        } catch (error) {
            console.error("❌ Failed to import settings:", error);
            return false;
        }
    }
}
