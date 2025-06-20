/* global chrome, AuthManager, ApiClient, DataExtractor, ResultsHandler, ChatHandler, CopyHandler, UIController, FormFillerHandler, PopupManager, PopupInitializer, PopupEventHandlers, PopupModelManager, PopupSettingsManager */
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
        
        console.log("✅ Popup application initialized successfully");
        
    } catch (error) {
        console.error("❌ Failed to initialize popup application:", error);
        showInitializationError(error);
    }
}

/**
 * Show initialization error to user
 */
function showInitializationError(error) {
    document.body.innerHTML = `
        <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
            <h3>Initialization Error</h3>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Extension files are corrupted or missing</li>
                <li>DOM elements are missing from popup.html</li>
                <li>JavaScript modules failed to load</li>
                <li>Backend service is unavailable</li>
            </ul>
            <p><strong>Try:</strong></p>
            <ul>
                <li>Reloading the extension</li>
                <li>Closing and reopening the popup</li>
                <li>Checking backend configuration</li>
                <li>Reinstalling the extension</li>
            </ul>
            <button onclick="location.reload()" style="padding: 8px 16px; margin-top: 10px;">
                Reload Popup
            </button>
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

// Handle popup cleanup
window.addEventListener("beforeunload", handlePopupUnload);
window.addEventListener("unload", handlePopupUnload);

console.log("🚀 Modular popup script loaded successfully");
