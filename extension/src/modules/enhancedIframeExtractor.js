/* global chrome */
// modules/enhancedIframeExtractor.js
/**
 * Enhanced Iframe Extractor Module
 * 专门处理多层嵌套iframe的内容提取，确保所有iframe内容都被正确传递到后端
 */

class EnhancedIframeExtractor {
    constructor() {
        
        this.extractedIframes = new Map(); // 存储所有提取的iframe数据
        this.iframeHierarchy = []; // 存储iframe的层次结构
    }

    /**
     * 增强的iframe内容提取
     * 确保所有层级的iframe都被正确处理
     */
    async enhancedExtractIframeContents(tab) {
        try {
            
            
            // 检查content script是否ready
            const isReady = await this.waitForContentScript(tab);
            if (!isReady) {
                
                return [];
            }

            return new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, { action: "extractContentWithIframes" }, (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        
                        resolve([]);
                        return;
                    }

                    const enhancedIframeContents = this.processIframeExtractionResponse(response);
                    resolve(enhancedIframeContents);
                });
            });

        } catch (error) {
            console.error("❌ Enhanced iframe extraction error:", error);
            return [];
        }
    }

    /**
     * 处理从content script返回的iframe数据
     */
    processIframeExtractionResponse(response) {
        const iframeContents = [];
        
        if (!response.data || !response.data.iframes) {
            
            return iframeContents;
        }

        const iframes = response.data.iframes;

        // 详细分析每个iframe
        iframes.forEach((iframe, index) => {
                indexPath: iframe.indexPath,
                src: iframe.src,
                accessible: iframe.accessible,
                hasContent: !!(iframe.content && iframe.content.html),
                contentLength: iframe.content?.html?.length || 0,
                error: iframe.error
            });

            // 创建增强的iframe数据结构
            const enhancedIframeData = {
                originalIndex: index,
                indexPath: iframe.indexPath || `${index}`,
                depth: iframe.depth || 0,
                src: iframe.src || `iframe-${index}`,
                name: iframe.name || `iframe-${iframe.indexPath || index}`,
                content: "",
                hasContent: false,
                contentLength: 0,
                metadata: {
                    accessible: false,
                    originalAccessible: iframe.accessible,
                    title: "",
                    url: "",
                    domain: "",
                    extractionMethod: "enhanced",
                    processingTimestamp: new Date().toISOString()
                }
            };

            // 检查并处理iframe内容
            if (iframe.content && iframe.content.html) {
                const htmlContent = iframe.content.html;
                const contentLength = htmlContent.length;
                
                // 只要有内容就包含，不设置最小长度限制
                if (contentLength > 0) {
                    enhancedIframeData.content = htmlContent;
                    enhancedIframeData.hasContent = true;
                    enhancedIframeData.contentLength = contentLength;
                    enhancedIframeData.metadata.accessible = true;
                    enhancedIframeData.metadata.title = iframe.content.title || "";
                    enhancedIframeData.metadata.url = iframe.content.url || "";
                    enhancedIframeData.metadata.domain = iframe.content.domain || "";
                    
                } else {
                    enhancedIframeData.metadata.error = "Content is empty";
                }
            } else {
                enhancedIframeData.metadata.error = iframe.error || "No content object available";
            }

            // 添加iframe层次信息
            enhancedIframeData.hierarchy = this.parseIframeHierarchy(iframe.indexPath || `${index}`);
            
            iframeContents.push(enhancedIframeData);
        });

        // 按层次结构排序
        iframeContents.sort((a, b) => {
            return a.indexPath.localeCompare(b.indexPath, undefined, { numeric: true });
        });

        // 生成统计信息
        const stats = this.generateExtractionStats(iframeContents);

        return iframeContents;
    }

    /**
     * 解析iframe层次结构
     */
    parseIframeHierarchy(indexPath) {
        const parts = indexPath.split(".");
        return {
            level: parts.length - 1,
            parentPath: parts.slice(0, -1).join(".") || null,
            siblingIndex: parseInt(parts[parts.length - 1]),
            fullPath: indexPath
        };
    }

    /**
     * 生成提取统计信息
     */
    generateExtractionStats(iframeContents) {
        const stats = {
            total: iframeContents.length,
            withContent: 0,
            withoutContent: 0,
            totalContentSize: 0,
            byDepth: {},
            averageContentSize: 0,
            largestContent: 0,
            smallestContent: Infinity
        };

        iframeContents.forEach(iframe => {
            if (iframe.hasContent) {
                stats.withContent++;
                stats.totalContentSize += iframe.contentLength;
                stats.largestContent = Math.max(stats.largestContent, iframe.contentLength);
                stats.smallestContent = Math.min(stats.smallestContent, iframe.contentLength);
            } else {
                stats.withoutContent++;
            }

            // 按深度统计
            const depth = iframe.depth;
            if (!stats.byDepth[depth]) {
                stats.byDepth[depth] = { count: 0, withContent: 0 };
            }
            stats.byDepth[depth].count++;
            if (iframe.hasContent) {
                stats.byDepth[depth].withContent++;
            }
        });

        if (stats.withContent > 0) {
            stats.averageContentSize = Math.round(stats.totalContentSize / stats.withContent);
        }
        if (stats.smallestContent === Infinity) {
            stats.smallestContent = 0;
        }

        return stats;
    }

    /**
     * 等待content script准备就绪
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
                
                // 等待下次重试
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
                
            } catch (error) {
            }
        }
        
        
        return false;
    }

    /**
     * 验证iframe数据的完整性
     */
    validateIframeData(iframeContents) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            summary: {}
        };

        if (!Array.isArray(iframeContents)) {
            validation.isValid = false;
            validation.errors.push("iframeContents is not an array");
            return validation;
        }

        let duplicateSrcs = new Set();
        let srcCounts = {};

        iframeContents.forEach((iframe, index) => {
            // 检查必要字段
            if (!iframe.indexPath) {
                validation.warnings.push(`Iframe ${index} missing indexPath`);
            }
            if (!iframe.src) {
                validation.warnings.push(`Iframe ${index} missing src`);
            }

            // 检查重复的src
            if (iframe.src) {
                srcCounts[iframe.src] = (srcCounts[iframe.src] || 0) + 1;
                if (srcCounts[iframe.src] > 1) {
                    duplicateSrcs.add(iframe.src);
                }
            }

            // 检查内容一致性
            if (iframe.hasContent && !iframe.content) {
                validation.errors.push(`Iframe ${iframe.indexPath || index} marked as hasContent but content is empty`);
                validation.isValid = false;
            }
        });

        if (duplicateSrcs.size > 0) {
            validation.warnings.push(`Duplicate iframe sources found: ${Array.from(duplicateSrcs).join(", ")}`);
        }

        validation.summary = {
            totalIframes: iframeContents.length,
            withContent: iframeContents.filter(iframe => iframe.hasContent).length,
            duplicateSources: duplicateSrcs.size,
            validationPassed: validation.isValid
        };

        return validation;
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = EnhancedIframeExtractor;
}
