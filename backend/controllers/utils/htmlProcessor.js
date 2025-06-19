// controllers/edgeExtension/utils/htmlProcessor.js
/**
 * HTML Processing Utilities
 * 用于HTML内容处理、清理和iframe合并
 */

class HTMLProcessor {
    /**
     * 合并iframe内容到主页面HTML中
     */
    mergeIframeContents($, htmlContent, iframeContents = []) {
        console.log("🔧 Merging iframe contents into main page...");
        
        const mainPageIframes = $("iframe");
        let mergedContent = htmlContent;
        let processedIframes = [];
        
        console.log(`🔧 Found ${mainPageIframes.length} iframes in main page HTML`);
        console.log(`🔧 Received ${iframeContents.length} iframe contents from frontend`);
        
        // 处理主页面中的直接iframe标签
        const processedMainIframeSrcs = new Set();
        
        for (let i = 0; i < mainPageIframes.length; i++) {
            const iframe = mainPageIframes[i];
            const src = $(iframe).attr("src") || `iframe-${i}`;
            const name = $(iframe).attr("name") || `iframe-${i}`;
            
            // 查找匹配的iframe内容
            let matchedIframeData = null;
            
            for (const iframeData of iframeContents) {
                if (iframeData.src && iframeData.src === src && iframeData.content) {
                    matchedIframeData = iframeData;
                    break;
                }
            }
            
            // 如果没有通过src匹配到，尝试通过索引匹配
            if (!matchedIframeData && iframeContents[i] && iframeContents[i].content) {
                matchedIframeData = iframeContents[i];
            }
            
            if (matchedIframeData && matchedIframeData.content) {
                // 使用前端提取的内容替换iframe标签
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
        
        // 获取当前合并后的内容
        mergedContent = $.html();
        
        // 添加其他的iframe内容（包括嵌套的iframe）
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
        
        // 将额外的iframe内容添加到页面末尾
        if (additionalIframeContent) {
            mergedContent += additionalIframeContent;
        }
        
        return {
            mergedContent,
            processedIframes
        };
    }

    /**
     * 清理HTML内容
     */
    cleanHTML($) {
        this.removeUnwantedElements($);
        this.cleanAttributes($);
        return this.extractMainContent($);
    }

    /**
     * 移除不需要的元素
     */
    removeUnwantedElements($) {
        // 移除脚本、样式和其他不需要的元素
        $("script, style, noscript").remove();
        $("meta, link[rel='stylesheet']").remove();
        $(".advertisement, .ad, .ads, .sponsored").remove();
        $("nav, footer, header .navbar").remove();
        $(".cookie-notice, .popup, .modal").remove();
    }

    /**
     * 清理属性
     */
    cleanAttributes($) {
        // 移除事件处理器和样式属性
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
     * 提取主要内容区域
     */
    extractMainContent($) {
        // 尝试找到主要内容区域
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
        
        // 如果没有找到主要内容区域，返回body内容
        return $("body").html() || $.html();
    }

    /**
     * 提取结构化数据
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
