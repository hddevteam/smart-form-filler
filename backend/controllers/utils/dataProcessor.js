// controllers/edgeExtension/utils/dataProcessor.js
/**
 * Data Processing Utilities
 * 用于数据分析、统计和内容处理
 */

class DataProcessor {
    /**
     * 内容分块
     */
    chunkContent(content, maxChunkSize = 4000) {
        if (!content || content.length <= maxChunkSize) {
            return [content || ""];
        }

        const chunks = [];
        const sentences = content.split(/[.!?]+/);
        let currentChunk = "";

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxChunkSize) {
                currentChunk += sentence + ". ";
            } else {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = sentence + ". ";
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * 后处理 Markdown
     */
    postProcessMarkdown(markdown) {
        if (!markdown) return "";

        let processed = markdown;
        
        // 清理多余的空行
        processed = processed.replace(/\n{3,}/g, "\n\n");
        
        // 修复表格格式
        processed = processed.replace(/\|\s*\|\s*\|/g, "| | |");
        
        // 清理HTML实体
        processed = processed.replace(/&nbsp;/g, " ");
        processed = processed.replace(/&amp;/g, "&");
        processed = processed.replace(/&lt;/g, "<");
        processed = processed.replace(/&gt;/g, ">");
        
        // 修复链接格式
        processed = processed.replace(/\[([^\]]*)\]\(\s*\)/g, "$1");
        
        return processed.trim();
    }

    /**
     * 词数统计
     */
    countWords(text) {
        if (!text) return 0;
        
        // 移除Markdown标记
        const cleanText = text
            .replace(/[#*_`[\]()]/g, "")
            .replace(/!\[.*?\]\(.*?\)/g, "")
            .replace(/\[.*?\]\(.*?\)/g, "");
        
        const words = cleanText.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length;
    }

    /**
     * 阅读时间估算
     */
    estimateReadingTime(text) {
        const wordCount = this.countWords(text);
        const wordsPerMinute = 200; // 平均阅读速度
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    }

    /**
     * 生成分析信息
     */
    generateAnalysisInfo(dataSources) {
        const raw = dataSources.raw;
        const cleaned = dataSources.cleaned;
        const markdown = dataSources.markdown;

        return {
            overview: {
                totalSources: 3,
                originalSize: raw.originalSize || raw.size,
                finalMarkdownSize: markdown.size,
                overallCompression: ((raw.originalSize || raw.size) - markdown.size) / (raw.originalSize || raw.size),
                processingTime: new Date().toISOString()
            },
            dataQuality: {
                rawDataIntegrity: raw.metadata?.iframes ? "iframe-merged" : "single-page",
                cleaningEffectiveness: (raw.size - cleaned.size) / raw.size,
                markdownConversion: cleaned.size > 0 ? markdown.size / cleaned.size : 0,
                structuredDataPreserved: cleaned.metadata?.hasStructuredData || false
            },
            contentMetrics: {
                estimatedWordCount: markdown.metadata?.wordCount || 0,
                estimatedReadingTime: markdown.metadata?.readingTime || "0 minutes",
                contentChunks: markdown.metadata?.chunks || 0,
                averageChunkSize: markdown.metadata?.chunks ? Math.round(markdown.size / markdown.metadata.chunks) : 0
            },
            extractionDetails: {
                iframeProcessing: {
                    totalIframes: raw.metadata?.totalIframes || 0,
                    processedIframes: raw.metadata?.processedIframes || 0,
                    successRate: raw.metadata?.totalIframes ? 
                        (raw.metadata.processedIframes / raw.metadata.totalIframes) : 0
                },
                htmlCleaning: {
                    elementsRemoved: cleaned.metadata?.cleaningSteps?.length || 0,
                    structurePreserved: cleaned.metadata?.hasStructuredData || false,
                    tablesFound: cleaned.metadata?.tables || 0,
                    formsFound: cleaned.metadata?.forms || 0
                }
            }
        };
    }

    /**
     * Generate statistics about the extraction process
     */
    generateStats(dataSources) {
        // Get real original sizes from raw data source metadata
        const originalSize = dataSources.raw.metadata.originalSize || 0;
        const mainPageSize = dataSources.raw.metadata.mainPageSize || 0;
        const iframeContentSize = dataSources.raw.metadata.iframeContentSize || 0;
        
        const cleanedSize = dataSources.cleaned.metadata.cleanedSize || 0;
        const markdownSize = dataSources.markdown.metadata.markdownSize || 0;

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

    /**
     * 优化内容大小
     */
    optimizeContentSize(content) {
        if (!content || content.length <= 100000) {
            return content;
        }

        console.log(`🔧 Optimizing large content: ${content.length} characters`);
        
        // 保留前80%的内容，丢弃末尾部分
        const optimizedContent = content.substring(0, Math.floor(content.length * 0.8));
        
        console.log(`🔧 Content optimized: ${content.length} → ${optimizedContent.length} characters`);
        
        return optimizedContent;
    }

    /**
     * 优化iframe内容
     */
    optimizeIframeContents(iframeContents) {
        if (!iframeContents || iframeContents.length === 0) {
            return iframeContents;
        }

        // 保持iframe内容完整，不进行截断优化
        return iframeContents.map(iframe => {
            if (iframe.content && iframe.content.length > 50000) {
                console.log(`🔧 Large iframe content detected (${iframe.content.length} chars) for ${iframe.src}, keeping full content`);
            }
            return iframe;
        });
    }
}

module.exports = new DataProcessor();
