/**
 * Page Debug Interface for Smart Form Filler Extension
 * This script can be injected into web pages to debug extension functionality
 */

// Debug interface for web pages
window.smartFormFillerDebug = {
    /**
     * Send a message to the extension to get debug info
     */
    async getExtensionDebugInfo() {
        try {
            console.log('🔧 [PAGE_DEBUG] Requesting extension debug info...');
            
            // Send message to content script
            const response = await new Promise((resolve, reject) => {
                const messageId = 'debug-info-' + Date.now();
                
                // Listen for response
                const responseHandler = (event) => {
                    if (event.detail && event.detail.messageId === messageId) {
                        window.removeEventListener('smartFormFillerDebugResponse', responseHandler);
                        resolve(event.detail.data);
                    }
                };
                
                window.addEventListener('smartFormFillerDebugResponse', responseHandler);
                
                // Send message via DOM event
                window.dispatchEvent(new CustomEvent('smartFormFillerDebugRequest', {
                    detail: { messageId, type: 'getDebugInfo' }
                }));
                
                // Timeout after 5 seconds
                setTimeout(() => {
                    window.removeEventListener('smartFormFillerDebugResponse', responseHandler);
                    reject(new Error('Timeout waiting for extension response'));
                }, 5000);
            });
            
            console.log('🔧 [PAGE_DEBUG] Extension debug info:', response);
            return response;
            
        } catch (error) {
            console.error('❌ [PAGE_DEBUG] Failed to get extension debug info:', error);
            return null;
        }
    },
    
    /**
     * Trigger data source modal opening
     */
    async openDataSourceModal() {
        try {
            console.log('🔧 [PAGE_DEBUG] Requesting data source modal open...');
            
            window.dispatchEvent(new CustomEvent('smartFormFillerDebugRequest', {
                detail: { type: 'openDataSourceModal', messageId: 'modal-' + Date.now() }
            }));
            
        } catch (error) {
            console.error('❌ [PAGE_DEBUG] Failed to open data source modal:', error);
        }
    },
    
    /**
     * Get extraction history
     */
    async getExtractionHistory() {
        try {
            console.log('🔧 [PAGE_DEBUG] Requesting extraction history...');
            
            const response = await new Promise((resolve, reject) => {
                const messageId = 'history-' + Date.now();
                
                const responseHandler = (event) => {
                    if (event.detail && event.detail.messageId === messageId) {
                        window.removeEventListener('smartFormFillerDebugResponse', responseHandler);
                        resolve(event.detail.data);
                    }
                };
                
                window.addEventListener('smartFormFillerDebugResponse', responseHandler);
                
                window.dispatchEvent(new CustomEvent('smartFormFillerDebugRequest', {
                    detail: { messageId, type: 'getExtractionHistory' }
                }));
                
                setTimeout(() => {
                    window.removeEventListener('smartFormFillerDebugResponse', responseHandler);
                    reject(new Error('Timeout'));
                }, 5000);
            });
            
            console.log('🔧 [PAGE_DEBUG] Extraction history:', response);
            return response;
            
        } catch (error) {
            console.error('❌ [PAGE_DEBUG] Failed to get extraction history:', error);
            return null;
        }
    }
};

// Make debug functions available globally on the page
window.debugExtensionDataSource = () => window.smartFormFillerDebug.getExtensionDebugInfo();
window.openExtensionDataSourceModal = () => window.smartFormFillerDebug.openDataSourceModal();
window.getExtensionHistory = () => window.smartFormFillerDebug.getExtractionHistory();

// Add detailed inspection function for the page
window.inspectDetailedHistory = async function() {
    console.log('🔧 [PAGE_DEBUG] === Detailed History Inspection ===');
    
    try {
        // Get detailed debug info
        const debugInfo = await window.smartFormFillerDebug.getExtensionDebugInfo();
        console.log('🔧 [PAGE_DEBUG] Current state:', debugInfo);
        
        // Get extraction history
        const historyInfo = await window.smartFormFillerDebug.getExtractionHistory();
        console.log('🔧 [PAGE_DEBUG] History info:', historyInfo);
        
        // Send a request for detailed analysis structure
        const response = await new Promise((resolve, reject) => {
            const messageId = 'detailed-history-' + Date.now();
            
            const responseHandler = (event) => {
                if (event.detail && event.detail.messageId === messageId) {
                    window.removeEventListener('smartFormFillerDebugResponse', responseHandler);
                    resolve(event.detail.data);
                }
            };
            
            window.addEventListener('smartFormFillerDebugResponse', responseHandler);
            
            window.dispatchEvent(new CustomEvent('smartFormFillerDebugRequest', {
                detail: { messageId, type: 'getDetailedHistory' }
            }));
            
            setTimeout(() => {
                window.removeEventListener('smartFormFillerDebugResponse', responseHandler);
                reject(new Error('Timeout'));
            }, 5000);
        });
        
        console.log('🔧 [PAGE_DEBUG] Detailed analysis:', response);
        
        // Extract and display the detailed information
        if (response.success && response.detailed && response.detailed.length > 0) {
            const item = response.detailed[0];
            console.log('🔧 [PAGE_DEBUG] === FIRST ITEM ANALYSIS ===');
            console.log('Index:', item.index);
            console.log('Timestamp:', item.timestamp);
            console.log('Has Analysis:', item.hasAnalysis);
            console.log('Analysis Keys:', item.analysisKeys);
            console.log('Content Info:', item.content);
            console.log('Metadata:', item.metadata);
            
            if (item.content.markdownPreview) {
                console.log('🔧 [PAGE_DEBUG] Markdown Preview:', item.content.markdownPreview);
            }
            if (item.content.cleanedPreview) {
                console.log('🔧 [PAGE_DEBUG] Cleaned HTML Preview:', item.content.cleanedPreview);
            }
            if (item.content.rawPreview) {
                console.log('🔧 [PAGE_DEBUG] Raw Content Preview:', item.content.rawPreview);
            }
            
            console.log('🔧 [PAGE_DEBUG] Summary:', response.summary);
        }
        
        return response;
        
    } catch (error) {
        console.error('❌ [PAGE_DEBUG] Error inspecting history:', error);
        return null;
    }
};

console.log('🔧 [PAGE_DEBUG] Smart Form Filler page debug interface loaded');
console.log('🔧 [PAGE_DEBUG] Available functions:');
console.log('  - debugExtensionDataSource()');
console.log('  - openExtensionDataSourceModal()');
console.log('  - getExtensionHistory()');
