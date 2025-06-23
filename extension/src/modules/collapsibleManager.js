// modules/collapsibleManager.js
/**
 * Collapsible Manager Module
 * Handles collapsible sections in Form Filler workflow
 */

class CollapsibleManager {
    constructor() {
        this.sections = new Map(); // Track section states
        this.currentActiveSection = null; // Track which section is currently active
        this.autoCollapseEnabled = true; // Enable auto-collapse behavior
        
        this.init();
        console.log("🔧 CollapsibleManager initialized");
    }

    /**
     * Initialize the collapsible manager
     */
    init() {
        this.setupEventListeners();
        this.initializeSections();
    }

    /**
     * Setup event listeners for collapse buttons
     */
    setupEventListeners() {
        document.addEventListener('click', (event) => {
            // Check if clicked on collapsible header or its children
            const collapsibleHeader = event.target.closest('.section__header--collapsible');
            const collapseBtn = event.target.closest('.section__collapse-btn');
            
            if (collapsibleHeader) {
                event.preventDefault();
                event.stopPropagation();
                
                // Find the collapse button within this header to get the target
                const targetCollapseBtn = collapsibleHeader.querySelector('.section__collapse-btn');
                if (targetCollapseBtn) {
                    const targetSection = targetCollapseBtn.dataset.target;
                    this.toggleSection(targetSection);
                }
            }
        });

        // Listen for workflow events to auto-collapse previous sections
        this.setupWorkflowListeners();
    }

    /**
     * Initialize all collapsible sections
     */
    initializeSections() {
        const collapsibleSections = [
            'formDetection',
            'analysisResults', 
            'fieldMapping',
            'fillActions'
        ];

        collapsibleSections.forEach(sectionId => {
            this.sections.set(sectionId, {
                id: sectionId,
                isCollapsed: false,
                element: document.querySelector(`[data-section="${sectionId}"]`),
                button: document.querySelector(`[data-target="${sectionId}"]`),
                isVisible: false
            });
        });
    }

    /**
     * Setup workflow event listeners for auto-collapse
     */
    setupWorkflowListeners() {
        // Listen for when new sections become visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    
                    // Check if a section became visible
                    if (target.classList.contains('section') && !target.classList.contains('hidden')) {
                        const sectionId = this.getSectionIdFromElement(target);
                        if (sectionId && this.sections.has(sectionId)) {
                            this.onSectionBecameVisible(sectionId);
                        }
                    }
                }
            });
        });

        // Observe all section elements
        document.querySelectorAll('.section').forEach(section => {
            observer.observe(section, {
                attributes: true,
                attributeFilter: ['class']
            });
        });

        // Listen for specific workflow events
        document.addEventListener('formDetectionCompleted', () => {
            this.onWorkflowStep('formDetection');
        });

        document.addEventListener('analysisCompleted', () => {
            this.onWorkflowStep('analysisResults');
        });

        document.addEventListener('mappingCompleted', () => {
            this.onWorkflowStep('fieldMapping');
        });

        document.addEventListener('fillCompleted', () => {
            this.onWorkflowStep('fillActions');
        });
    }

    /**
     * Get section ID from a DOM element
     */
    getSectionIdFromElement(element) {
        // Map element IDs to section IDs
        const idMapping = {
            'formDetectionResults': 'formDetection',
            'analysisResultsSection': 'analysisResults',
            'fieldMappingSection': 'fieldMapping',
            'fillActionsSection': 'fillActions'
        };

        return idMapping[element.id] || null;
    }

    /**
     * Handle when a section becomes visible
     */
    onSectionBecameVisible(sectionId) {
        const section = this.sections.get(sectionId);
        if (section && !section.isVisible) {
            section.isVisible = true;
            
            // Auto-collapse previous sections if enabled
            if (this.autoCollapseEnabled) {
                this.autoCollapsePreviousSections(sectionId);
            }
            
            // Highlight the new section
            this.highlightNewSection(sectionId);
            
            console.log(`📂 Section '${sectionId}' became visible`);
        }
    }

    /**
     * Handle workflow step completion
     */
    onWorkflowStep(sectionId) {
        this.currentActiveSection = sectionId;
        
        // Ensure the current section is expanded
        this.expandSection(sectionId);
        
        // Auto-collapse previous sections
        if (this.autoCollapseEnabled) {
            this.autoCollapsePreviousSections(sectionId);
        }
    }

    /**
     * Auto-collapse previous sections in the workflow
     */
    autoCollapsePreviousSections(currentSectionId) {
        const workflowOrder = ['formDetection', 'analysisResults', 'fieldMapping', 'fillActions'];
        const currentIndex = workflowOrder.indexOf(currentSectionId);
        
        if (currentIndex > 0) {
            // Collapse all previous sections
            for (let i = 0; i < currentIndex; i++) {
                const prevSectionId = workflowOrder[i];
                if (this.sections.has(prevSectionId)) {
                    this.collapseSection(prevSectionId, true); // true for auto-collapse
                }
            }
        }
    }

    /**
     * Highlight a newly expanded section
     */
    highlightNewSection(sectionId) {
        const section = this.sections.get(sectionId);
        if (section?.element) {
            const parentSection = section.element.closest('.section');
            if (parentSection) {
                parentSection.classList.add('section--newly-expanded');
                
                // Remove highlight after animation
                setTimeout(() => {
                    parentSection.classList.remove('section--newly-expanded');
                }, 2000);
            }
        }
    }

    /**
     * Toggle a section's collapsed state
     */
    toggleSection(sectionId) {
        const section = this.sections.get(sectionId);
        if (!section) {
            console.warn(`Section '${sectionId}' not found`);
            return;
        }

        if (section.isCollapsed) {
            this.expandSection(sectionId);
        } else {
            this.collapseSection(sectionId);
        }
    }

    /**
     * Expand a section
     */
    expandSection(sectionId) {
        const section = this.sections.get(sectionId);
        if (!section) return;

        section.isCollapsed = false;
        
        if (section.element) {
            section.element.classList.remove('collapsed');
        }
        
        if (section.button) {
            section.button.classList.remove('collapsed');
            section.button.title = 'Collapse';
        }

        console.log(`📂 Expanded section: ${sectionId}`);
    }

    /**
     * Collapse a section
     */
    collapseSection(sectionId, isAutoCollapse = false) {
        const section = this.sections.get(sectionId);
        if (!section) return;

        section.isCollapsed = true;
        
        if (section.element) {
            section.element.classList.add('collapsed');
            
            // Add auto-collapse animation class if it's an auto-collapse
            if (isAutoCollapse) {
                section.element.classList.add('section--auto-collapsing');
                setTimeout(() => {
                    section.element.classList.remove('section--auto-collapsing');
                }, 400);
            }
        }
        
        if (section.button) {
            section.button.classList.add('collapsed');
            section.button.title = 'Expand';
        }

        console.log(`📁 Collapsed section: ${sectionId}${isAutoCollapse ? ' (auto)' : ''}`);
    }

    /**
     * Collapse all sections
     */
    collapseAll() {
        this.sections.forEach((section, sectionId) => {
            this.collapseSection(sectionId);
        });
    }

    /**
     * Expand all sections
     */
    expandAll() {
        this.sections.forEach((section, sectionId) => {
            this.expandSection(sectionId);
        });
    }

    /**
     * Enable/disable auto-collapse behavior
     */
    setAutoCollapse(enabled) {
        this.autoCollapseEnabled = enabled;
        console.log(`🔧 Auto-collapse ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current section states (for debugging)
     */
    getSectionStates() {
        const states = {};
        this.sections.forEach((section, sectionId) => {
            states[sectionId] = {
                isCollapsed: section.isCollapsed,
                isVisible: section.isVisible
            };
        });
        return states;
    }

    /**
     * Reset all sections to initial state
     */
    reset() {
        this.sections.forEach((section, sectionId) => {
            this.expandSection(sectionId);
            section.isVisible = false;
        });
        this.currentActiveSection = null;
        console.log("🔄 CollapsibleManager reset");
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = CollapsibleManager;
}
