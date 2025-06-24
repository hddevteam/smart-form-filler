/**
 * ModeToggle.js - Manages switching between Simple and Advanced modes
 */

class ModeToggle {
    constructor(simpleMode, advancedMode, formFillerHandler) {
        this.simpleMode = simpleMode;
        this.advancedMode = advancedMode;
        this.formFillerHandler = formFillerHandler;
        this.currentMode = 'simple'; // 'simple' or 'advanced'
        
        this.initializeElements();
        this.bindEvents();
        this.initializeMode();
    }

    initializeElements() {
        // Toggle buttons
        this.simpleModeToggle = document.getElementById('simpleModeToggle');
        this.advancedModeToggle = document.getElementById('advancedModeToggle');
        
        // Mode containers
        this.simpleModeContainer = document.getElementById('formFillerSimpleMode');
        this.advancedModeContainer = document.getElementById('formFillerAdvancedMode');
        
        // Form filler content wrapper
        this.formFillerContent = document.getElementById('formFillerContent');
    }

    bindEvents() {
        // Toggle button clicks
        if (this.simpleModeToggle) {
            this.simpleModeToggle.addEventListener('click', () => this.switchToSimple());
        }
        
        if (this.advancedModeToggle) {
            this.advancedModeToggle.addEventListener('click', () => this.switchToAdvanced());
        }

        // Listen for mode switch events from other components
        document.addEventListener('switchToAdvancedMode', (e) => {
            this.switchToAdvanced(e.detail?.preserveContent);
        });
        
        document.addEventListener('switchToSimpleMode', (e) => {
            this.switchToSimple(e.detail?.preserveContent);
        });

        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + M to toggle mode
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                this.toggleMode();
            }
        });
    }

    initializeMode() {
        // Start in simple mode by default
        this.switchToSimple(false);
    }

    switchToSimple(preserveContent = false) {
        if (this.currentMode === 'simple') return;

        console.log('🔄 Switching to Simple Mode', { preserveContent });
        
        this.currentMode = 'simple';
        
        // Update toggle buttons
        this.updateToggleButtons();
        
        // Show/hide appropriate containers
        if (this.simpleModeContainer) {
            this.simpleModeContainer.classList.remove('hidden');
        }
        if (this.advancedModeContainer) {
            this.advancedModeContainer.classList.add('hidden');
        }

        // Transfer content if requested
        if (preserveContent) {
            this.transferContentToSimple();
        }

        // Update footer mode indicator
        this.updateModeIndicator('Simple Mode');
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: 'simple', preserveContent }
        }));
    }

    switchToAdvanced(preserveContent = false) {
        if (this.currentMode === 'advanced') return;

        console.log('🔄 Switching to Advanced Mode', { preserveContent });
        
        this.currentMode = 'advanced';
        
        // Update toggle buttons
        this.updateToggleButtons();
        
        // Show/hide appropriate containers
        if (this.advancedModeContainer) {
            this.advancedModeContainer.classList.remove('hidden');
        }
        if (this.simpleModeContainer) {
            this.simpleModeContainer.classList.add('hidden');
        }

        // Transfer content if requested
        if (preserveContent) {
            this.transferContentToAdvanced();
        }

        // Update the advanced mode display
        if (this.advancedMode) {
            this.advancedMode.updateSectionVisibility();
        }

        // Update footer mode indicator
        this.updateModeIndicator('Advanced Mode');
        
        // Notify other components
        document.dispatchEvent(new CustomEvent('modeChanged', {
            detail: { mode: 'advanced', preserveContent }
        }));
    }

    toggleMode() {
        if (this.currentMode === 'simple') {
            this.switchToAdvanced(true);
        } else {
            this.switchToSimple(true);
        }
    }

    updateToggleButtons() {
        // Update button states
        if (this.simpleModeToggle) {
            if (this.currentMode === 'simple') {
                this.simpleModeToggle.classList.add('mode-toggle--active');
                this.simpleModeToggle.setAttribute('aria-pressed', 'true');
            } else {
                this.simpleModeToggle.classList.remove('mode-toggle--active');
                this.simpleModeToggle.setAttribute('aria-pressed', 'false');
            }
        }

        if (this.advancedModeToggle) {
            if (this.currentMode === 'advanced') {
                this.advancedModeToggle.classList.add('mode-toggle--active');
                this.advancedModeToggle.setAttribute('aria-pressed', 'true');
            } else {
                this.advancedModeToggle.classList.remove('mode-toggle--active');
                this.advancedModeToggle.setAttribute('aria-pressed', 'false');
            }
        }
    }

    transferContentToSimple() {
        // Transfer content from advanced mode input to simple mode
        const advancedInput = document.getElementById('fillContentInput');
        const advancedLanguage = document.getElementById('languageSelect');
        
        if (advancedInput && this.simpleMode) {
            this.simpleMode.setContent(advancedInput.value);
        }
        
        if (advancedLanguage && this.simpleMode) {
            this.simpleMode.setLanguage(advancedLanguage.value);
        }
    }

    transferContentToAdvanced() {
        // Transfer content from simple mode to advanced mode
        const advancedInput = document.getElementById('fillContentInput');
        const advancedLanguage = document.getElementById('languageSelect');
        
        if (this.simpleMode && advancedInput) {
            advancedInput.value = this.simpleMode.getContent();
            
            // Trigger input event to update any listeners
            advancedInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        if (this.simpleMode && advancedLanguage) {
            advancedLanguage.value = this.simpleMode.getLanguage();
            
            // Trigger change event to update any listeners
            advancedLanguage.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    updateModeIndicator(modeText) {
        const modeIndicator = document.getElementById('selectedMode');
        if (modeIndicator) {
            modeIndicator.textContent = `Form Filler - ${modeText}`;
        }
    }

    // Get current mode
    getCurrentMode() {
        return this.currentMode;
    }

    // Check if specific mode is active
    isSimpleMode() {
        return this.currentMode === 'simple';
    }

    isAdvancedMode() {
        return this.currentMode === 'advanced';
    }

    // Get current content from active mode
    getCurrentContent() {
        if (this.currentMode === 'simple' && this.simpleMode) {
            return this.simpleMode.getContent();
        } else {
            const advancedInput = document.getElementById('fillContentInput');
            return advancedInput?.value?.trim() || '';
        }
    }

    // Get current language from active mode
    getCurrentLanguage() {
        if (this.currentMode === 'simple' && this.simpleMode) {
            return this.simpleMode.getLanguage();
        } else {
            const advancedLanguage = document.getElementById('languageSelect');
            return advancedLanguage?.value || 'en';
        }
    }

    // Reset both modes
    reset() {
        if (this.simpleMode) {
            this.simpleMode.setContent('');
            this.simpleMode.hideAllStates();
        }
        
        if (this.advancedMode) {
            this.advancedMode.reset();
        }
        
        // Clear advanced mode inputs
        const advancedInput = document.getElementById('fillContentInput');
        if (advancedInput) {
            advancedInput.value = '';
        }
        
        // Reset to simple mode
        this.switchToSimple(false);
    }

    // Show loading state in current mode
    showLoading(message = 'Processing...') {
        if (this.currentMode === 'simple' && this.simpleMode) {
            this.simpleMode.showProgress();
        }
        
        // Also show global loading if available
        const loadingState = document.getElementById('loadingState');
        const loadingDetails = document.getElementById('loadingDetails');
        
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
        
        if (loadingDetails) {
            loadingDetails.textContent = message;
        }
    }

    // Hide loading state
    hideLoading() {
        const loadingState = document.getElementById('loadingState');
        if (loadingState) {
            loadingState.classList.add('hidden');
        }
    }

    // Show error in current mode
    showError(message) {
        if (this.currentMode === 'simple' && this.simpleMode) {
            this.simpleMode.showError(message);
        } else {
            // Show in advanced mode or global error
            const errorState = document.getElementById('errorState');
            const errorMessage = document.getElementById('errorMessage');
            
            if (errorState) {
                errorState.classList.remove('hidden');
            }
            
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
    }
}

// Make it available globally
window.ModeToggle = ModeToggle;
