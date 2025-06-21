// controllers/edgeExtension/dataExtractionController.js
/**
 * Data Extraction Controller - Part 1
 * Handles code-based data extraction and HTML processing
 */

const cheerio = require("cheerio");
const TurndownService = require("turndown");

class DataExtractionController {
    
    constructor() {
        // Initialize Turndown service for HTML to Markdown conversion
        this.turndownService = new TurndownService({
            codeBlockStyle: "fenced",
            fence: "```",
            emDelimiter: "*",
            strongDelimiter: "**",
            linkStyle: "inlined"
        });
        
        // Configure Turndown rules
        this.configureTurndownRules();
        
        // Bind methods to the correct context
        this.extractDataSources = this.extractDataSources.bind(this);
    }

    /**
     * Main data extraction interface - code-based three data source generation
     */
    async extractDataSources(req, res) {
        try {
            const { 
                url, 
                title,  // Receive page title from frontend
                content, 
                model = "gpt-4.1-nano",
                iframeContents = []  // Receive iframe contents from frontend
            } = req.body;
            
            // Validate input content
            if (!content || typeof content !== 'string' || content.trim().length === 0) {
                console.error("❌ Invalid or empty content received from frontend");
                return res.status(400).json({
                    success: false,
                    error: "No valid HTML content was provided. Please ensure the page is fully loaded and try again.",
                    extractionMethod: "code-based",
                    details: {
                        contentProvided: !!content,
                        contentType: typeof content,
                        contentLength: content ? content.length : 0,
                        url: url,
                        iframeContentsCount: iframeContents.length
                    }
                });
            }
            
            console.log(`🔧 Code-based extraction started - Model: ${model}`);
            console.log(`🔧 Content length: ${content.length} characters`);
            console.log(`🔧 URL: ${url}`);
            console.log(`🔧 IFrame contents received: ${iframeContents.length} items`);
            
            // Detailed iframe content analysis
            if (iframeContents && iframeContents.length > 0) {
                console.log("🔧 Detailed iframe analysis:");
                let totalContentSize = 0;
                iframeContents.forEach((iframe, index) => {
                    const size = iframe.content ? iframe.content.length : 0;
                    totalContentSize += size;
                    console.log(`  - Iframe ${index + 1}: ${iframe.src || "unknown"} (${Math.round(size/1024)}KB)`);
                });
                console.log(`🔧 Total iframe content: ${Math.round(totalContentSize/1024)}KB`);
            }

            // Optimize content size to prevent oversized requests
            const optimizedContent = this.optimizeContentSize(content);
            const optimizedIframeContents = this.optimizeIframeContents(iframeContents);
            
            // Generate three data sources using code-based approach
            console.log("🔧 [DATA_SOURCES_DEBUG] Starting generateThreeDataSources...");
            console.log("🔧 [DATA_SOURCES_DEBUG] Input content length:", optimizedContent.length);
            console.log("🔧 [DATA_SOURCES_DEBUG] Input iframe contents count:", optimizedIframeContents.length);
            
            const dataSources = await this.generateThreeDataSources(optimizedContent, optimizedIframeContents);
            
            console.log("🔧 [DATA_SOURCES_DEBUG] Generated data sources:");
            console.log("  - Raw:", dataSources.raw?.content?.length || 0, "characters");
            console.log("  - Cleaned:", dataSources.cleaned?.content?.length || 0, "characters"); 
            console.log("  - Markdown:", dataSources.markdown?.content?.length || 0, "characters");
            
            // Generate statistics
            const stats = this.generateStats(dataSources);
            
            console.log("✅ Code-based extraction completed successfully");
            
            res.json({
                success: true,
                extractionMethod: "code-based",
                url: url,
                title: title || dataSources.raw.title,
                dataSources: {
                    raw: dataSources.raw,
                    cleaned: dataSources.cleaned,
                    markdown: dataSources.markdown
                },
                stats: stats,
                model: model,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error("❌ Code-based extraction error:", error);
            res.status(500).json({
                success: false,
                error: error.message,
                extractionMethod: "code-based"
            });
        }
    }

    /**
     * Code-driven three data source generation
     */
    async generateThreeDataSources(htmlContent, iframeContents = []) {
        console.log("🔧 Generating three data sources using code...");

        // Calculate real total original size (main page + all iframe contents)
        const totalOriginalSize = htmlContent.length + iframeContents.reduce((sum, iframe) => {
            return sum + (iframe.content ? iframe.content.length : 0);
        }, 0);

        // 1. Raw HTML data source (including iframe content)
        const rawDataSource = await this.extractRawHTMLDataSource(htmlContent, iframeContents);
        
        // 2. Cleaned HTML data source
        const cleanedDataSource = await this.extractCleanedHTMLDataSource(rawDataSource.content, totalOriginalSize);
        
        // 3. Markdown data source (based on cleaned HTML)
        const markdownDataSource = await this.extractMarkdownDataSource(cleanedDataSource.content, totalOriginalSize);

        return {
            raw: rawDataSource,
            cleaned: cleanedDataSource,
            markdown: markdownDataSource
        };
    }

    /**
     * Extract raw HTML data source (including iframe)
     */
    async extractRawHTMLDataSource(htmlContent, iframeContents = []) {
        console.log("🔧 Extracting raw HTML data source...");
        
        const $ = cheerio.load(htmlContent);
        
        // Extract basic information
        const title = $("title").text() || $("h1").first().text() || "Untitled";
        const description = $("meta[name=\"description\"]").attr("content") || "";
        
        // Get iframe tags in main page (for replacement only)
        const mainPageIframes = $("iframe");
        let mergedContent = htmlContent;
        let processedIframes = [];
        
        console.log(`🔧 Found ${mainPageIframes.length} iframes in main page HTML`);
        console.log(`🔧 Received ${iframeContents.length} iframe contents from frontend (including nested)`);
        
        // First process direct iframe tags in main page and replace with frontend content
        const processedMainIframeSrcs = new Set();
        
        for (let i = 0; i < mainPageIframes.length; i++) {
            const iframe = mainPageIframes[i];
            const src = $(iframe).attr("src") || `iframe-${i}`;
            const name = $(iframe).attr("name") || `iframe-${i}`;
            
            console.log(`🔧 Processing main page iframe ${i + 1}: ${src}`);
            
            // Find matching iframe content (prioritize src matching)
            let matchedIframeData = null;
            
            for (const iframeData of iframeContents) {
                if (iframeData.src && iframeData.src === src && iframeData.content) {
                    matchedIframeData = iframeData;
                    break;
                }
            }
            
            // If no src match, try index matching
            if (!matchedIframeData && iframeContents[i] && iframeContents[i].content) {
                matchedIframeData = iframeContents[i];
            }
            
            if (matchedIframeData && matchedIframeData.content) {
                // Replace iframe tag with frontend extracted content
                const iframeMarker = `<!-- IFRAME_CONTENT_START: ${name} (${src}) -->`;
                const iframeEndMarker = `<!-- IFRAME_CONTENT_END: ${name} -->`;
                const iframeFullContent = `${iframeMarker}\n${matchedIframeData.content}\n${iframeEndMarker}`;
                
                $(iframe).replaceWith(iframeFullContent);
                
                processedIframes.push({
                    index: matchedIframeData.index || i,
                    name: name,
                    src: src,
                    content: matchedIframeData.content,
                    size: matchedIframeData.content.length,
                    source: "frontend-extracted",
                    type: "main-page-iframe",
                    metadata: matchedIframeData.metadata || {}
                });
                
                processedMainIframeSrcs.add(src);
                console.log(`✅ Replaced main page iframe ${i + 1} with frontend content: ${matchedIframeData.content.length} characters`);
            } else {
                // If no matching content found, keep placeholder
                const placeholder = `<!-- IFRAME_PLACEHOLDER: ${name} (${src}) - No content provided by frontend -->`;
                $(iframe).replaceWith(placeholder);
                
                processedIframes.push({
                    index: i,
                    name: name,
                    src: src,
                    content: null,
                    error: "No content provided by frontend",
                    source: "placeholder",
                    type: "main-page-iframe"
                });
                
                console.log(`⚠️ No content found for main page iframe: ${src}`);
            }
        }
        
        // Get current merged content (main page iframes already replaced)
        mergedContent = $.html();
        
        // Now add all other iframe contents (including nested iframes)
        let additionalIframeContent = "";
        
        for (const iframeData of iframeContents) {
            // Skip already processed main page iframes
            if (processedMainIframeSrcs.has(iframeData.src)) {
                continue;
            }
            
            if (iframeData.content) {
                const iframeName = iframeData.metadata?.title || `iframe-${iframeData.index || processedIframes.length}`;
                const iframeMarker = `<!-- ADDITIONAL_IFRAME_START: ${iframeName} (${iframeData.src}) -->`;
                const iframeEndMarker = `<!-- ADDITIONAL_IFRAME_END: ${iframeName} -->`;
                const iframeFullContent = `${iframeMarker}\n${iframeData.content}\n${iframeEndMarker}`;
                
                additionalIframeContent += `\n${iframeFullContent}\n`;
                
                processedIframes.push({
                    index: iframeData.index,
                    name: iframeName,
                    src: iframeData.src,
                    content: iframeData.content,
                    size: iframeData.content.length,
                    source: "frontend-extracted",
                    type: "nested-or-additional-iframe",
                    metadata: iframeData.metadata || {}
                });
                
                console.log(`✅ Added additional/nested iframe content: ${iframeData.src} (${iframeData.content.length} characters)`);
            }
        }
        
        // Add additional iframe content to page end
        if (additionalIframeContent) {
            mergedContent += `\n<!-- ADDITIONAL_IFRAME_CONTENTS_SECTION -->\n${additionalIframeContent}`;
            console.log(`🔧 Added ${iframeContents.length - processedMainIframeSrcs.size} additional/nested iframe contents`);
        }
        
        // Calculate real total original size (main page + all iframe contents)
        const totalOriginalSize = htmlContent.length + iframeContents.reduce((sum, iframe) => {
            return sum + (iframe.content ? iframe.content.length : 0);
        }, 0);
        
        console.log(`🔧 Final merged content size: ${mergedContent.length} characters`);
        console.log(`🔧 Total original input size: ${totalOriginalSize} characters (main: ${htmlContent.length}, iframes: ${totalOriginalSize - htmlContent.length})`);
        console.log(`🔧 Successfully processed ${processedIframes.filter(f => f.content).length}/${processedIframes.length} iframes total`);
        console.log(`🔧 Main page iframes: ${processedMainIframeSrcs.size}, Additional/nested iframes: ${processedIframes.filter(f => f.type === "nested-or-additional-iframe").length}`);
        
        return {
            type: "raw-html",
            content: mergedContent,
            title: title,
            description: description,
            iframeContents: processedIframes,
            metadata: {
                mainPageIframeCount: mainPageIframes.length,
                totalProcessedIframes: processedIframes.length,
                successfulIframes: processedIframes.filter(iframe => iframe.content).length,
                nestedIframes: processedIframes.filter(iframe => iframe.type === "nested-or-additional-iframe").length,
                originalSize: totalOriginalSize, // Real total input size
                mainPageSize: htmlContent.length,
                iframeContentSize: totalOriginalSize - htmlContent.length,
                mergedSize: mergedContent.length,
                frontendProvidedCount: iframeContents.length,
                extractedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Extract cleaned HTML data source
     */
    async extractCleanedHTMLDataSource(rawContent, totalOriginalSize = null) {
        console.log("🔧 Extracting cleaned HTML data source...");
        
        const $ = cheerio.load(rawContent);
        
        // Remove unwanted elements
        this.removeUnwantedElements($);
        
        // Clean attributes
        this.cleanAttributes($);
        
        // Extract main content area
        const mainContent = this.extractMainContent($);
        
        // Structured data extraction
        const structuredData = this.extractStructuredData($);
        
        return {
            type: "cleaned-html",
            content: mainContent,
            structure: structuredData,
            metadata: {
                originalSize: totalOriginalSize, // Use passed real original size
                cleanedSize: mainContent.length,
                rawInputSize: rawContent.length,
                tablesCount: structuredData.tables,
                formsCount: structuredData.forms,
                linksCount: structuredData.links,
                extractedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Extract Markdown data source
     */
    async extractMarkdownDataSource(cleanedHTML, totalOriginalSize = null) {
        console.log("🔧 Extracting Markdown data source...");
        
        // Use Turndown to convert HTML to Markdown directly (no slicing needed)
        console.log(`🔧 Converting HTML to Markdown (${cleanedHTML.length} characters)`);
        const markdownContent = this.turndownService.turndown(cleanedHTML);
        
        console.log(`� Markdown conversion completed. Output length: ${markdownContent.length} characters`);
        
        // Post-process Markdown
        const processedMarkdown = this.postProcessMarkdown(markdownContent);
        
        return {
            type: "markdown",
            content: processedMarkdown,
            metadata: {
                originalSize: totalOriginalSize, // Use passed real original size
                markdownSize: processedMarkdown.length,
                cleanedInputSize: cleanedHTML.length,
                wordCount: this.countWords(processedMarkdown),
                readingTime: this.estimateReadingTime(processedMarkdown),
                extractedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Remove unwanted elements
     */
    removeUnwantedElements($) {
        console.log("🧹 Removing unwanted elements while preserving forms...");
        
        const totalFormsBeforeRemoval = $("form").length;
        
        // Remove scripts and styles
        $("script, style, noscript").remove();
        
        // Remove hidden elements (but be careful not to remove forms that might be initially hidden)
        $("[style*='display:none']:not(form):not(form *)").remove();
        $("[style*='display: none']:not(form):not(form *)").remove();
        $(".hidden:not(form):not(form *), .hide:not(form):not(form *)").remove();
        
        // Remove navigation and footer
        $("nav, header, footer, .nav, .navigation, .header, .footer").remove();
        
        // Remove ads and tracking
        $(".ad, .ads, .advertisement, .google-ad, .banner").remove();
        $("[class*='track']:not(form):not(form *), [id*='track']:not(form):not(form *), [class*='analytics']:not(form):not(form *)").remove();
        
        // Remove social media buttons
        $(".social, .share, .facebook, .twitter, .linkedin").remove();
        
        const totalFormsAfterRemoval = $("form").length;
        if (totalFormsAfterRemoval < totalFormsBeforeRemoval) {
            console.log(`⚠️ WARNING: ${totalFormsBeforeRemoval - totalFormsAfterRemoval} forms were removed during cleanup!`);
        }
        
        console.log("🧹 Unwanted elements removed");
    }

    /**
     * Clean attributes
     */
    cleanAttributes($) {
        console.log("🧹 Cleaning attributes while preserving form elements...");
        
        // Preserve form attributes before cleaning
        const formData = [];
        $("form").each((i, form) => {
            formData.push({
                id: $(form).attr("id"),
                name: $(form).attr("name")
            });
        });
        
        // Remove style, class, and id attributes
        $("*").removeAttr("style");
        $("*").removeAttr("class");
        $("*").removeAttr("id");
        
        // Keep important attributes for links
        $("a").each((i, el) => {
            const href = $(el).attr("href");
            if (href) {
                $(el).attr("href", href);
            }
        });
        
        // Keep important attributes for images
        $("img").each((i, el) => {
            const src = $(el).attr("src");
            const alt = $(el).attr("alt");
            if (src) $(el).attr("src", src);
            if (alt) $(el).attr("alt", alt);
        });
        
        // Restore important attributes for forms
        $("form").each((i, form) => {
            if (formData[i]) {
                if (formData[i].name) $(form).attr("name", formData[i].name);
                if (formData[i].id) $(form).attr("id", formData[i].id);
                else if (formData[i].name) $(form).attr("id", formData[i].name);
            }
        });
        
        // Keep important attributes for form inputs
        $("input, textarea, select, button").each((i, el) => {
            const $el = $(el);
            const name = $el.attr("name");
            const type = $el.attr("type");
            const value = $el.attr("value");
            const placeholder = $el.attr("placeholder");
            
            if (name) $el.attr("name", name);
            if (type) $el.attr("type", type);
            if (value) $el.attr("value", value);
            if (placeholder) $el.attr("placeholder", placeholder);
        });
        
        console.log("🧹 Attribute cleaning completed");
    }

    /**
     * Extract main content area
     */
    extractMainContent($) {
        console.log("🔧 Extracting main content...");
        
        // Check if there are any forms before we start extracting
        const totalForms = $("form").length;
        if (totalForms > 0) {
            console.log(`🔧 Found ${totalForms} forms in document`);
        }
        
        // Try to find main content area
        const contentSelectors = [
            "main", "article", ".content", "#content", 
            ".main", "#main", ".post", ".entry-content"
        ];
        
        for (const selector of contentSelectors) {
            const content = $(selector);
            if (content.length > 0 && content.text().trim().length > 100) {
                console.log(`📍 Found main content using selector: ${selector}`);
                
                // Check if forms are preserved in the selected content
                const formsInContent = content.find("form").length;
                if (totalForms > 0 && formsInContent < totalForms) {
                    console.log(`⚠️ WARNING: ${totalForms - formsInContent} forms may be excluded by selector ${selector}`);
                }
                
                return content.html();
            }
        }
        
        // If not found, use body
        console.log("📍 Using body as main content");
        return $("body").html();
    }

    /**
     * Extract structured data
     */
    extractStructuredData($) {
        return {
            tables: $("table").length,
            forms: $("form").length,
            links: $("a[href]").length,
            images: $("img[src]").length,
            headings: {
                h1: $("h1").length,
                h2: $("h2").length,
                h3: $("h3").length,
                h4: $("h4").length,
                h5: $("h5").length,
                h6: $("h6").length
            },
            lists: {
                ul: $("ul").length,
                ol: $("ol").length
            }
        };
    }

    /**
     * Post-process Markdown
     */
    postProcessMarkdown(markdown) {
        // Clean extra empty lines
        let processed = markdown.replace(/\n{3,}/g, "\n\n");
        
        // Fix link format
        processed = processed.replace(/\[([^\]]+)\]\(\s*\)/g, "$1");
        
        // Clean empty headings
        processed = processed.replace(/^#+\s*$/gm, "");
        
        // Ensure code blocks are properly formatted
        processed = processed.replace(/```(\w+)?\n+```/g, "");
        
        return processed.trim();
    }

    /**
     * Configure Turndown rules
     */
    configureTurndownRules() {
        console.log("🔧 [TURNDOWN_DEBUG] Configuring Turndown rules...");
        
        // Custom rule: remove unwanted elements
        this.turndownService.addRule("removeUnwanted", {
            filter: ["script", "style", "noscript", "meta", "link"],
            replacement: () => {
                console.log("🔧 [TURNDOWN_DEBUG] Removing unwanted element");
                return "";
            }
        });
        
        // Custom rule: handle forms with detailed content preservation
        this.turndownService.addRule("forms", {
            filter: "form",
            replacement: (content, node) => {
                const formName = node.getAttribute("name") || node.getAttribute("id") || "unnamed";
                const action = node.getAttribute("action") || "";
                const method = node.getAttribute("method") || "GET";
                
                // Return form with content preserved
                return `\n\n[FORM name="${formName}" action="${action}" method="${method}"]\n${content}\n[/FORM]\n\n`;
            }
        });
        
        // Custom rule: handle input fields
        this.turndownService.addRule("inputs", {
            filter: ["input", "textarea", "select"],
            replacement: (content, node) => {
                const type = node.getAttribute("type") || node.tagName.toLowerCase();
                const name = node.getAttribute("name") || "";
                const id = node.getAttribute("id") || "";
                const placeholder = node.getAttribute("placeholder") || "";
                const value = node.getAttribute("value") || "";
                
                console.log(`🔧 [TURNDOWN_DEBUG] Processing input - type: ${type}, name: ${name}, id: ${id}`);
                
                let inputMarkdown = `[${type.toUpperCase()}`;
                if (name) inputMarkdown += ` name="${name}"`;
                if (id) inputMarkdown += ` id="${id}"`;
                if (placeholder) inputMarkdown += ` placeholder="${placeholder}"`;
                if (value) inputMarkdown += ` value="${value}"`;
                inputMarkdown += "]";
                
                if (content && content.trim()) {
                    inputMarkdown += ` ${content}`;
                }
                
                console.log("🔧 [TURNDOWN_DEBUG] Generated input markdown:", inputMarkdown);
                return inputMarkdown;
            }
        });
        
        // Custom rule: handle labels
        this.turndownService.addRule("labels", {
            filter: "label",
            replacement: (content) => {
                console.log(`🔧 [TURNDOWN_DEBUG] Processing label with content: ${content}`);
                return `**${content}**: `;
            }
        });
        
        // Custom rule: handle tables
        this.turndownService.addRule("tables", {
            filter: "table",
            replacement: (content) => {
                console.log(`🔧 [TURNDOWN_DEBUG] Processing table with content length: ${content.length}`);
                // Simplify table processing
                return "\n\n" + content + "\n\n";
            }
        });
        
        console.log("🔧 [TURNDOWN_DEBUG] Turndown rules configuration completed");
    }

    /**
     * Utility function: word count
     */
    countWords(text) {
        return text.trim().split(/\s+/).length;
    }

    /**
     * Utility function: estimate reading time
     */
    estimateReadingTime(text) {
        const wordsPerMinute = 200;
        const words = this.countWords(text);
        const minutes = Math.ceil(words / wordsPerMinute);
        return `${minutes} minute${minutes > 1 ? "s" : ""}`;
    }

    /**
     * Optimize content size, prevent overly large requests
     */
    optimizeContentSize(content) {
        console.log(`🔧 Processing main content: ${content.length} characters (no size limits)`);
        
        // Only do basic cleanup, don't truncate content
        const $ = cheerio.load(content);
        
        // Remove obviously useless elements, but keep all actual content
        $("script[src*='analytics'], script[src*='tracking'], script[src*='ads']").remove();
        $("style[type*='text/css']:empty").remove();
        $("noscript:empty").remove();
        
        // Keep all other content, including images, videos etc.
        const optimizedContent = $.html();
        
        console.log(`🔧 Main content cleaned: ${optimizedContent.length} characters (preserved all content)`);
        return optimizedContent;
    }

    /**
     * Keep iframe contents complete (no truncation optimization)
     */
    optimizeIframeContents(iframeContents) {
        if (!iframeContents || iframeContents.length === 0) {
            return iframeContents;
        }
        
        // Calculate total size for logging
        let totalSize = 0;
        let withContentCount = 0;
        iframeContents.forEach(iframe => {
            if (iframe.content) {
                totalSize += (iframe.content.length || 0);
                withContentCount++;
            }
        });
        
        console.log(`🔧 Preserving all iframe contents: ${withContentCount} iframes with content, total size: ${Math.round(totalSize/1024)}KB`);
        
        // Return original content directly, no optimization or truncation
        return iframeContents;
    }
    
    /**
     * Generate statistics about the extraction process
     */
    generateStats(dataSources) {
        // Get real original sizes from raw data source
        const originalSize = dataSources.raw.metadata.originalSize;
        const mainPageSize = dataSources.raw.metadata.mainPageSize;
        const iframeContentSize = dataSources.raw.metadata.iframeContentSize;
        
        const cleanedSize = dataSources.cleaned.metadata.cleanedSize;
        const markdownSize = dataSources.markdown.metadata.markdownSize;

        return {
            originalSize: originalSize, // Real total input size (main page + iframe)
            mainPageSize: mainPageSize, // Main page original size
            iframeContentSize: iframeContentSize, // Total iframe content size
            cleanedSize: cleanedSize,
            markdownSize: markdownSize,
            compressionRatio: {
                cleaned: originalSize > 0 ? ((originalSize - cleanedSize) / originalSize * 100).toFixed(1) + "%" : "0%",
                markdown: originalSize > 0 ? ((originalSize - markdownSize) / originalSize * 100).toFixed(1) + "%" : "0%"
            },
            sizeBreakdown: {
                "Main Page": Math.round(mainPageSize / 1024) + "KB",
                "Iframe Content": Math.round(iframeContentSize / 1024) + "KB", 
                "Total Input": Math.round(originalSize / 1024) + "KB",
                "Cleaned Output": Math.round(cleanedSize / 1024) + "KB",
                "Markdown Output": Math.round(markdownSize / 1024) + "KB"
            },
            processingTime: new Date().toISOString(),
            dataSourcesGenerated: 3,
            includesIframeContent: iframeContentSize > 0
        };
    }
}

module.exports = new DataExtractionController();
