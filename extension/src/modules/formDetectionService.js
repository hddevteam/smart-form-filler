// edge-extension/src/modules/formDetectionService.js
/**
 * Form Detection Service - Handles form detection and HTML extraction
 */

/* global chrome */

/**
 * Service for detecting forms and extracting page content
 */
class FormDetectionService {
    /**
     * Force initialization of content script
     * @param {number} tabId - Current tab ID
     * @returns {Promise<boolean>} Success status
     */
    async forceContentScriptInitialization(tabId) {
        try {
            // Execute initialization script to check current state
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                function: () => {
                    // Check if all required components are available
                    const components = {
                        FormDetector: typeof window.FormDetector !== "undefined",
                        FormFiller: typeof window.FormFiller !== "undefined",
                        iframeExtractor: typeof window.iframeExtractor !== "undefined"
                    };
                    
                    console.log("🔍 Content script components check:", components);
                    
                    // If FormDetector is missing, we need full initialization
                    if (!components.FormDetector) {
                        console.log("⚠️ FormDetector not found, need to inject all scripts");
                        return { 
                            initialized: false, 
                            reason: "FormDetector not found",
                            components: components
                        };
                    }
                    
                    // If iframe extractor is missing, content-iframe.js needs injection
                    if (!components.iframeExtractor) {
                        console.log("⚠️ Iframe extractor not found, need to inject content scripts");
                        return { 
                            initialized: false, 
                            reason: "Iframe extractor not found",
                            components: components
                        };
                    }
                    
                    console.log("✅ All required components are available");
                    window.__formDetectorInitialized = true;
                    return { initialized: true, components: components };
                }
            });
            
            // Check if initialization was successful
            if (results && results[0] && results[0].result && results[0].result.initialized) {
                console.log("✅ Content script initialization confirmed via executeScript");
                return true;
            } else {
                const result = results && results[0] && results[0].result;
                console.log("⚠️ Content script initialization needed. Reason:", 
                    result ? result.reason : "Unknown");
                console.log("📋 Component status:", result ? result.components : "Unknown");
                return false;
            }
        } catch (error) {
            console.error("❌ Force initialization failed:", error);
            return false;
        }
    }

    /**
     * Ensure content scripts are loaded
     * @param {number} tabId - Current tab ID
     */
    async ensureContentScriptsLoaded(tabId) {
        try {
            console.log("🔄 Injecting all required content scripts...");
            
            // Define all required scripts in dependency order
            const requiredScripts = [
                "src/modules/formDetector.js",
                "src/modules/formFiller.js", 
                "content-iframe.js",
                "src/content-script.js"
            ];
            
            // Inject scripts one by one to ensure proper loading order
            for (const scriptPath of requiredScripts) {
                try {
                    console.log(`🔄 Injecting ${scriptPath}...`);
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        files: [scriptPath]
                    });
                    console.log(`✅ Successfully injected ${scriptPath}`);
                } catch (scriptError) {
                    console.error(`❌ Error injecting ${scriptPath}:`, scriptError);
                    // For form detector and filler, this is critical
                    if (scriptPath.includes("formDetector") || scriptPath.includes("formFiller")) {
                        return false;
                    }
                    // For other scripts, continue but log the error
                    console.warn(`⚠️ Non-critical script ${scriptPath} failed to inject, continuing...`);
                }
            }
            
            // Verify scripts loaded correctly by checking required global objects
            const verificationResult = await chrome.scripting.executeScript({
                target: { tabId },
                function: () => {
                    const results = {
                        FormDetector: typeof window.FormDetector !== "undefined",
                        FormFiller: typeof window.FormFiller !== "undefined",
                        iframeExtractor: typeof window.iframeExtractor !== "undefined",
                        contentScriptLoaded: typeof window.contentScriptLoaded !== "undefined"
                    };
                    
                    console.log("🔍 Script verification results:", results);
                    
                    // FormDetector is critical
                    if (!results.FormDetector) {
                        console.error("❌ FormDetector still not available after script injection");
                        return { 
                            success: false, 
                            error: "FormDetector not defined after injection",
                            results: results
                        };
                    }
                    
                    console.log("✅ Critical scripts successfully loaded");
                    return { success: true, results: results };
                }
            });
            
            const verification = verificationResult && verificationResult[0] && verificationResult[0].result;
            
            if (!verification || !verification.success) {
                console.error("❌ Script verification failed:", verification);
                return false;
            }
            
            console.log("✅ All content scripts successfully loaded and verified");
            return true;
        } catch (error) {
            console.error("❌ Content script injection failed:", error);
            return false;
        }
    }

    /**
     * Detect forms on the current page
     * @param {function} setLoading - Loading state callback
     * @param {function} showInfo - Info message callback
     * @param {function} showError - Error message callback
     * @returns {Promise<Object>} Detection results
     */
    async detectForms(setLoading, showInfo, showError) {
        console.log("🔍 Starting form detection...");
        
        try {
            // Show loading state with informative message
            setLoading(true);
            showInfo("Initializing form detection scripts...");
            
            // Use content script to detect forms
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]) {
                throw new Error("No active tab found");
            }

            // First, try force initialization
            console.log("🔧 Attempting force initialization...");
            const initSuccess = await this.forceContentScriptInitialization(tabs[0].id);
            
            if (!initSuccess) {
                console.log("⚠️ Force initialization failed, trying standard approach...");
                showInfo("Retrying script initialization...");
                // Fallback to standard injection
                const injectionSuccess = await this.ensureContentScriptsLoaded(tabs[0].id);
                
                if (!injectionSuccess) {
                    throw new Error("Failed to initialize content scripts. Please refresh the page and try again.");
                }
                
                // Wait a moment for scripts to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Verify one more time
                const finalCheck = await this.forceContentScriptInitialization(tabs[0].id);
                if (!finalCheck) {
                    throw new Error("Content scripts failed to load properly. Please refresh the page and try again.");
                }
            }
            
            showInfo("Detecting forms on page...");
            
            // Execute form detection with additional logging
            console.log("📨 Sending 'detectForms' message to content script...");
            try {
                const results = await chrome.tabs.sendMessage(tabs[0].id, {
                    action: "detectForms"
                });
                
                console.log("📨 Received response from 'detectForms':", results);
                
                if (!results || !results.success) {
                    const errorMsg = results?.error || "Form detection failed";
                    console.error("❌ Form detection error:", errorMsg);
                    throw new Error(errorMsg);
                }
                
                console.log("✅ Form detection successful:", results);
                return results;
            } catch (msgError) {
                console.error("❌ Message error:", msgError);
                
                // Provide more specific error
                if (msgError.message.includes("Could not establish connection")) {
                    throw new Error("Could not connect to page. Please refresh the page and try again.");
                } else {
                    throw msgError;
                }
            }
        } catch (error) {
            console.error("❌ Form detection error:", error);
            showError("Form detection failed: " + error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    }

    /**
     * Extract page HTML with iframes
     * @param {number} tabId - Current tab ID
     * @returns {Promise<string>} Extracted HTML
     */
    async extractPageHtml(tabId) {
        try {
            console.log("📄 Extracting page HTML for enhanced analysis...");
            
            // Ensure iframe extractor is available
            try {
                const testResponse = await chrome.tabs.sendMessage(tabId, { action: "ping" });
                if (!testResponse || !testResponse.success) {
                    console.warn("⚠️ Content script not responding, attempting reinitialization...");
                    await this.forceContentScriptInitialization(tabId);
                }
            } catch (error) {
                console.warn("⚠️ Content script test failed, attempting reinitialization...");
                await this.forceContentScriptInitialization(tabId);
            }
            
            // Add timeout wrapper for content script message
            const htmlResponse = await this._extractHtmlWithTimeout(tabId);
            
            if (htmlResponse && htmlResponse.success && htmlResponse.data) {
                // Merge main page and iframe HTML
                let pageHtml = htmlResponse.data.mainPage?.html || "";
                
                // Add iframe content if available (including nested iframes)
                if (htmlResponse.data.iframes && htmlResponse.data.iframes.length > 0) {
                    // Priority: forms-containing iframes first
                    const iframesWithForms = htmlResponse.data.iframes.filter(iframe => 
                        iframe.hasFormsCount && iframe.hasFormsCount > 0
                    );
                    const iframesWithoutForms = htmlResponse.data.iframes.filter(iframe => 
                        !iframe.hasFormsCount || iframe.hasFormsCount === 0
                    );
                    
                    // Process form-containing iframes first
                    [...iframesWithForms, ...iframesWithoutForms].forEach((iframe, index) => {
                        if (iframe.content && iframe.content.html) {
                            const iframePath = iframe.indexPath || index;
                            const depth = iframe.depth || 0;
                            const formsInfo = iframe.hasFormsCount ? ` [${iframe.hasFormsCount} forms]` : "";
                            const iframeLabel = `IFRAME ${iframePath} (depth:${depth})${formsInfo}`;
                            
                            pageHtml += `\n<!-- ${iframeLabel} CONTENT -->\n${iframe.content.html}\n<!-- END ${iframeLabel} -->\n`;
                        }
                    });
                }
                
                return pageHtml;
            }
            
            throw new Error("Invalid HTML extraction response");
        } catch (error) {
            console.log("⚠️ Enhanced HTML extraction failed, using basic approach:", error.message);
            
            try {
                const basicHtml = await chrome.scripting.executeScript({
                    target: { tabId },
                    function: () => document.documentElement.outerHTML
                });
                return basicHtml[0]?.result || "";
            } catch (basicError) {
                console.error("❌ Basic HTML extraction also failed:", basicError);
                return "";
            }
        }
    }
    
    /**
     * Extract HTML with timeout
     * @param {number} tabId - Current tab ID
     * @returns {Promise<Object>} HTML response
     * @private
     */
    _extractHtmlWithTimeout(tabId) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("HTML extraction timeout after 5 seconds"));
            }, 5000);

            // Send message to content script
            chrome.tabs.sendMessage(tabId, {
                action: "extractContentWithIframes"
            }).then(htmlResponse => {
                clearTimeout(timeout);
                resolve(htmlResponse);
            }).catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
        });
    }
    
    /**
     * Fill forms with mapped data
     * @param {Array} mappings - Field mappings
     * @returns {Promise<Object>} Fill results
     */
    async fillForms(mappings) {
        try {
            // Use content script to fill forms
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]) {
                throw new Error("No active tab found");
            }

            const results = await chrome.tabs.sendMessage(tabs[0].id, {
                action: "fillForms",
                mappings: mappings,
                options: {
                    backup: true,
                    validate: true,
                    highlight: true
                }
            });

            if (!results || !results.success) {
                throw new Error(results?.error || "Form filling failed");
            }

            return results;
        } catch (error) {
            console.error("❌ Form filling error:", error);
            throw error;
        }
    }
}

// Make FormDetectionService available globally
window.FormDetectionService = FormDetectionService;
