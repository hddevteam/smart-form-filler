/**
 * AdvancedMode.js - Advanced form filling interface with step-by-step control
 */

class AdvancedMode {
    constructor(formFillerHandler, dataSourceManager) {
        this.formFillerHandler = formFillerHandler;
        this.dataSourceManager = dataSourceManager;
        this.collapsedSections = new Set(); // Track collapsed sections
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Get container for advanced mode
        this.container = document.getElementById('formFillerAdvancedMode');
        if (!this.container) {
            console.error('Advanced mode container not found');
            return;
        }

        // Get section containers
        this.formDetectionSection = this.container.querySelector('#advancedFormDetection');
        this.contentAnalysisSection = this.container.querySelector('#advancedContentAnalysis');
        this.fieldMappingSection = this.container.querySelector('#advancedFieldMapping');
        this.fillActionsSection = this.container.querySelector('#advancedFillActions');

        // Get collapsible headers
        this.collapsibleHeaders = this.container.querySelectorAll('.advanced-mode__section-header--collapsible');
    }

    bindEvents() {
        // Bind collapsible section headers
        this.collapsibleHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                // Prevent event bubbling to avoid conflicts
                e.stopPropagation();
                
                const target = header.getAttribute('data-target');
                if (target) {
                    console.log(`[AdvancedMode] Toggling section: ${target}`);
                    this.toggleSection(target);
                }
            });
        });

        // Bind results section collapse buttons
        document.addEventListener('click', (e) => {
            const collapseBtn = e.target.closest('.section__collapse-btn');
            if (collapseBtn && collapseBtn.closest('.advanced-mode__section')) {
                e.stopPropagation();
                const target = collapseBtn.getAttribute('data-target');
                if (target && target.includes('ResultsContent')) {
                    this.toggleResultsSection(target);
                }
            }
        });

        // Listen for form filler events to update visibility
        document.addEventListener('formDetectionCompleted', () => this.updateSectionVisibility());
        document.addEventListener('analysisCompleted', () => this.updateSectionVisibility());
        document.addEventListener('mappingCompleted', () => this.updateSectionVisibility());
        document.addEventListener('fillCompleted', () => this.updateSectionVisibility());
    }

    toggleSection(sectionId) {
        const section = this.container.querySelector(`[data-section="${sectionId}"]`);
        const header = this.container.querySelector(`[data-target="${sectionId}"]`);
        const icon = header?.querySelector('.advanced-mode__collapse-icon');

        if (!section || !header) return;

        const isCollapsed = this.collapsedSections.has(sectionId);

        if (isCollapsed) {
            // Expand
            section.classList.remove('advanced-mode__section-content--collapsed');
            this.collapsedSections.delete(sectionId);
            if (icon) icon.textContent = '▼';
        } else {
            // Collapse - but ensure action buttons remain visible
            section.classList.add('advanced-mode__section-content--collapsed');
            this.collapsedSections.add(sectionId);
            if (icon) icon.textContent = '▶';
        }
        
        // Action buttons are now outside the collapsible content area, so they should always be visible
        // No additional handling needed since they're positioned before the header
    }

    toggleResultsSection(sectionId) {
        console.log(`[AdvancedMode] toggleResultsSection called with: ${sectionId}`);
        
        const section = this.container.querySelector(`[data-section="${sectionId}"]`);
        const button = this.container.querySelector(`[data-target="${sectionId}"]`);
        const icon = button?.querySelector('.collapse-icon');

        if (!section || !button) {
            console.warn(`[AdvancedMode] toggleResultsSection: Could not find section or button for ${sectionId}`);
            return;
        }

        const isCollapsed = section.classList.contains('collapsed');
        console.log(`[AdvancedMode] Results section ${sectionId} is currently ${isCollapsed ? 'collapsed' : 'expanded'}`);

        if (isCollapsed) {
            // Expand
            section.classList.remove('collapsed');
            if (icon) icon.textContent = '▼';
            console.log(`[AdvancedMode] Expanded results section ${sectionId}`);
        } else {
            // Collapse
            section.classList.add('collapsed');
            if (icon) icon.textContent = '▶';
            console.log(`[AdvancedMode] Collapsed results section ${sectionId}`);
        }
    }

    updateSectionVisibility() {
        // Show sections based on current workflow state
        const hasDetectedForms = this.formFillerHandler.currentForms && this.formFillerHandler.currentForms.length > 0;
        const hasAnalysisResult = this.formFillerHandler.currentAnalysisResult;
        const hasMappings = this.formFillerHandler.currentMappings && this.formFillerHandler.currentMappings.length > 0;

        // Content Analysis section - show after form detection
        if (this.contentAnalysisSection) {
            if (hasDetectedForms) {
                this.contentAnalysisSection.classList.remove('hidden');
            } else {
                this.contentAnalysisSection.classList.add('hidden');
            }
        }

        // Field Mapping section - show after content analysis
        if (this.fieldMappingSection) {
            if (hasAnalysisResult) {
                this.fieldMappingSection.classList.remove('hidden');
            } else {
                this.fieldMappingSection.classList.add('hidden');
            }
        }

        // Fill Actions section - show after field mapping
        if (this.fillActionsSection) {
            if (hasMappings) {
                this.fillActionsSection.classList.remove('hidden');
            } else {
                this.fillActionsSection.classList.add('hidden');
            }
        }
    }

    expandSection(sectionId) {
        if (this.collapsedSections.has(sectionId)) {
            this.toggleSection(sectionId);
        }
    }

    collapseSection(sectionId) {
        if (!this.collapsedSections.has(sectionId)) {
            this.toggleSection(sectionId);
        }
    }

    expandAllSections() {
        const allSections = ['formDetection', 'contentAnalysis', 'fieldMapping', 'fillActions'];
        allSections.forEach(sectionId => {
            this.expandSection(sectionId);
        });
    }

    collapseAllSections() {
        const allSections = ['formDetection', 'contentAnalysis', 'fieldMapping', 'fillActions'];
        allSections.forEach(sectionId => {
            this.collapseSection(sectionId);
        });
    }

    // Highlight the active step
    highlightActiveStep(stepName) {
        // Remove previous highlights
        const allSections = this.container.querySelectorAll('.advanced-mode__section');
        allSections.forEach(section => {
            section.classList.remove('advanced-mode__section--active');
        });

        // Add highlight to current step
        const currentSection = this.container.querySelector(`[data-step="${stepName}"]`);
        if (currentSection) {
            currentSection.classList.add('advanced-mode__section--active');
            
            // Auto-expand the active section
            const sectionId = currentSection.getAttribute('data-section');
            if (sectionId) {
                this.expandSection(sectionId);
            }
        }
    }

    // Reset all step highlights
    clearStepHighlights() {
        const allSections = this.container.querySelectorAll('.advanced-mode__section');
        allSections.forEach(section => {
            section.classList.remove('advanced-mode__section--active');
        });
    }

    // Update step status (success, error, pending)
    updateStepStatus(stepName, status, message = '') {
        const section = this.container.querySelector(`[data-step="${stepName}"]`);
        if (!section) return;

        // Remove previous status classes
        section.classList.remove(
            'advanced-mode__section--success',
            'advanced-mode__section--error',
            'advanced-mode__section--pending'
        );

        // Add new status class
        if (status) {
            section.classList.add(`advanced-mode__section--${status}`);
        }

        // Update status message if provided
        const statusEl = section.querySelector('.advanced-mode__step-status');
        if (statusEl && message) {
            statusEl.textContent = message;
        }
    }

    // Data source button integration
    updateDataSourceButton() {
        // This will be handled by the DataSourceButton instance
        // But we can trigger updates from here if needed
        if (this.dataSourceManager) {
            document.dispatchEvent(new CustomEvent('advancedModeDataSourceUpdate'));
        }
    }

    setContent(content) {
        const contentInput = document.getElementById('fillContentInput');
        if (contentInput) {
            contentInput.value = content || '';
        }
    }

    getContent() {
        const contentInput = document.getElementById('fillContentInput');
        return contentInput ? contentInput.value : '';
    }

    getLanguage() {
        const languageSelect = document.getElementById('languageSelect');
        return languageSelect ? languageSelect.value : 'en';
    }

    setLanguage(language) {
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = language;
        }
    }

    // Public methods for external control
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            this.updateSectionVisibility();
        }
    }

    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
        }
    }

    isVisible() {
        return this.container && !this.container.classList.contains('hidden');
    }

    // Reset the advanced mode to initial state
    reset() {
        this.clearStepHighlights();
        
        // Reset all step statuses
        const steps = ['formDetection', 'contentAnalysis', 'fieldMapping', 'fillActions'];
        steps.forEach(step => {
            this.updateStepStatus(step, null);
        });

        // Hide conditional sections
        const conditionalSections = [this.contentAnalysisSection, this.fieldMappingSection, this.fillActionsSection];
        conditionalSections.forEach(section => {
            if (section) {
                section.classList.add('hidden');
            }
        });

        // Hide results containers
        const resultsContainers = [
            'formDetectionResults',
            'analysisResultsContainer', 
            'mappingResultsContainer'
        ];
        resultsContainers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.classList.add('hidden');
            }
        });

        // Reset results content collapse state
        this.container.querySelectorAll('.section__content--collapsible').forEach(content => {
            content.classList.remove('collapsed');
        });
        
        // Reset all collapse icons for results
        this.container.querySelectorAll('.collapse-icon').forEach(icon => {
            icon.textContent = '▼';
        });

        // Expand all visible sections by default
        this.collapsedSections.clear();
        this.container.querySelectorAll('.advanced-mode__collapse-icon').forEach(icon => {
            icon.textContent = '▼';
        });
        this.container.querySelectorAll('.advanced-mode__section-content--collapsed').forEach(content => {
            content.classList.remove('advanced-mode__section-content--collapsed');
        });
        
        // Action buttons should always be visible since they're positioned outside collapsible areas
    }

    // Get current workflow progress
    getProgress() {
        const hasDetectedForms = this.formFillerHandler.currentForms && this.formFillerHandler.currentForms.length > 0;
        const hasAnalysisResult = this.formFillerHandler.currentAnalysisResult;
        const hasMappings = this.formFillerHandler.currentMappings && this.formFillerHandler.currentMappings.length > 0;
        const hasFilled = false; // This would need to be tracked separately

        return {
            formDetection: hasDetectedForms,
            contentAnalysis: hasAnalysisResult,
            fieldMapping: hasMappings,
            formFilling: hasFilled
        };
    }

    // Auto-scroll to a specific section
    scrollToSection(sectionId) {
        const section = this.container.querySelector(`[data-section="${sectionId}"]`);
        if (section) {
            section.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }
}

// Make it available globally
window.AdvancedMode = AdvancedMode;
