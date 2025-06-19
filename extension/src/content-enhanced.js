/* global chrome */
// Enhanced content script for intelligent page content extraction
(function() {
    "use strict";

    // Enhanced Content extraction utility
    class EnhancedContentExtractor {
        constructor() {
            this.setupMessageListener();
        }

        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
                } else if (request.action === "analyzeContent") {
                    try {
                        const analysis = this.analyzePageStructure();
                        sendResponse({ success: true, analysis: analysis });
                    } catch (error) {
                        sendResponse({ success: false, error: error.message });
                    }
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
            
            // 4. Language detection
            content.push(this.detectLanguage());

            return content.join("\n\n");
        }

        extractBasicMetadata() {
            const metadata = [];
            
            // Page title
            if (document.title) {
                metadata.push(`Title: ${document.title.trim()}`);
            }

            // Meta description
            const metaDescription = document.querySelector("meta[name='description']");
            if (metaDescription && metaDescription.content) {
                metadata.push(`Description: ${metaDescription.content.trim()}`);
            }

            // Meta keywords
            const metaKeywords = document.querySelector("meta[name='keywords']");
            if (metaKeywords && metaKeywords.content) {
                metadata.push(`Keywords: ${metaKeywords.content.trim()}`);
            }

            // Page URL
            metadata.push(`URL: ${window.location.href}`);

            // Domain
            metadata.push(`Domain: ${window.location.hostname}`);

            return `== Page Metadata ==\n${metadata.join("\n")}`;
        }

        extractEnhancedContent() {
            const content = [];
            
            // Main content
            const mainContent = this.extractMainContent();
            if (mainContent) {
                content.push(`Main Content:\n${mainContent}`);
            }

            // Enhanced link extraction with titles
            const linksWithTitles = this.extractLinksWithTitles();
            if (linksWithTitles.length > 0) {
                content.push(`Important Links:\n${linksWithTitles.join("\n")}`);
            }

            // Headings structure
            const headings = this.extractHeadings();
            if (headings.length > 0) {
                content.push(`Page Structure:\n${headings.join("\n")}`);
            }

            // Lists and structured data
            const lists = this.extractLists();
            if (lists.length > 0) {
                content.push(`Key Information:\n${lists.join("\n")}`);
            }

            return `== Enhanced Content ==\n${content.join("\n\n")}`;
        }

        extractLinksWithTitles() {
            const links = [];
            const linkElements = document.querySelectorAll("a[href]");
            
            linkElements.forEach(link => {
                const href = link.getAttribute("href");
                const title = link.getAttribute("title");
                const text = link.textContent?.trim();
                
                if (text && text.length > 5) { // Filter out very short links
                    let linkInfo = `• ${text}`;
                    
                    // Add title if available and different from text
                    if (title && title !== text && title.length > text.length) {
                        linkInfo += ` (${title})`;
                    }
                    
                    // Add URL if it's internal or important
                    if (href && (href.startsWith("/") || href.includes(window.location.hostname))) {
                        linkInfo += ` [${href}]`;
                    }
                    
                    links.push(linkInfo);
                }
            });

            // Return only the most relevant links (top 10)
            return links.slice(0, 10);
        }

        extractHeadings() {
            const headings = [];
            const headingElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
            
            headingElements.forEach(heading => {
                const level = heading.tagName.toLowerCase();
                const text = heading.textContent?.trim();
                if (text) {
                    const indent = "  ".repeat(parseInt(level.charAt(1)) - 1);
                    headings.push(`${indent}${level.toUpperCase()}: ${text}`);
                }
            });

            return headings;
        }

        extractLists() {
            const lists = [];
            const listElements = document.querySelectorAll("ul, ol");
            
            listElements.forEach((list, index) => {
                const items = list.querySelectorAll("li");
                if (items.length > 0 && items.length <= 20) { // Avoid very long lists
                    const listItems = Array.from(items).map(item => {
                        const text = item.textContent?.trim();
                        return text ? `  - ${text}` : "";
                    }).filter(item => item);
                    
                    if (listItems.length > 0) {
                        lists.push(`List ${index + 1}:\n${listItems.join("\n")}`);
                    }
                }
            });

            return lists.slice(0, 5); // Limit to 5 lists
        }

        extractMainContent() {
            // Priority selectors for main content
            const contentSelectors = [
                "main",
                "article",
                "[role='main']",
                ".main-content",
                ".content",
                ".article-content",
                ".post-content",
                ".entry-content",
                "#main",
                "#content",
                ".main"
            ];

            // Try to find main content container
            for (const selector of contentSelectors) {
                const element = document.querySelector(selector);
                if (element && this.isValidContentElement(element)) {
                    return this.cleanText(element.innerText);
                }
            }

            // Fallback: extract from body but exclude navigation, header, footer
            const excludeSelectors = [
                "nav", "header", "footer", "aside",
                ".navigation", ".nav", ".menu",
                ".header", ".footer", ".sidebar",
                ".ads", ".advertisement", ".promo",
                "script", "style", "noscript"
            ];

            // Clone body to avoid modifying original
            const bodyClone = document.body.cloneNode(true);
            
            // Remove excluded elements
            excludeSelectors.forEach(selector => {
                const elements = bodyClone.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });

            const bodyText = bodyClone.innerText || bodyClone.textContent || "";
            return this.cleanText(bodyText);
        }

        extractStructuralInfo() {
            const info = [];
            
            // Page type detection
            const pageType = this.detectPageType();
            info.push(`Page Type: ${pageType}`);
            
            // Content statistics
            const stats = this.getContentStats();
            info.push(`Content Stats: ${stats}`);
            
            return `== Structural Information ==\n${info.join("\n")}`;
        }

        detectPageType() {
            // Check for common page type indicators
            if (document.querySelector("article")) return "Article";
            if (document.querySelector(".news") || document.querySelector("[class*='news']")) return "News";
            if (document.querySelector(".blog") || document.querySelector("[class*='blog']")) return "Blog";
            if (document.querySelector(".product") || document.querySelector("[class*='product']")) return "Product";
            if (document.querySelector(".documentation") || document.querySelector("[class*='doc']")) return "Documentation";
            if (document.querySelector("table")) return "Data/Table";
            if (document.querySelector("form")) return "Form/Interactive";
            
            return "General";
        }

        getContentStats() {
            const bodyText = document.body.innerText || "";
            const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;
            const charCount = bodyText.length;
            const paragraphs = document.querySelectorAll("p").length;
            const images = document.querySelectorAll("img").length;
            const links = document.querySelectorAll("a").length;
            
            return `${wordCount} words, ${charCount} characters, ${paragraphs} paragraphs, ${images} images, ${links} links`;
        }

        detectLanguage() {
            // Language detection based on lang attribute and content analysis
            const htmlLang = document.documentElement.lang;
            const bodyLang = document.body.lang;
            
            let detectedLang = htmlLang || bodyLang || "unknown";
            
            // Simple content-based language detection
            if (detectedLang === "unknown") {
                const text = document.body.innerText || "";
                const sample = text.substring(0, 1000);
                
                // Check for Chinese characters
                if (/[\u4e00-\u9fff]/.test(sample)) {
                    detectedLang = "zh";
                }
                // Check for common English words
                else if (/\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i.test(sample)) {
                    detectedLang = "en";
                }
            }
            
            return `== Language Information ==\nDetected Language: ${detectedLang}`;
        }

        extractPageHTML() {
            // Extract the full HTML structure of the page for intelligent processing
            try {
                console.log("🔧 Content script: Starting HTML extraction...");
                
                // Method 1: Try to get full document HTML
                let fullHTML = null;
                if (document.documentElement && document.documentElement.outerHTML) {
                    fullHTML = document.documentElement.outerHTML;
                    console.log("✅ Content script: Full HTML extracted, length:", fullHTML.length);
                }
                
                // Method 2: Get clean HTML without unwanted elements
                const cleanHTML = this.extractCleanHTML();
                console.log("✅ Content script: Clean HTML extracted, length:", cleanHTML?.length || 0);
                
                // Method 3: Get structured content HTML as fallback
                const structuredHTML = this.extractStructuredHTML();
                console.log("✅ Content script: Structured HTML extracted, length:", structuredHTML?.length || 0);
                
                const result = {
                    fullHTML: fullHTML,
                    cleanHTML: cleanHTML,
                    structuredHTML: structuredHTML,
                    title: document.title,
                    url: window.location.href,
                    domain: window.location.hostname,
                    language: document.documentElement.lang || 
                             document.querySelector("meta[http-equiv='content-language']")?.content ||
                             "en",
                    extractedAt: new Date().toISOString(),
                    extractionMethods: {
                        fullHTML: !!fullHTML,
                        cleanHTML: !!cleanHTML,
                        structuredHTML: !!structuredHTML
                    }
                };
                
                console.log("✅ Content script: HTML extraction completed:", result.extractionMethods);
                return result;
                
            } catch (error) {
                console.error("❌ Content script: HTML extraction error:", error);
                // Fallback extraction
                return {
                    fullHTML: document.documentElement ? document.documentElement.outerHTML : "",
                    cleanHTML: document.body ? document.body.innerHTML : "",
                    structuredHTML: this.extractStructuredHTML(),
                    title: document.title || "",
                    url: window.location.href,
                    domain: window.location.hostname,
                    language: "unknown",
                    extractedAt: new Date().toISOString(),
                    error: error.message,
                    extractionMethods: {
                        fullHTML: !!(document.documentElement && document.documentElement.outerHTML),
                        cleanHTML: !!(document.body && document.body.innerHTML),
                        structuredHTML: true // Always try this
                    }
                };
            }
        }

        extractCleanHTML() {
            // Clone the document to avoid modifying the original
            const clonedDoc = document.cloneNode(true);
            
            // Remove unwanted elements
            const unwantedSelectors = [
                "script",
                "style", 
                "noscript",
                ".ads",
                ".advertisement", 
                ".promo",
                ".social-share",
                ".share",
                ".comments",
                ".comment",
                "iframe[src*='ads']",
                "iframe[src*='analytics']",
                "[class*='ad-']",
                "[id*='ad-']"
            ];
            
            unwantedSelectors.forEach(selector => {
                const elements = clonedDoc.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            
            // Return the cleaned HTML
            return clonedDoc.documentElement.outerHTML;
        }

        extractStructuredHTML() {
            // Extract main content and convert to structured HTML
            try {
                console.log("🔧 Content script: Extracting structured HTML...");
                
                const contentParts = [];
                
                // Add title
                if (document.title) {
                    contentParts.push(`<title>${document.title}</title>`);
                }
                
                // Priority selectors for main content
                const contentSelectors = [
                    "main",
                    "article", 
                    "[role='main']",
                    ".content",
                    ".main-content",
                    ".article-content",
                    ".post-content",
                    ".entry-content",
                    "#content"
                ];

                let mainContentHTML = null;
                for (const selector of contentSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.innerHTML && element.innerHTML.trim().length > 200) {
                        mainContentHTML = element.innerHTML;
                        console.log("✅ Content script: Found main content in", selector);
                        break;
                    }
                }

                // Fallback to body content if no main content found
                if (!mainContentHTML && document.body) {
                    mainContentHTML = document.body.innerHTML;
                    console.log("✅ Content script: Using full body content");
                }

                if (mainContentHTML) {
                    const structuredHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${document.title || "Extracted Content"}</title>
</head>
<body>
${mainContentHTML}
</body>
</html>`;
                    console.log("✅ Content script: Structured HTML created, length:", structuredHTML.length);
                    return structuredHTML;
                }

                // Last resort: create HTML from text content
                const textContent = document.body ? document.body.innerText : "";
                if (textContent.trim().length > 100) {
                    const htmlParagraphs = textContent
                        .trim()
                        .split("\n\n")
                        .filter(p => p.trim().length > 0)
                        .slice(0, 20)
                        .map(p => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
                        .join("\n");
                    
                    const fallbackHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${document.title || "Page Content"}</title>
</head>
<body>
${htmlParagraphs}
</body>
</html>`;
                    console.log("✅ Content script: Fallback structured HTML created, length:", fallbackHTML.length);
                    return fallbackHTML;
                }

                console.log("⚠️ Content script: No content available for structured HTML");
                return null;
                
            } catch (error) {
                console.error("❌ Content script: Structured HTML extraction error:", error);
                return null;
            }
        }

        analyzePageStructure() {
            // This method provides page structure analysis for intelligent extraction
            return {
                title: document.title,
                language: this.detectLanguage().split(": ")[1],
                pageType: this.detectPageType(),
                hasMainContent: !!document.querySelector("main, article, [role='main']"),
                contentSelectors: this.findBestContentSelectors(),
                linkCount: document.querySelectorAll("a").length,
                headingCount: document.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
                listCount: document.querySelectorAll("ul, ol").length,
                imageCount: document.querySelectorAll("img").length
            };
        }

        findBestContentSelectors() {
            const selectors = [];
            
            if (document.querySelector("main")) selectors.push("main");
            if (document.querySelector("article")) selectors.push("article");
            if (document.querySelector("[role='main']")) selectors.push("[role='main']");
            if (document.querySelector(".content")) selectors.push(".content");
            if (document.querySelector("#content")) selectors.push("#content");
            
            return selectors;
        }

        isValidContentElement(element) {
            const text = element.innerText || element.textContent || "";
            const cleanText = text.trim();
            
            // Check if element has substantial content
            if (cleanText.length < 100) {
                return false;
            }

            // Check if it's not just navigation or metadata
            const words = cleanText.split(/\s+/).length;
            if (words < 20) {
                return false;
            }

            return true;
        }

        cleanText(text) {
            if (!text) return "";
            
            return text
                // Remove excessive whitespace
                .replace(/\s+/g, " ")
                // Remove control characters and non-printable characters
                .replace(/[\p{Cc}\p{Cf}]/gu, "")
                // Trim whitespace
                .trim()
                // Limit length to prevent API overload
                .substring(0, 12000); // Increased limit for better content
        }

        // Method for testing extraction without message passing
        testExtraction() {
            return this.extractPageContent();
        }
    }

    // Initialize enhanced content extractor
    new EnhancedContentExtractor();

    // Add visual indicator when extension is active
    const addExtensionIndicator = () => {
        if (document.getElementById("azure-chatgpt-indicator")) {
            return; // Already added
        }

        const indicator = document.createElement("div");
        indicator.id = "azure-chatgpt-indicator";
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 8px;
            height: 8px;
            background: #0078d4;
            border-radius: 50%;
            z-index: 999999;
            opacity: 0.7;
            pointer-events: none;
        `;
        document.body.appendChild(indicator);

        // Remove indicator after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 3000);
    };

    // Show indicator when page loads
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", addExtensionIndicator);
    } else {
        addExtensionIndicator();
    }
})();
