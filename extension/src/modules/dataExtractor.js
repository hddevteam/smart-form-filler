// modules/dataExtractor.js
/* global chrome */
/**
 * Data Extraction Module
 * Handles all data extraction functionality including iframe processing
 */

class DataExtractor {
    constructor() {
        console.log("🔧 DataExtractor initialized");
    }

    /**
     * Get page content with iframe support
     * IMPORTANT: This should return ONLY the main page HTML, not merged with iframe content
     * The backend will handle iframe merging to avoid double-merging
     */
    async getPageContent(tab) {
        return new Promise((resolve, reject) => {
            // Get iframe-aware extraction but return ONLY the main page content
            chrome.tabs.sendMessage(tab.id, { action: "extractContentWithIframes" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Content script not available, falling back to direct extraction:", chrome.runtime.lastError.message);
                    this.getPageContentDirect(tab).then(resolve).catch(reject);
                } else if (response && response.success && response.data) {
                    // CRITICAL FIX: Return ONLY the main page HTML, not merged content
                    // The backend will handle iframe merging to avoid double-merging
                    const mainPageHtml = response.data.mainPage?.html || "";
                    
                    // Validate that we actually got content
                    if (!mainPageHtml || mainPageHtml.trim().length === 0) {
                        console.warn("Content script returned empty content, falling back to direct extraction");
                        this.getPageContentDirect(tab).then(resolve).catch(reject);
                    } else {
                        console.log(`✅ Content script extraction successful: ${mainPageHtml.length} characters`);
                        resolve(mainPageHtml);
                    }
                } else {
                    console.warn("Content script extraction failed, falling back to direct extraction");
                    this.getPageContentDirect(tab).then(resolve).catch(reject);
                }
            });
        });
    }

    /**
     * Direct page content extraction (fallback)
     */
    async getPageContentDirect(tab) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    return {
                        html: document.documentElement.outerHTML,
                        title: document.title,
                        url: window.location.href,
                        bodyLength: document.body ? document.body.innerHTML.length : 0
                    };
                }
            });
            
            const result = results[0].result;
            const html = result.html;
            
            // Validate that we got valid HTML content
            if (!html || html.trim().length === 0) {
                throw new Error("Page returned empty HTML content");
            }
            
            // Basic HTML validation - should at least have html tags
            if (!html.includes('<html') && !html.includes('<body')) {
                throw new Error("Page content does not appear to be valid HTML");
            }
            
            console.log(`✅ Direct extraction successful: ${html.length} characters (body: ${result.bodyLength} chars)`);
            return html;
            
        } catch (error) {
            console.error("Direct content extraction failed:", error);
            throw new Error("Failed to extract page content: " + error.message);
        }
    }

    /**
     * Extract iframe contents for processing
     */
    async extractIframeContents(tab) {
        try {
            console.log("🔧 Extracting iframe contents...");
            
            // First, ensure content script is ready
            const isReady = await this.waitForContentScript(tab);
            
            if (!isReady) {
                console.log("🔧 Content script not ready, returning empty array");
                return [];
            }
            
            return new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: "extractContentWithIframes" }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log("🔧 No iframe extraction available, returning empty array");
                        resolve([]);
                        return;
                    }

                    const iframeContents = [];
                    if (response.data && response.data.iframes) {
                        response.data.iframes.forEach((iframe, index) => {
                            // Include ALL iframes that have any content, not just "accessible" ones
                            // The content-iframe.js already determined what content is available
                            const hasContent = iframe.content && iframe.content.html && iframe.content.html.length > 0;
                            
                            const iframeData = {
                                index: iframe.indexPath || index, // Use indexPath for nested iframes
                                src: iframe.src || `iframe-${index}`,
                                content: hasContent ? iframe.content.html : "",
                                metadata: {
                                    indexPath: iframe.indexPath,
                                    depth: iframe.depth || 0,
                                    accessible: hasContent, // Mark as accessible if it has content
                                    originalAccessible: iframe.accessible,
                                    title: iframe.content?.title || "",
                                    url: iframe.content?.url || "",
                                    domain: iframe.content?.domain || ""
                                }
                            };
                            
                            if (!hasContent) {
                                iframeData.metadata.error = iframe.error || "No content available";
                            }
                            
                            iframeContents.push(iframeData);
                        });
                    }

                    console.log(`🔧 Extracted ${iframeContents.length} iframe contents`);
                    resolve(iframeContents);
                });
            });
            
        } catch (error) {
            console.error("Error extracting iframe contents:", error);
            return [];
        }
    }

    /**
     * Wait for content script to be ready with retry mechanism
     */
    async waitForContentScript(tab, maxRetries = 3, retryDelay = 500) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const isReady = await new Promise((resolve) => {
                    chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
                        if (chrome.runtime.lastError) {
                            resolve(false);
                        } else if (response && response.success) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    });
                });
                
                if (isReady) {
                    return true;
                }
                
                // If first attempt failed, try to re-inject content script
                if (attempt === 1) {
                    console.log("🔧 Content script not found, attempting re-injection...");
                    await this.reinjectContentScript(tab);
                }
                
                // Wait before next attempt
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
                
            } catch (error) {
                console.log(`🔧 Attempt ${attempt} failed:`, error);
            }
        }
        
        return false;
    }

    /**
     * Re-inject content script into the page
     */
    async reinjectContentScript(tab) {
        try {
            // Inject the content scripts in order
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content-iframe.js"]
            });
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["src/content-script.js"]
            });
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["src/content-analyzer.js"]
            });
            
            // Wait a moment for scripts to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error("❌ Failed to re-inject content scripts:", error);
        }
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = DataExtractor;
}
