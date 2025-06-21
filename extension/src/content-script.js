/* global chrome, FormDetector, FormFiller */
// content-script.js - Basic content extraction functionality
(function() {
    "use strict";

    // Basic content extraction utility
    class BasicContentExtractor {
        constructor() {
            this.setupMessageListener();
        }

        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                // Add ping handler for debugging
                if (request.action === "ping") {
                    sendResponse({ 
                        success: true, 
                        message: "pong",
                        timestamp: new Date().toISOString(),
                        location: window.location.href
                    });
                    return true;
                }
                
                if (request.action === "extractContent") {
                    try {
                        const content = this.extractPageContent();
                        sendResponse({ success: true, content: content });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                } else if (request.action === "extractHTML") {
                    try {
                        const htmlContent = this.extractPageHTML();
                        sendResponse({ success: true, content: htmlContent });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
                } else if (request.action === "checkFormDetector") {
                    // Check if FormDetector is available
                    const formDetectorAvailable = typeof window.FormDetector !== "undefined";
                    const formFillerAvailable = typeof window.FormFiller !== "undefined";
                    sendResponse({ 
                        success: true, 
                        formDetectorAvailable: formDetectorAvailable,
                        formFillerAvailable: formFillerAvailable,
                        timestamp: new Date().toISOString()
                    });
                } else if (request.action === "detectForms") {
                    console.log("📥 Received 'detectForms' request in content script");
                    try {
                        // Check if FormDetector is available
                        if (typeof window.FormDetector === "undefined") {
                            console.error("❌ FormDetector is not defined in window object");
                            // Log available global objects for debugging
                            console.log("📋 Available global variables:", Object.keys(window).filter(key => 
                                key.includes("Form") || key.includes("form")).join(", "));
                            throw new Error("FormDetector not loaded. Please refresh the page and try again.");
                        }
                        
                        console.log("✅ FormDetector found, creating instance and detecting forms...");
                        const formDetector = new FormDetector();
                        const results = formDetector.detectForms();
                        console.log("✅ Form detection results:", results);
                        sendResponse({ success: true, ...results });
                    } catch (error) {
                        console.error("❌ Form detection error:", error);
                        sendResponse({ success: false, error: error.message });
                    }
                } else if (request.action === "fillForms") {
                    try {
                        // Check if FormFiller is available
                        if (typeof window.FormFiller === "undefined") {
                            throw new Error("FormFiller not loaded. Please refresh the page and try again.");
                        }
                        
                        const formFiller = new FormFiller();
                        const results = formFiller.fillFormFields(request.mappings);
                        sendResponse({ success: true, ...results });
                    } catch (error) {
                        console.error("❌ Form filling error:", error);
                        sendResponse({ success: false, error: error.message });
                    }
                } else if (request.action === "ping") {
                    sendResponse({ success: true, message: "Content script loaded" });
                }
                return true; // Keep the message channel open for async response
            });
        }

        extractPageContent() {
            const content = [];
            
            // 1. Basic page metadata
            content.push(this.extractBasicMetadata());
            
            // 2. Enhanced content extraction with link titles
            content.push(this.extractEnhancedContent());
            
            // 3. Structural information
            content.push(this.extractStructuralInfo());
            
            return content.join("\n\n");
        }

        extractBasicMetadata() {
            return `Page Title: ${document.title}
Page URL: ${window.location.href}
Domain: ${window.location.hostname}
Language: ${document.documentElement.lang || this.detectLanguage()}
Meta Description: ${this.getMetaContent("description")}
Meta Keywords: ${this.getMetaContent("keywords")}
Page Type: ${this.detectPageType()}`;
        }

        extractEnhancedContent() {
            const sections = [];
            
            // Main content areas with better prioritization
            const contentSelectors = [
                "main", "article", ".content", ".main-content", 
                "#content", "#main", ".post", ".entry"
            ];
            
            let mainContent = "";
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element && this.isValidContentElement(element)) {
                    mainContent = this.cleanText(element.textContent);
                    break;
                }
            }
            
            if (!mainContent) {
                mainContent = this.extractMainContent();
            }
            
            sections.push(`Main Content:\n${mainContent.substring(0, 2000)}`);
            
            // Enhanced links with titles
            const linksInfo = this.extractLinksWithTitles();
            if (linksInfo) {
                sections.push(linksInfo);
            }
            
            // Headings structure
            const headings = this.extractHeadings();
            if (headings) {
                sections.push(headings);
            }
            
            // Lists
            const lists = this.extractLists();
            if (lists) {
                sections.push(lists);
            }
            
            return sections.join("\n\n");
        }

        extractLinksWithTitles() {
            const links = Array.from(document.querySelectorAll("a[href]"))
                .filter(link => link.href && link.href.startsWith("http"))
                .slice(0, 20) // Limit to first 20 links
                .map(link => {
                    const text = this.cleanText(link.textContent);
                    const title = link.title || link.getAttribute("aria-label") || "";
                    const href = link.href;
                    
                    if (text && text.length > 5) {
                        return title ? 
                            `${text} (${title}) - ${href}` : 
                            `${text} - ${href}`;
                    }
                    return null;
                })
                .filter(link => link !== null);
            
            return links.length > 0 ? 
                `Important Links:\n${links.join("\n")}` : 
                null;
        }

        extractHeadings() {
            const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
                .map(heading => {
                    const level = heading.tagName.substring(1);
                    const text = this.cleanText(heading.textContent);
                    return text ? `${"  ".repeat(parseInt(level) - 1)}H${level}: ${text}` : null;
                })
                .filter(heading => heading !== null)
                .slice(0, 20);
                
            return headings.length > 0 ? 
                `Page Structure:\n${headings.join("\n")}` : 
                null;
        }

        extractLists() {
            const lists = Array.from(document.querySelectorAll("ul, ol"))
                .slice(0, 5) // Limit to first 5 lists
                .map((list, index) => {
                    const items = Array.from(list.children)
                        .map(item => this.cleanText(item.textContent))
                        .filter(text => text && text.length > 3)
                        .slice(0, 10); // Limit to 10 items per list
                    
                    return items.length > 0 ? 
                        `List ${index + 1}:\n${items.map(item => `  • ${item}`).join("\n")}` : 
                        null;
                })
                .filter(list => list !== null);
                
            return lists.length > 0 ? 
                `Lists:\n${lists.join("\n\n")}` : 
                null;
        }

        extractMainContent() {
            // Fallback content extraction
            const contentElements = document.querySelectorAll("p, div, span");
            const textBlocks = Array.from(contentElements)
                .map(element => this.cleanText(element.textContent))
                .filter(text => text && text.length > 50)
                .slice(0, 10);
                
            return textBlocks.join(" ");
        }

        extractStructuralInfo() {
            const stats = this.getContentStats();
            const pageType = this.detectPageType();
            const language = this.detectLanguage();
            
            return `Page Analysis:
Content Statistics: ${stats}
Detected Page Type: ${pageType}
Detected Language: ${language}`;
        }

        detectPageType() {
            // Simple page type detection
            if (document.querySelector("article, .post, .blog-post")) return "Article/Blog";
            if (document.querySelector("table, .table, .data-table")) return "Data/Table";
            if (document.querySelector("form, .form, input[type='text']")) return "Form/Input";
            if (document.querySelector(".product, .item, .listing")) return "Product/Listing";
            return "General";
        }

        getContentStats() {
            const paragraphs = document.querySelectorAll("p").length;
            const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6").length;
            const links = document.querySelectorAll("a[href]").length;
            const images = document.querySelectorAll("img").length;
            
            return `${paragraphs} paragraphs, ${headings} headings, ${links} links, ${images} images`;
        }

        detectLanguage() {
            // Simple language detection based on common words
            const text = document.body.textContent.toLowerCase().substring(0, 1000);
            
            // English indicators
            if (text.includes(" the ") || text.includes(" and ") || text.includes(" of ")) {
                return "en";
            }
            
            // Chinese indicators
            if (/[\u4e00-\u9fff]/.test(text)) {
                return "zh";
            }
            
            // Japanese indicators
            if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
                return "ja";
            }
            
            return document.documentElement.lang || "unknown";
        }

        extractPageHTML() {
            return {
                html: document.documentElement.outerHTML,
                title: document.title,
                url: window.location.href,
                cleanHTML: this.extractCleanHTML(),
                structuredHTML: this.extractStructuredHTML(),
                language: document.documentElement.lang || 
                         document.querySelector("meta[http-equiv='content-language']")?.content ||
                         "en"
            };
        }

        extractCleanHTML() {
            // Create a copy of the document to clean
            const clonedDoc = document.cloneNode(true);
            
            // Remove script and style elements
            const elementsToRemove = clonedDoc.querySelectorAll("script, style, noscript, iframe, embed, object");
            elementsToRemove.forEach(element => element.remove());
            
            // Remove comments
            const walker = clonedDoc.createTreeWalker(
                clonedDoc.body || clonedDoc,
                NodeFilter.SHOW_COMMENT,
                null,
                false
            );
            
            const comments = [];
            let comment;
            while ((comment = walker.nextNode())) {
                comments.push(comment);
            }
            comments.forEach(comment => comment.remove());
            
            // Remove empty elements
            const emptyElements = clonedDoc.querySelectorAll("*:empty:not(img):not(input):not(hr):not(br)");
            emptyElements.forEach(element => {
                if (element.textContent.trim() === "") {
                    element.remove();
                }
            });
            
            return clonedDoc.body ? clonedDoc.body.innerHTML : clonedDoc.innerHTML;
        }

        extractStructuredHTML() {
            const structured = {
                title: document.title,
                headings: [],
                content: [],
                links: [],
                lists: [],
                metadata: {}
            };
            
            // Extract headings
            document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(heading => {
                structured.headings.push({
                    level: parseInt(heading.tagName.substring(1)),
                    text: this.cleanText(heading.textContent),
                    id: heading.id || null
                });
            });
            
            // Extract main content paragraphs
            document.querySelectorAll("p, div.content, article p").forEach((para, index) => {
                const text = this.cleanText(para.textContent);
                if (text && text.length > 30) {
                    structured.content.push({
                        index: index,
                        text: text,
                        html: para.outerHTML
                    });
                }
            });
            
            // Extract important links
            document.querySelectorAll("nav a, .menu a, .navigation a, main a").forEach(link => {
                if (link.href && link.href.startsWith("http")) {
                    structured.links.push({
                        text: this.cleanText(link.textContent),
                        href: link.href,
                        title: link.title || null
                    });
                }
            });
            
            // Extract lists
            document.querySelectorAll("ul, ol").forEach((list, index) => {
                const items = Array.from(list.children).map(item => 
                    this.cleanText(item.textContent)
                ).filter(text => text && text.length > 5);
                
                if (items.length > 0) {
                    structured.lists.push({
                        index: index,
                        type: list.tagName.toLowerCase(),
                        items: items
                    });
                }
            });
            
            // Basic metadata
            structured.metadata = {
                url: window.location.href,
                domain: window.location.hostname,
                language: this.detectPageLanguage(),
                description: this.getMetaContent("description"),
                keywords: this.getMetaContent("keywords"),
                author: this.getMetaContent("author"),
                publishedTime: this.getMetaContent("article:published_time")
            };
            
            return structured;
        }



        getMetaContent(name) {
            const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"], meta[property="og:${name}"]`);
            return meta ? meta.content : "";
        }

        isValidContentElement(element) {
            const textLength = element.textContent.trim().length;
            const tagName = element.tagName.toLowerCase();
            
            // Skip elements that are too small or are likely navigation/sidebar content
            return textLength > 100 && 
                   !["nav", "aside", "footer", "header"].includes(tagName) &&
                   !element.classList.contains("sidebar") &&
                   !element.classList.contains("navigation");
        }

        cleanText(text) {
            return text ? text.trim().replace(/\s+/g, " ").replace(/\n+/g, " ") : "";
        }
    }

    // Initialize the content extractor
    new BasicContentExtractor();
    
    // Add page debug message handling
    window.addEventListener('smartFormFillerDebugRequest', async (event) => {
        const { messageId, type } = event.detail;
        
        try {
            console.log('🔧 [CONTENT_DEBUG] Received debug request:', type);
            
            let responseData = null;
            
            switch (type) {
                case 'getDebugInfo':
                    // Send message to popup/background to get debug info
                    responseData = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'getPopupDebugInfo'
                        }, (response) => {
                            resolve(response || { error: 'No response from popup' });
                        });
                    });
                    break;
                    
                case 'openDataSourceModal':
                    // Send message to popup to open modal
                    chrome.runtime.sendMessage({
                        action: 'openDataSourceModal'
                    });
                    responseData = { success: true, message: 'Modal open request sent' };
                    break;
                    
                case 'getExtractionHistory':
                    // Get extraction history from popup
                    responseData = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'getExtractionHistory'
                        }, (response) => {
                            resolve(response || { error: 'No response from popup' });
                        });
                    });
                    break;
                    
                case 'getDetailedHistory':
                    // Get detailed extraction history analysis from popup
                    responseData = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'getDetailedAnalysis'
                        }, (response) => {
                            resolve(response || { error: 'No response from popup' });
                        });
                    });
                    break;
                    
                case 'forceUpdateDataSources':
                    // Force update data sources in popup
                    responseData = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({
                            action: 'forceUpdateDataSources'
                        }, (response) => {
                            resolve(response || { error: 'No response from popup' });
                        });
                    });
                    break;
                    
                default:
                    responseData = { error: 'Unknown debug request type' };
            }
            
            // Send response back to page
            window.dispatchEvent(new CustomEvent('smartFormFillerDebugResponse', {
                detail: { messageId, data: responseData }
            }));
            
        } catch (error) {
            console.error('❌ [CONTENT_DEBUG] Error handling debug request:', error);
            window.dispatchEvent(new CustomEvent('smartFormFillerDebugResponse', {
                detail: { messageId, data: { error: error.message } }
            }));
        }
    });
    
    // Mark that content script is loaded
    window.contentScriptLoaded = true;
    console.log("🚀 Basic content extractor loaded");

})();
