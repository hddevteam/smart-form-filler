// content-iframe.js - Enhanced content script for iframe extraction
/* global chrome */
/**
 * Enhanced content script that can extract content from main page and iframes
 */

// Avoid redefinition and ensure proper cleanup
if (window.iframeExtractor) {
    console.log("🔄 Iframe extractor already exists, cleaning up...");
    // Remove existing listeners if any
    if (window.iframeExtractorCleanup) {
        window.iframeExtractorCleanup();
    }
}

class IframeContentExtractor {
    constructor() {
        this.extractedData = {
            mainPage: null,
            iframes: []
        };
    }

    /**
     * Extract content from main page and all accessible iframes (including nested)
     */
    async extractAllContent() {
        try {
            console.log("🖼️ Starting iframe-aware content extraction...");
            
            // IMPORTANT: Reset extracted data to prevent accumulation from previous extractions
            this.extractedData = {
                mainPage: null,
                iframes: []
            };
            console.log("🧹 Reset extraction data - preventing accumulation");
            
            // Extract main page content from current document state
            this.extractedData.mainPage = this.extractPageContent(document);
            console.log("🌐 Main page content extracted");
            
            // Find and process all iframes recursively
            await this.extractIframesRecursively(document, "", 0);
            
            console.log(`✅ Content extraction completed: ${this.extractedData.iframes.length} total iframes processed`);
            
            // ADDED: Log unique iframe paths to verify no duplicates
            const uniquePaths = [...new Set(this.extractedData.iframes.map(iframe => iframe.indexPath))];
            if (uniquePaths.length !== this.extractedData.iframes.length) {
                console.warn(`⚠️ Duplicate iframe paths detected! Total: ${this.extractedData.iframes.length}, Unique: ${uniquePaths.length}`);
                console.log("📋 All paths:", this.extractedData.iframes.map(i => i.indexPath));
            } else {
                console.log(`✅ All iframe paths are unique: ${uniquePaths.length} paths`);
            }
            
            return this.extractedData;
        } catch (error) {
            console.error("❌ Error extracting content:", error);
            return null;
        }
    }

    /**
     * Recursively extract content from all nested iframes
     * FIXED: Extract iframes sequentially and avoid duplication
     */
    async extractIframesRecursively(doc, parentPath = "", depth = 0) {
        const maxDepth = 5; // Prevent infinite recursion
        if (depth > maxDepth) {
            console.warn(`⚠️ Maximum iframe nesting depth (${maxDepth}) reached, stopping recursion`);
            return;
        }

        const iframes = doc.querySelectorAll("iframe");
        
        // Only log detailed info for main page iframes to reduce noise
        if (depth === 0) {
            console.log(`🔍 Found ${iframes.length} top-level iframes`);
        } else if (iframes.length > 0) {
            console.log(`🔄 Found ${iframes.length} nested iframes at depth ${depth}`);
        }
        
        // FIXED: Track processed iframes to avoid duplication
        const processedIframes = [];
        
        for (let i = 0; i < iframes.length; i++) {
            const iframe = iframes[i];
            const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;
            
            // FIXED: Check if we've already processed this iframe path
            const existingIframe = this.extractedData.iframes.find(existing => existing.indexPath === currentPath);
            if (existingIframe) {
                console.log(`⚠️ Skipping duplicate iframe processing: ${currentPath}`);
                continue;
            }
            
            const iframeData = await this.extractIframeContent(iframe, currentPath, depth);
            
            if (iframeData) {
                // FIXED: Only add if not already present
                this.extractedData.iframes.push(iframeData);
                processedIframes.push(iframeData);
                
                // If iframe is accessible and has content, recursively search for nested iframes
                if (iframeData.accessible && iframeData.content && !iframeData.error) {
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            // FIXED: Pass current path and continue recursion
                            await this.extractIframesRecursively(iframeDoc, currentPath, depth + 1);
                        }
                    } catch (error) {
                        // Only log if this is important (forms detected)
                        if (iframeData.hasFormsCount > 0) {
                            console.log(`⚠️ Cannot access nested content in iframe ${currentPath} (${iframeData.hasFormsCount} forms detected): ${error.message}`);
                        }
                    }
                }
            }
        }
        
        // FIXED: Log processed count for this level
        if (processedIframes.length > 0) {
            console.log(`✅ Processed ${processedIframes.length} new iframes at depth ${depth}`);
        }
    }

    /**
     * Extract content from a specific iframe
     */
    async extractIframeContent(iframe, indexPath, depth = 0) {
        try {
            const iframeInfo = {
                indexPath: indexPath,
                depth: depth,
                src: iframe.src || "about:blank",
                id: iframe.id || "",
                className: iframe.className || "",
                title: iframe.title || "",
                width: iframe.width || iframe.style.width || "",
                height: iframe.height || iframe.style.height || "",
                accessible: false,
                content: null,
                error: null,
                retryCount: 0,
                hasNestedIframes: false
            };

            // Only log detailed info for top-level iframes or those with forms to reduce noise
            const shouldLogDetails = depth === 0 || iframe.src.includes("form") || iframe.id.includes("form");
            
            // REDUCED: Only log processing for important iframes or in debug mode
            if (shouldLogDetails && (depth === 0 || iframeInfo.src.includes("form"))) {
                console.log(`🔍 Processing iframe ${indexPath} (depth ${depth})`);
            }

            // Skip obviously problematic iframes
            if (this.shouldSkipIframe(iframe)) {
                iframeInfo.error = "Iframe skipped - likely external or problematic";
                if (shouldLogDetails) {
                    console.log(`⏭️ Skipping iframe ${indexPath}: ${iframeInfo.error}`);
                }
                return iframeInfo;
            }

            // Check if iframe is same-origin and accessible
            if (this.isIframeAccessible(iframe)) {
                try {
                    // Wait for iframe to load if necessary (with shorter timeout for performance)
                    await this.waitForIframeLoad(iframe, 3000); // Reduced to 3 seconds
                    
                    // Extract content from iframe document
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const extractedContent = this.extractPageContent(iframeDoc);
                    
                    // Check if this iframe contains nested iframes and forms
                    const nestedIframes = iframeDoc.querySelectorAll("iframe");
                    const forms = iframeDoc.querySelectorAll("form");
                    iframeInfo.hasNestedIframes = nestedIframes.length > 0;
                    iframeInfo.hasFormsCount = forms.length;
                    
                    // ENHANCED: Lower threshold for iframes with forms - they are important for form filling
                    const minLength = forms.length > 0 ? 10 : 50; // Much lower threshold for form-containing iframes
                    
                    // Set accessible to true AND include content if extraction was successful
                    if (extractedContent && extractedContent.html && extractedContent.html.length > minLength) {
                        iframeInfo.accessible = true;
                        iframeInfo.content = extractedContent;
                        
                        // REDUCED: Only log success for forms or depth 0 iframes
                        if (forms.length > 0) {
                            console.log(`✅ Extracted iframe ${indexPath}: ${forms.length} forms found`);
                        } else if (depth === 0) {
                            console.log(`✅ Extracted iframe ${indexPath}: ${extractedContent.html.length} chars`);
                        }
                    } else {
                        // Even if iframe is technically accessible, mark as inaccessible if no meaningful content
                        iframeInfo.accessible = false;
                        iframeInfo.error = `Insufficient content (${extractedContent?.html?.length || 0} chars, ${forms.length} forms)`;
                        
                        // Only log if this iframe has forms (potentially important)
                        if (forms.length > 0 || shouldLogDetails) {
                            console.log(`⚠️ Iframe ${indexPath}: ${iframeInfo.error}`);
                        }
                    }
                } catch (contentError) {
                    iframeInfo.accessible = false;
                    iframeInfo.error = `Content extraction failed: ${contentError.message}`;
                    
                    // Only log extraction errors for potentially important iframes
                    if (shouldLogDetails) {
                        console.log(`❌ Iframe ${indexPath} extraction error:`, contentError.message);
                    }
                }
            } else {
                iframeInfo.error = "Cross-origin iframe - cannot access content";
                // Reduced logging for cross-origin iframes
                if (shouldLogDetails) {
                    console.log(`⚠️ Iframe ${indexPath} is cross-origin`);
                }
            }
            
            return iframeInfo;
        } catch (error) {
            console.error(`❌ Error processing iframe ${indexPath}:`, error.message);
            return {
                indexPath: indexPath,
                depth: depth,
                src: iframe.src || "unknown",
                accessible: false,
                error: error.message,
                retryCount: 0,
                hasNestedIframes: false
            };
        }
    }

    /**
     * Check if iframe should be skipped based on src or attributes
     */
    shouldSkipIframe(iframe) {
        const src = iframe.src || "";
        
        // Skip empty or javascript iframes
        if (!src || src === "about:blank" || src.startsWith("javascript:")) {
            return true;
        }
        
        // Skip obviously external domains (common ad/tracking iframes)
        const skipDomains = [
            "google.com", "googletagmanager.com", "doubleclick.net",
            "facebook.com", "twitter.com", "youtube.com",
            "analytics.google.com", "googleadservices.com"
        ];
        
        return skipDomains.some(domain => src.includes(domain));
    }

    /**
     * Check if iframe is accessible (same-origin)
     */
    isIframeAccessible(iframe) {
        try {
            // Attempt to access iframe document
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            if (doc) {
                // Try to access a property to test for cross-origin restrictions
                const title = doc.title; // eslint-disable-line no-unused-vars
                return true;
            }
            return false;
        } catch (error) {
            // Cross-origin or other access restrictions
            return false;
        }
    }

    /**
     * Wait for iframe to fully load
     */
    waitForIframeLoad(iframe, timeout = 3000) {
        return new Promise((resolve) => {
            if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
                resolve();
                return;
            }

            const timeoutId = setTimeout(() => {
                // Reduced logging - only log timeout for debugging
                resolve(); // Don't reject, just continue with current state
            }, timeout);

            const cleanup = () => {
                clearTimeout(timeoutId);
                iframe.removeEventListener("load", onLoad);
                iframe.removeEventListener("error", onError);
            };

            const onLoad = () => {
                cleanup();
                // Removed success logging to reduce noise
                resolve();
            };

            const onError = () => {
                cleanup();
                // Only log errors if needed for debugging
                resolve(); // Don't reject, just continue
            };

            iframe.addEventListener("load", onLoad);
            iframe.addEventListener("error", onError);
        });
    }

    /**
     * Extract content from a document (main page or iframe)
     */
    extractPageContent(doc) {
        const content = {
            html: doc.documentElement.outerHTML,
            title: doc.title,
            url: doc.URL || doc.location?.href || "",
            domain: this.extractDomain(doc.URL || doc.location?.href || ""),
            tables: [],
            forms: [],
            lists: [],
            links: [],
            images: [],
            metadata: {}
        };

        // Extract tables
        const tables = doc.querySelectorAll("table");
        tables.forEach((table, index) => {
            content.tables.push({
                index: index,
                html: table.outerHTML,
                rows: table.rows.length,
                cols: table.rows[0]?.cells.length || 0,
                id: table.id || "",
                className: table.className || "",
                summary: table.summary || ""
            });
        });

        // Extract forms
        const forms = doc.querySelectorAll("form");
        forms.forEach((form, index) => {
            const inputs = form.querySelectorAll("input, select, textarea");
            const inputData = Array.from(inputs).map(input => ({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || "",
                id: input.id || "",
                placeholder: input.placeholder || "",
                value: input.value || ""
            }));
            
            content.forms.push({
                index: index,
                action: form.action || "",
                method: form.method || "get",
                inputs: inputData,
                inputCount: inputs.length,
                html: form.outerHTML
            });
        });

        // Extract lists
        const lists = doc.querySelectorAll("ul, ol");
        lists.forEach((list, index) => {
            const items = Array.from(list.children).map(item => item.textContent.trim());
            content.lists.push({
                index: index,
                type: list.tagName.toLowerCase(),
                items: items,
                itemCount: list.children.length,
                html: list.outerHTML
            });
        });

        // Extract links
        const links = doc.querySelectorAll("a[href]");
        Array.from(links).slice(0, 20).forEach((link, index) => { // Limit to first 20 links
            content.links.push({
                index: index,
                href: link.href,
                text: link.textContent.trim(),
                title: link.title || ""
            });
        });

        // Extract images
        const images = doc.querySelectorAll("img[src]");
        Array.from(images).slice(0, 10).forEach((img, index) => { // Limit to first 10 images
            content.images.push({
                index: index,
                src: img.src,
                alt: img.alt || "",
                title: img.title || "",
                width: img.width || "",
                height: img.height || ""
            });
        });

        // Basic metadata
        content.metadata = {
            elementCount: doc.querySelectorAll("*").length,
            hasJavaScript: doc.querySelectorAll("script").length > 0,
            hasCss: doc.querySelectorAll("style, link[rel='stylesheet']").length > 0,
            charset: doc.characterSet || "",
            lang: doc.documentElement.lang || "",
            viewport: this.getMetaContent(doc, "viewport"),
            description: this.getMetaContent(doc, "description"),
            keywords: this.getMetaContent(doc, "keywords")
        };

        return content;
    }

    /**
     * Extract domain from URL
     */
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return "";
        }
    }

    /**
     * Get meta tag content
     */
    getMetaContent(doc, name) {
        const meta = doc.querySelector(`meta[name="${name}"]`) || doc.querySelector(`meta[property="${name}"]`);
        return meta ? meta.content : "";
    }

    /**
     * Generate detailed extraction report for debugging
     */
    generateExtractionReport() {
        const report = {
            summary: {
                totalIframes: this.extractedData.iframes.length,
                accessibleIframes: this.extractedData.iframes.filter(iframe => iframe.accessible).length,
                iframesWithContent: this.extractedData.iframes.filter(iframe => iframe.content).length,
                maxDepth: Math.max(...this.extractedData.iframes.map(iframe => iframe.depth || 0)),
                crossOriginIframes: this.extractedData.iframes.filter(iframe => iframe.error && iframe.error.includes("Cross-origin")).length
            },
            iframeTree: this.buildIframeTree(),
            detailedReport: this.extractedData.iframes.map(iframe => ({
                path: iframe.indexPath,
                depth: iframe.depth,
                src: iframe.src,
                accessible: iframe.accessible,
                hasContent: !!iframe.content,
                hasNestedIframes: iframe.hasNestedIframes,
                error: iframe.error,
                contentLength: iframe.content ? iframe.content.html.length : 0
            }))
        };
        
        return report;
    }

    /**
     * Build a tree structure representation of iframes
     */
    buildIframeTree() {
        const tree = {};
        
        this.extractedData.iframes.forEach(iframe => {
            const pathParts = iframe.indexPath.split(".");
            let current = tree;
            
            pathParts.forEach((part, index) => {
                if (!current[part]) {
                    current[part] = {
                        info: index === pathParts.length - 1 ? iframe : null,
                        children: {}
                    };
                }
                current = current[part].children;
            });
        });
        
        return tree;
    }

    /**
     * Enhanced logging for iframe processing
     */
    logIframeProcessing(phase, details) {
        const timestamp = new Date().toISOString();
        console.log(`🔍 [${timestamp}] ${phase}:`, details);
    }
}

// Initialize the extractor with proper cleanup support
if (window.iframeExtractor) {
    console.log("🔄 Iframe extractor already exists, cleaning up and reinitializing...");
    // Clean up existing listeners
    if (window.iframeExtractorCleanup) {
        window.iframeExtractorCleanup();
    }
    // Force cleanup the old instance
    delete window.iframeExtractor;
}

// Create new fresh instance
window.iframeExtractor = new IframeContentExtractor();
console.log("🚀 Iframe-aware content script loaded and ready (fresh instance)");

// Create message listener with cleanup support
let messageListener;

// Cleanup function for removing listeners
window.iframeExtractorCleanup = () => {
    if (messageListener) {
        chrome.runtime.onMessage.removeListener(messageListener);
        console.log("🧹 Cleaned up iframe extractor message listener");
    }
};

// Create and register the message listener
messageListener = (request, sender, sendResponse) => {
    console.log("📨 Content script received message:", request.action);
    
    if (request.action === "extractContentWithIframes") {
        console.log("🖼️ Starting iframe-aware extraction...");
        
        window.iframeExtractor.extractAllContent()
            .then(data => {
                console.log("✅ Iframe extraction completed:", data);
                
                // Log final data sizes
                const mainSize = data?.mainPage?.html?.length || 0;
                let totalIframeSize = 0;
                data?.iframes?.forEach(iframe => {
                    if (iframe.content && iframe.content.html) {
                        totalIframeSize += iframe.content.html.length;
                    }
                });
                console.log(`📊 Final data sizes - Main: ${mainSize}, Iframes: ${totalIframeSize}, Total: ${mainSize + totalIframeSize}`);
                
                sendResponse({ 
                    success: true, 
                    data: data
                });
            })
            .catch(error => {
                console.error("❌ Iframe extraction failed:", error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Indicates we will send a response asynchronously
    }
    
    // Handle regular content extraction (existing functionality)
    if (request.action === "extractContent") {
        console.log("🌐 Starting regular content extraction...");
        try {
            const mainContent = window.iframeExtractor.extractPageContent(document);
            console.log("✅ Regular extraction completed");
            sendResponse({ success: true, content: mainContent });
        } catch (error) {
            console.error("❌ Regular extraction failed:", error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
    
    // Handle HTML extraction (legacy support)
    if (request.action === "extractHTML") {
        console.log("🌐 Starting HTML extraction...");
        try {
            const htmlContent = {
                html: document.documentElement.outerHTML,
                title: document.title,
                url: window.location.href
            };
            console.log("✅ HTML extraction completed");
            sendResponse({ success: true, content: htmlContent });
        } catch (error) {
            console.error("❌ HTML extraction failed:", error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }

    // Test connectivity
    if (request.action === "ping") {
        console.log("🏓 Ping received");
        sendResponse({ success: true, message: "Content script is active" });
        return true;
    }
};

// Register the message listener
chrome.runtime.onMessage.addListener(messageListener);
