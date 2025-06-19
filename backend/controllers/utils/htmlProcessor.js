// controllers/edgeExtension/utils/htmlProcessor.js
/**
 * HTML Processing Utilities
 * For HTML content processing, cleaning and iframe merging
 */

class HTMLProcessor {
    /**
     * Merge iframe content into main page HTML
     */
    mergeIframeContents($, htmlContent, iframeContents = []) {
        console.log("🔧 Merging iframe contents into main page...");
        
        const mainPageIframes = $("iframe");
        let mergedContent = htmlContent;
        let processedIframes = [];
        
        console.log(`🔧 Found ${mainPageIframes.length} iframes in main page HTML`);
        console.log(`🔧 Received ${iframeContents.length} iframe contents from frontend`);
        
        // Process direct iframe tags in main page
        const processedMainIframeSrcs = new Set();
        
        for (let i = 0; i < mainPageIframes.length; i++) {
            const iframe = mainPageIframes[i];
            const src = $(iframe).attr("src") || `iframe-${i}`;
            const name = $(iframe).attr("name") || `iframe-${i}`;
            
            // Find matching iframe content
            let matchedIframeData = null;
            
            for (const iframeData of iframeContents) {
                if (iframeData.src && iframeData.src === src && iframeData.content) {
                    matchedIframeData = iframeData;
                    break;
                }
            }
            
            // If no match found by src, try matching by index
            if (!matchedIframeData && iframeContents[i] && iframeContents[i].content) {
                matchedIframeData = iframeContents[i];
            }
            
            if (matchedIframeData && matchedIframeData.content) {
                // Replace iframe tag with frontend-extracted content
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
                console.log(`🔧 ✅ Replaced iframe ${i + 1} (${src}): ${matchedIframeData.content.length} characters`);
            } else {
                processedIframes.push({
                    index: i,
                    name: name,
                    src: src,
                    content: null,
                    size: 0,
                    source: "not-available",
                    type: "main-page-iframe",
                    error: "No matching content found"
                });
                console.log(`🔧 ❌ Iframe ${i + 1} (${src}): No content available`);
            }
        }
        
        // Get current merged content
        mergedContent = $.html();
        
        // Add other iframe content (including nested iframes)
        let additionalIframeContent = "";
        
        for (const iframeData of iframeContents) {
            if (!processedMainIframeSrcs.has(iframeData.src) && iframeData.content) {
                const iframeSection = `\n\n<!-- ADDITIONAL_IFRAME_CONTENT: ${iframeData.src} -->\n${iframeData.content}\n<!-- END_ADDITIONAL_IFRAME_CONTENT -->\n`;
                additionalIframeContent += iframeSection;
                
                processedIframes.push({
                    index: iframeData.index,
                    name: iframeData.src,
                    src: iframeData.src,
                    content: iframeData.content,
                    size: iframeData.content.length,
                    source: "frontend-extracted",
                    type: "additional-iframe",
                    metadata: iframeData.metadata || {}
                });
                
                console.log(`🔧 ➕ Added additional iframe content (${iframeData.src}): ${iframeData.content.length} characters`);
            }
        }
        
        // Add additional iframe content to end of page
        if (additionalIframeContent) {
            mergedContent += additionalIframeContent;
        }
        
        return {
            mergedContent,
            processedIframes
        };
    }

    /**
     * Clean HTML content
     */
    cleanHTML($) {
        this.removeUnwantedElements($);
        this.cleanAttributes($);
        return this.extractMainContent($);
    }

    /**
     * Remove unnecessary elements
     */
    removeUnwantedElements($) {
        // Remove scripts, styles and other unnecessary elements
        $("script, style, noscript").remove();
        $("meta, link[rel='stylesheet']").remove();
        $(".advertisement, .ad, .ads, .sponsored").remove();
        $("nav, footer, header .navbar").remove();
        $(".cookie-notice, .popup, .modal").remove();
    }

    /**
     * Clean attributes
     */
    cleanAttributes($) {
        // Remove event handlers and style attributes
        $("*").each(function() {
            const element = $(this);
            const attributes = this.attribs || {};
            
            Object.keys(attributes).forEach(attr => {
                if (attr.startsWith("on") || attr === "style" || attr.startsWith("data-")) {
                    element.removeAttr(attr);
                }
            });
        });
    }

    /**
     * Extract main content areas
     */
    extractMainContent($) {
        // Try to find main content area
        const contentSelectors = [
            "main", 
            "[role='main']", 
            ".main-content", 
            "#main", 
            ".content", 
            "article",
            ".post-content",
            ".entry-content"
        ];
        
        for (const selector of contentSelectors) {
            const element = $(selector);
            if (element.length && element.text().trim().length > 100) {
                return element.html();
            }
        }
        
        // If no main content area found, return body content
        return $("body").html() || $.html();
    }

    /**
     * Extract structured data
     */
    extractStructuredData($) {
        const tables = $("table").length;
        const forms = $("form").length;
        const lists = $("ul, ol").length;
        const headers = $("h1, h2, h3, h4, h5, h6").length;
        const links = $("a[href]").length;
        const images = $("img[src]").length;
        
        return {
            tables,
            forms,
            lists,
            headers,
            links,
            images,
            hasStructuredData: tables > 0 || forms > 0 || lists > 2
        };
    }
}

module.exports = new HTMLProcessor();
