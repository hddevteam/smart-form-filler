/* global chrome, AuthManager, ApiClient, DataExtractor, ResultsHandler, ChatHandler, CopyHandler, UIController, FormFillerHandler, PopupManager, PopupInitializer, PopupEventHandlers, PopupModelManager, PopupSettingsManager, PopupDataSourceManager */
// popup-main.js - Main entry point using modular architecture

// Global popup manager instance
let globalPopupManager = null;

/**
 * Initialize the popup application
 */
async function initializePopup() {
    try {
        console.log("🚀 Initializing popup application...");
        
        // Verify DOM is ready
        if (document.readyState === "loading") {
            console.warn("⚠️ DOM not ready yet, waiting...");
            await new Promise(resolve => {
                document.addEventListener("DOMContentLoaded", resolve);
            });
        }
        
        // Create and initialize the popup manager
        globalPopupManager = new PopupManager();
        await globalPopupManager.initialize();
        
        // Make it globally accessible for debugging
        window.popupManager = globalPopupManager;
        
        // Ensure debug functions are available
        setTimeout(() => {
            console.log("🔧 Debug functions available:");
            console.log("- debugDataSourceManager()");
            console.log("- testDataSourceModal()");
            console.log("- testDirectModalShow()");
            console.log("- inspectExtractionHistory()");
            console.log("- window.popupManager (for manual inspection)");
            
            // Also log the current state for debugging
            console.log("🔧 Current popup state:", {
                hasPopupManager: !!window.popupManager,
                hasDataSourceManager: !!window.popupManager?.dataSourceManager,
                hasResultsHandler: !!window.popupManager?.resultsHandler,
                extractionHistoryLength: window.popupManager?.resultsHandler?.extractionHistory?.length || 0,
                availableDataSourcesCount: window.popupManager?.dataSourceManager?.availableDataSources?.length || 0
            });
        }, 1000);
        
        console.log("✅ Popup application initialized successfully");
        
    } catch (error) {
        console.error("❌ Failed to initialize popup application:", error);
        showInitializationError(error);
    }
}

/**
 * Show initialization error to user with Edge browser specific guidance
 */
function showInitializationError(error) {
    const isEdge = navigator.userAgent.includes('Edge') || navigator.userAgent.includes('Edg/');
    
    document.body.innerHTML = `
        <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
            <h3>Initialization Error</h3>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Browser:</strong> ${isEdge ? 'Microsoft Edge' : 'Other'}</p>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Extension files are corrupted or missing</li>
                <li>DOM elements are missing from popup.html</li>
                <li>JavaScript modules failed to load</li>
                <li>Backend service is unavailable</li>
                ${isEdge ? '<li>Edge browser specific loading issues</li>' : ''}
            </ul>
            <p><strong>Try:</strong></p>
            <ul>
                <li>Reloading the extension</li>
                <li>Closing and reopening the popup</li>
                <li>Checking backend configuration</li>
                ${isEdge ? '<li>Clearing Edge browser cache and cookies</li>' : ''}
                ${isEdge ? '<li>Disabling other extensions temporarily</li>' : ''}
                <li>Reinstalling the extension</li>
            </ul>
            <div style="margin-top: 15px;">
                <button onclick="location.reload()" style="padding: 8px 16px; margin-right: 10px;">
                    Reload Popup
                </button>
                <button onclick="window.close()" style="padding: 8px 16px;">
                    Close
                </button>
            </div>
            <details style="margin-top: 15px;">
                <summary>Debug Information</summary>
                <pre style="background: #f5f5f5; padding: 10px; font-size: 12px; overflow: auto;">
User Agent: ${navigator.userAgent}
Error Stack: ${error.stack || 'Not available'}
Timestamp: ${new Date().toISOString()}
                </pre>
            </details>
        </div>
    `;
}

/**
 * Handle popup unload/cleanup
 */
function handlePopupUnload() {
    if (globalPopupManager) {
        console.log("�� Cleaning up popup application...");
        globalPopupManager.cleanup();
        globalPopupManager = null;
    }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePopup);
} else {
    initializePopup();
}

// Handle messages from content script for debugging
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('🔧 [POPUP_DEBUG] Received message:', request);
        
        try {
            switch (request.action) {
                case 'getPopupDebugInfo':
                    const debugInfo = {
                        hasPopupManager: !!window.popupManager,
                    hasDataSourceManager: !!window.popupManager?.dataSourceManager,
                    hasResultsHandler: !!window.popupManager?.resultsHandler,
                    extractionHistoryLength: window.popupManager?.resultsHandler?.extractionHistory?.length || 0,
                    availableDataSourcesCount: window.popupManager?.dataSourceManager?.availableDataSources?.length || 0,
                    isDataSourceConfigured: window.popupManager?.dataSourceManager?.isDataSourceConfigured() || false,
                    currentConfig: window.popupManager?.dataSourceManager?.currentConfig || null,
                    timestamp: new Date().toISOString()
                };
                sendResponse(debugInfo);
                break;
                
            case 'openDataSourceModal':
                if (window.popupManager?.dataSourceManager) {
                    window.popupManager.dataSourceManager.openModal();
                    sendResponse({ success: true, message: 'Modal opened' });
                } else {
                    sendResponse({ success: false, error: 'DataSourceManager not available' });
                }
                break;
                
            case 'getExtractionHistory':
                const history = window.popupManager?.resultsHandler?.extractionHistory || [];
                sendResponse({
                    success: true,
                    history: history.map(item => ({
                        timestamp: item.timestamp,
                        url: item.analysis?.url,
                        title: item.analysis?.title,
                        hasMarkdown: !!item.analysis?.markdown,
                        iframeCount: item.analysis?.iframes?.length || 0
                    }))
                });
                break;
                
            case 'getDetailedAnalysis':
                const detailedHistory = window.popupManager?.resultsHandler?.extractionHistory || [];
                const detailedAnalysis = detailedHistory.map((item, index) => {
                    const analysis = item.analysis || {};
                    return {
                        index,
                        timestamp: item.timestamp,
                        hasAnalysis: !!item.analysis,
                        analysisKeys: analysis ? Object.keys(analysis) : [],
                        content: {
                            hasMarkdown: !!analysis.markdown,
                            hasCleanedHtml: !!analysis.cleanedHtml,
                            hasRawContent: !!analysis.content,
                            markdownLength: analysis.markdown ? analysis.markdown.length : 0,
                            cleanedHtmlLength: analysis.cleanedHtml ? analysis.cleanedHtml.length : 0,
                            rawContentLength: analysis.content ? analysis.content.length : 0,
                            markdownPreview: analysis.markdown ? analysis.markdown.substring(0, 200) : null,
                            cleanedPreview: analysis.cleanedHtml ? analysis.cleanedHtml.substring(0, 200) : null,
                            rawPreview: analysis.content ? analysis.content.substring(0, 200) : null
                        },
                        metadata: {
                            title: analysis.title,
                            url: analysis.url,
                            iframeCount: analysis.iframes ? analysis.iframes.length : 0
                        }
                    };
                });
                
                sendResponse({
                    success: true,
                    detailed: detailedAnalysis,
                    summary: {
                        totalItems: detailedHistory.length,
                        withMarkdown: detailedAnalysis.filter(item => item.content.hasMarkdown).length,
                        withCleanedHtml: detailedAnalysis.filter(item => item.content.hasCleanedHtml).length,
                        withRawContent: detailedAnalysis.filter(item => item.content.hasRawContent).length
                    }
                });
                break;
                
            case 'forceUpdateDataSources':
                console.log('🔧 [POPUP_DEBUG] Force updating data sources...');
                if (window.popupManager?.dataSourceManager) {
                    try {
                        // Force update and get current state
                        window.popupManager.dataSourceManager.updateAvailableDataSources();
                        
                        const currentState = {
                            extractionHistoryLength: window.popupManager.resultsHandler?.extractionHistory?.length || 0,
                            availableDataSourcesCount: window.popupManager.dataSourceManager.availableDataSources?.length || 0,
                            availableDataSources: window.popupManager.dataSourceManager.availableDataSources || []
                        };
                        
                        sendResponse({ 
                            success: true, 
                            message: 'Data sources force updated',
                            state: currentState
                        });
                    } catch (error) {
                        sendResponse({ 
                            success: false, 
                            error: error.message 
                        });
                    }
                } else {
                    sendResponse({ 
                        success: false, 
                        error: 'DataSourceManager not available' 
                    });
                }
                break;
                
            default:
                sendResponse({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('❌ [POPUP_DEBUG] Error handling message:', error);
        sendResponse({ error: error.message });
    }
    
    return true; // Keep message channel open for async response
    });
} else {
    console.log('🔧 [POPUP_DEBUG] Chrome runtime API not available, message handling disabled');
}

// Handle popup cleanup
window.addEventListener("beforeunload", handlePopupUnload);
window.addEventListener("unload", handlePopupUnload);

// Global debug functions for testing
window.debugModal = function() {
    console.log("🔧 [DEBUG] Manual modal test");
    const modal = document.getElementById('dataSourceModal');
    const btn = document.getElementById('openDataSourceModalBtn');
    
    console.log("Modal element:", modal);
    console.log("Button element:", btn);
    console.log("PopupManager:", window.popupManager);
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        console.log("✅ Modal should now be visible");
    } else {
        console.error("❌ Modal not found");
    }
};

// Global debug functions for testing
window.debugDataSourceManager = function() {
    console.log('=== DataSourceManager Debug ===');
    console.log('popupManager:', window.popupManager);
    console.log('dataSourceManager:', window.popupManager?.dataSourceManager);
    console.log('resultsHandler:', window.popupManager?.resultsHandler);
    console.log('extractionHistory:', window.popupManager?.resultsHandler?.extractionHistory);
    
    if (window.popupManager?.dataSourceManager) {
        console.log('availableDataSources:', window.popupManager.dataSourceManager.availableDataSources);
        window.popupManager.dataSourceManager.updateAvailableDataSources();
    }
};

window.testDataSourceModal = function() {
    console.log('=== Testing Data Source Modal ===');
    if (window.popupManager?.dataSourceManager) {
        window.popupManager.dataSourceManager.openModal();
    } else {
        console.error('DataSourceManager not found');
    }
};

window.testDirectModalShow = function() {
    console.log('=== Testing Direct Modal Show ===');
    const modal = document.getElementById('dataSourceModal');
    if (modal) {
        console.log('Modal found, showing...');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    } else {
        console.error('Modal element not found');
    }
};

// Add detailed history inspection function
window.inspectExtractionHistory = function() {
    console.log('=== Detailed Extraction History Inspection ===');
    if (window.popupManager?.resultsHandler?.extractionHistory) {
        const history = window.popupManager.resultsHandler.extractionHistory;
        console.log('Total items:', history.length);
        
        history.forEach((item, index) => {
            console.log(`\n--- Item ${index} ---`);
            console.log('Full item:', item);
            console.log('Has analysis:', !!item.analysis);
            console.log('Analysis keys:', item.analysis ? Object.keys(item.analysis) : 'No analysis');
            
            if (item.analysis) {
                console.log('Analysis content keys:', Object.keys(item.analysis));
                console.log('Has markdown:', !!item.analysis.markdown);
                console.log('Has cleanedHtml:', !!item.analysis.cleanedHtml);
                console.log('Has content:', !!item.analysis.content);
                console.log('Has title:', !!item.analysis.title);
                console.log('Has url:', !!item.analysis.url);
                
                if (item.analysis.markdown) {
                    console.log('Markdown preview:', item.analysis.markdown.substring(0, 200) + '...');
                }
                if (item.analysis.cleanedHtml) {
                    console.log('Cleaned HTML preview:', item.analysis.cleanedHtml.substring(0, 200) + '...');
                }
                if (item.analysis.content) {
                    console.log('Raw content preview:', item.analysis.content.substring(0, 200) + '...');
                }
            }
        });
    } else {
        console.error('No extraction history found');
    }
};

// Enhanced debugging for data extraction process
window.debugDataExtraction = async function() {
    console.log("🔧 [DEBUG_EXTRACTION] === Data Extraction Debug ===");
    
    if (!window.popupManager) {
        console.error("❌ PopupManager not available");
        return;
    }
    
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log("🔧 [DEBUG_EXTRACTION] Current tab:", {
            id: tab.id,
            url: tab.url,
            title: tab.title
        });
        
        // Test basic content script communication
        console.log("🔧 [DEBUG_EXTRACTION] Testing content script communication...");
        
        // Try basic ping first
        try {
            const pingResponse = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
                    resolve({
                        success: !chrome.runtime.lastError,
                        response: response,
                        error: chrome.runtime.lastError?.message
                    });
                });
            });
            console.log("🔧 [DEBUG_EXTRACTION] Ping result:", pingResponse);
        } catch (error) {
            console.error("❌ [DEBUG_EXTRACTION] Ping failed:", error);
        }
        
        // Test iframe extraction
        console.log("🔧 [DEBUG_EXTRACTION] Testing iframe extraction...");
        try {
            const iframeResponse = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: "extractContentWithIframes" }, (response) => {
                    resolve({
                        success: !chrome.runtime.lastError,
                        response: response,
                        error: chrome.runtime.lastError?.message
                    });
                });
            });
            console.log("🔧 [DEBUG_EXTRACTION] Iframe extraction result:", iframeResponse);
            
            if (iframeResponse.success && iframeResponse.response) {
                const data = iframeResponse.response.data;
                console.log("🔧 [DEBUG_EXTRACTION] Extracted data structure:", {
                    hasMainPage: !!data?.mainPage,
                    mainPageHasHtml: !!(data?.mainPage?.html),
                    mainPageHtmlLength: data?.mainPage?.html?.length || 0,
                    iframesCount: data?.iframes?.length || 0,
                    iframesWithContent: data?.iframes?.filter(iframe => iframe.content?.html).length || 0
                });
            }
        } catch (error) {
            console.error("❌ [DEBUG_EXTRACTION] Iframe extraction failed:", error);
        }
        
        // Test direct extraction as fallback
        console.log("🔧 [DEBUG_EXTRACTION] Testing direct extraction...");
        try {
            const directResult = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    return {
                        html: document.documentElement.outerHTML.substring(0, 1000), // First 1000 chars
                        title: document.title,
                        url: window.location.href,
                        bodyLength: document.body?.innerHTML?.length || 0
                    };
                }
            });
            console.log("🔧 [DEBUG_EXTRACTION] Direct extraction result:", directResult[0]?.result);
        } catch (error) {
            console.error("❌ [DEBUG_EXTRACTION] Direct extraction failed:", error);
        }
        
        // Test data extractor methods
        console.log("🔧 [DEBUG_EXTRACTION] Testing DataExtractor methods...");
        try {
            const pageContent = await window.popupManager.dataExtractor.getPageContent(tab);
            console.log("🔧 [DEBUG_EXTRACTION] DataExtractor.getPageContent result:", {
                success: !!pageContent,
                length: pageContent?.length || 0,
                preview: pageContent?.substring(0, 200) || "No content"
            });
        } catch (error) {
            console.error("❌ [DEBUG_EXTRACTION] DataExtractor.getPageContent failed:", error);
        }
        
        try {
            const iframeContents = await window.popupManager.dataExtractor.extractIframeContents(tab);
            console.log("🔧 [DEBUG_EXTRACTION] DataExtractor.extractIframeContents result:", {
                success: !!iframeContents,
                count: iframeContents?.length || 0,
                withContent: iframeContents?.filter(iframe => iframe.content).length || 0
            });
        } catch (error) {
            console.error("❌ [DEBUG_EXTRACTION] DataExtractor.extractIframeContents failed:", error);
        }
        
    } catch (error) {
        console.error("❌ [DEBUG_EXTRACTION] Debug failed:", error);
    }
};

// Force reinject content scripts
window.forceReinjectContentScripts = async function() {
    console.log("🔧 [FORCE_REINJECT] === Reinjecting Content Scripts ===");
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log("🔧 [FORCE_REINJECT] Reinjecting scripts into tab:", tab.id);
        
        // Inject scripts in correct order
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content-iframe.js"]
        });
        console.log("✅ [FORCE_REINJECT] content-iframe.js injected");
        
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["src/content-script.js"]
        });
        console.log("✅ [FORCE_REINJECT] content-script.js injected");
        
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["src/content-analyzer.js"]
        });
        console.log("✅ [FORCE_REINJECT] content-analyzer.js injected");
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test after injection
        console.log("🔧 [FORCE_REINJECT] Testing after reinject...");
        await window.debugDataExtraction();
        
    } catch (error) {
        console.error("❌ [FORCE_REINJECT] Failed:", error);
    }
};

// Simple extraction test
window.testSimpleExtraction = async function() {
    console.log("🔧 [SIMPLE_TEST] === Simple Extraction Test ===");
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Use the simplest possible extraction
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Get basic page info
                const title = document.title;
                const url = window.location.href;
                const bodyText = document.body?.innerText?.substring(0, 500) || "";
                const htmlLength = document.documentElement.outerHTML.length;
                
                return {
                    title,
                    url,
                    bodyText,
                    htmlLength,
                    hasIframes: document.querySelectorAll('iframe').length > 0,
                    iframeCount: document.querySelectorAll('iframe').length
                };
            }
        });
        
        console.log("🔧 [SIMPLE_TEST] Simple extraction result:", result[0]?.result);
        return result[0]?.result;
        
    } catch (error) {
        console.error("❌ [SIMPLE_TEST] Failed:", error);
    }
};

// Test extraction with minimal dependencies
window.testMinimalExtraction = async function() {
    console.log("🔧 [MINIMAL_TEST] === Minimal Extraction Test ===");
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log("🔧 [MINIMAL_TEST] Tab info:", { id: tab.id, url: tab.url, title: tab.title });
        
        // Test 1: Direct HTML extraction
        console.log("🔧 [MINIMAL_TEST] Test 1: Direct HTML extraction");
        try {
            const directResults = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const html = document.documentElement.outerHTML;
                    return {
                        success: true,
                        htmlLength: html.length,
                        htmlPreview: html.substring(0, 200),
                        title: document.title,
                        url: window.location.href,
                        hasBody: !!document.body,
                        bodyLength: document.body ? document.body.innerHTML.length : 0
                    };
                }
            });
            
            const directResult = directResults[0].result;
            console.log("✅ [MINIMAL_TEST] Direct extraction result:", directResult);
            
            if (directResult.htmlLength === 0) {
                console.error("❌ [MINIMAL_TEST] Direct extraction returned empty HTML!");
                return;
            }
            
        } catch (error) {
            console.error("❌ [MINIMAL_TEST] Direct extraction failed:", error);
            return;
        }
        
        // Test 2: Content script communication test
        console.log("🔧 [MINIMAL_TEST] Test 2: Content script communication");
        try {
            const pingResult = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
                    resolve({
                        success: !chrome.runtime.lastError,
                        response: response,
                        error: chrome.runtime.lastError?.message
                    });
                });
            });
            
            console.log("🔧 [MINIMAL_TEST] Ping result:", pingResult);
            
            if (!pingResult.success) {
                console.log("🔧 [MINIMAL_TEST] Content script not responding, trying to inject...");
                await window.forceReinjectContentScripts();
                
                // Test ping again after injection
                const pingResult2 = await new Promise((resolve) => {
                    chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
                        resolve({
                            success: !chrome.runtime.lastError,
                            response: response,
                            error: chrome.runtime.lastError?.message
                        });
                    });
                });
                console.log("🔧 [MINIMAL_TEST] Ping after injection:", pingResult2);
            }
            
        } catch (error) {
            console.error("❌ [MINIMAL_TEST] Content script communication failed:", error);
        }
        
        // Test 3: Use our DataExtractor
        console.log("🔧 [MINIMAL_TEST] Test 3: DataExtractor methods");
        if (window.popupManager && window.popupManager.dataExtractor) {
            try {
                const content = await window.popupManager.dataExtractor.getPageContent(tab);
                console.log("✅ [MINIMAL_TEST] DataExtractor.getPageContent:", {
                    success: !!content,
                    length: content ? content.length : 0,
                    preview: content ? content.substring(0, 200) : "No content"
                });
                
                if (!content || content.length === 0) {
                    console.error("❌ [MINIMAL_TEST] DataExtractor returned empty content!");
                }
                
            } catch (error) {
                console.error("❌ [MINIMAL_TEST] DataExtractor failed:", error);
            }
        } else {
            console.error("❌ [MINIMAL_TEST] DataExtractor not available");
        }
        
        console.log("✅ [MINIMAL_TEST] Test completed");
        
    } catch (error) {
        console.error("❌ [MINIMAL_TEST] Test failed:", error);
    }
};

// Debug data source initialization
window.debugDataSourceInit = function() {
    console.log("🔧 [DEBUG_INIT] === Data Source Initialization Debug ===");
    
    const manager = window.popupManager?.dataSourceManager;
    if (!manager) {
        console.error("❌ [DEBUG_INIT] Data source manager not available");
        return;
    }
    
    console.log("🔧 [DEBUG_INIT] Data source manager state:", {
        isConfigured: manager.isConfigured,
        currentConfig: manager.currentConfig,
        availableDataSources: manager.availableDataSources.length,
        availableSourceIds: manager.availableDataSources.map(s => s.id)
    });
    
    // Check if saved configuration matches available sources
    const savedItems = manager.currentConfig.selectedItems || [];
    const availableIds = manager.availableDataSources.map(s => s.id);
    const validItems = savedItems.filter(id => availableIds.includes(id));
    const invalidItems = savedItems.filter(id => !availableIds.includes(id));
    
    console.log("🔧 [DEBUG_INIT] Configuration validation:", {
        savedItems,
        availableIds,
        validItems,
        invalidItems,
        hasInvalidItems: invalidItems.length > 0
    });
    
    if (invalidItems.length > 0) {
        console.warn("⚠️ [DEBUG_INIT] Found invalid data source references:", invalidItems);
        console.log("🔧 [DEBUG_INIT] This will be automatically cleaned up");
    }
    
    // Force update UI
    console.log("🔧 [DEBUG_INIT] Forcing UI update...");
    manager.updateUI();
    
    // Check UI state after update
    setTimeout(() => {
        const selectedDataSourceCount = document.getElementById('selectedDataSourceCount');
        const selectedDataSourceType = document.getElementById('selectedDataSourceType');
        
        console.log("🔧 [DEBUG_INIT] UI state after update:", {
            countText: selectedDataSourceCount?.textContent,
            typeText: selectedDataSourceType?.textContent,
            isConfigured: manager.isDataSourceConfigured()
        });
    }, 100);
};

// Quick data source status check
window.checkDataSourceStatus = function() {
    console.log("🔧 [DATA_SOURCE_STATUS] === Quick Status Check ===");
    
    const manager = window.popupManager;
    const dataSourceManager = manager?.dataSourceManager;
    const resultsHandler = manager?.resultsHandler;
    
    console.log("🔧 [DATA_SOURCE_STATUS] Manager availability:", {
        popupManager: !!manager,
        dataSourceManager: !!dataSourceManager,
        resultsHandler: !!resultsHandler
    });
    
    if (resultsHandler) {
        console.log("🔧 [DATA_SOURCE_STATUS] Extraction history:", {
            historyLength: resultsHandler.extractionHistory?.length || 0,
            historyItems: resultsHandler.extractionHistory?.map(item => ({
                id: item.id,
                title: item.title,
                url: item.url,
                hasDataSources: !!item.dataSources,
                dataSourceKeys: item.dataSources ? Object.keys(item.dataSources) : []
            })) || []
        });
    }
    
    if (dataSourceManager) {
        console.log("🔧 [DATA_SOURCE_STATUS] Data source manager:", {
            availableSourcesCount: dataSourceManager.availableDataSources?.length || 0,
            isConfigured: dataSourceManager.isConfigured,
            currentConfig: dataSourceManager.currentConfig
        });
        
        // Try manual update
        console.log("🔧 [DATA_SOURCE_STATUS] Triggering manual update...");
        dataSourceManager.updateAvailableDataSources();
        
        setTimeout(() => {
            console.log("🔧 [DATA_SOURCE_STATUS] After manual update:", {
                availableSourcesCount: dataSourceManager.availableDataSources?.length || 0,
                sources: dataSourceManager.availableDataSources?.map(s => ({
                    id: s.id,
                    title: s.title,
                    type: s.type,
                    hasContent: !!(s.markdown || s.cleaned || s.raw)
                })) || []
            });
        }, 1000);
    }
};

// Force update data sources
window.forceUpdateDataSources = function() {
    console.log("🔧 [FORCE_UPDATE] === Force Updating Data Sources ===");
    
    if (window.popupManager?.dataSourceManager) {
        try {
            window.popupManager.dataSourceManager.updateAvailableDataSources();
            console.log("✅ [FORCE_UPDATE] Data sources updated");
        } catch (error) {
            console.error("❌ [FORCE_UPDATE] Failed to update data sources:", error);
        }
    } else {
        console.error("❌ [FORCE_UPDATE] DataSourceManager not available");
    }
};

// Test backend connectivity
window.testBackendConnection = async function() {
    console.log("🔧 [BACKEND_TEST] === Testing Backend Connection ===");
    
    try {
        const apiClient = window.popupManager?.apiClient;
        if (!apiClient) {
            console.error("❌ [BACKEND_TEST] API client not available");
            return;
        }
        
        // Test basic API connectivity
        console.log("🔧 [BACKEND_TEST] Testing API connectivity...");
        
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Simple test extraction
        const testPayload = {
            url: tab.url,
            title: tab.title,
            content: '<html><head><title>Test</title></head><body><h1>Test Content</h1><p>This is a test.</p></body></html>',
            model: 'gpt-4.1-nano',
            iframeContents: []
        };
        
        console.log("🔧 [BACKEND_TEST] Sending test payload:", testPayload);
        
        const response = await apiClient.makeRequest('/extension/extract-data-sources', {
            method: 'POST',
            body: JSON.stringify(testPayload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("✅ [BACKEND_TEST] Backend responded successfully:", result);
            
            // Check if data sources were generated
            if (result.success && result.dataSources) {
                console.log("✅ [BACKEND_TEST] Data sources generated:", {
                    hasRaw: !!(result.dataSources.raw && result.dataSources.raw.content),
                    hasCleaned: !!(result.dataSources.cleaned && result.dataSources.cleaned.content),
                    hasMarkdown: !!(result.dataSources.markdown && result.dataSources.markdown.content),
                    rawLength: result.dataSources.raw?.content?.length || 0,
                    cleanedLength: result.dataSources.cleaned?.content?.length || 0,
                    markdownLength: result.dataSources.markdown?.content?.length || 0
                });
                return result;
            } else {
                console.error("❌ [BACKEND_TEST] Backend returned unsuccessful result:", result);
            }
        } else {
            console.error("❌ [BACKEND_TEST] Backend request failed:", response.status, response.statusText);
        }
        
    } catch (error) {
        console.error("❌ [BACKEND_TEST] Backend test failed:", error);
    }
};

// Debug chat send button state
window.debugChatSendButton = function() {
    console.log("🔧 [CHAT_SEND_DEBUG] === Chat Send Button Debug ===");
    
    const manager = window.popupManager;
    if (!manager) {
        console.error("❌ [CHAT_SEND_DEBUG] PopupManager not available");
        return;
    }
    
    console.log("🔧 [CHAT_SEND_DEBUG] Manager components:", {
        chatHandler: !!manager.chatHandler,
        uiController: !!manager.uiController,
        dataSourceManager: !!manager.dataSourceManager
    });
    
    // Check elements
    const sendBtn = document.getElementById("sendChatBtn");
    const chatInput = document.getElementById("chatInput");
    const modelSelect = document.getElementById("globalModelSelect");
    
    console.log("🔧 [CHAT_SEND_DEBUG] Elements:", {
        sendBtn: !!sendBtn,
        sendBtnDisabled: sendBtn?.disabled,
        chatInput: !!chatInput,
        chatInputValue: chatInput?.value || 'EMPTY',
        modelSelect: !!modelSelect,
        modelSelectValue: modelSelect?.value || 'NONE',
        modelSelectDisabled: modelSelect?.disabled
    });
    
    // Check chat handler state
    if (manager.chatHandler) {
        console.log("🔧 [CHAT_SEND_DEBUG] ChatHandler state:", {
            isLoading: manager.chatHandler.isLoading,
            hasModel: !!manager.chatHandler.getSelectedModel(),
            selectedModel: manager.chatHandler.getSelectedModel(),
            elements: Object.keys(manager.chatHandler.elements)
        });
        
        // Force update
        console.log("🔧 [CHAT_SEND_DEBUG] Forcing send button state update...");
        manager.chatHandler.updateSendButtonState();
        
        // Check after update
        setTimeout(() => {
            console.log("🔧 [CHAT_SEND_DEBUG] After update - Send button disabled:", sendBtn?.disabled);
        }, 100);
    }
    
    // Test manual enable
    window.testEnableSendButton = function() {
        console.log("🔧 [CHAT_SEND_DEBUG] Manually enabling send button...");
        if (sendBtn) {
            sendBtn.disabled = false;
            console.log("✅ [CHAT_SEND_DEBUG] Send button manually enabled");
        }
    };
    
    console.log("🔧 [CHAT_SEND_DEBUG] Run 'testEnableSendButton()' to manually enable the button");
};

console.log("🚀 Modular popup script loaded successfully");
