// modules/copyHandler.js
/**
 * Copy Handler Module
 * Handles all copy functionality for extension results
 */

class CopyHandler {
    constructor(elements, resultsHandler) {
        this.elements = elements;
        this.resultsHandler = resultsHandler;
        this.copyInProgress = false;
        console.log("🔧 CopyHandler initialized");
    }

    /**
     * Main copy handler method
     */
    async handleCopy() {
        console.log("🚀 handleCopy method called!");
        
        // 防抖检查：如果复制正在进行中，直接返回
        if (this.copyInProgress) {
            console.log("⚠️ Copy operation already in progress, ignoring duplicate call");
            return;
        }
        
        this.copyInProgress = true;
        
        // 添加复制状态指示（添加null检查）
        const copyBtn = this.elements.copyBtn;
        const originalText = copyBtn ? copyBtn.textContent : "Copy";
        
        console.log("🔧 Copy button element:", copyBtn);
        console.log("🔧 Original text:", originalText);
        
        if (copyBtn) {
            copyBtn.textContent = "Copying...";
            copyBtn.disabled = true;
        }
        
        try {
            console.log("🔧 Starting copy operation...");
            
            // 检查Results区域是否可见
            const resultsSection = document.getElementById("resultsSection");
            console.log("🔧 Results section exists:", !!resultsSection);
            console.log("🔧 Results section is hidden:", resultsSection ? resultsSection.classList.contains("hidden") : "N/A");
            
            if (!resultsSection || resultsSection.classList.contains("hidden")) {
                console.warn("⚠️ Results section is not visible, cannot copy");
                this.showError("No results to copy. Please extract data first.");
                return;
            }
            
            let textToCopy = "";
            
            // 更安全的方式：直接根据当前活跃的tab获取内容
            const activeTab = document.querySelector(".results-tab--active");
            console.log("🔧 Active tab found:", !!activeTab, activeTab ? activeTab.dataset?.tab : "none");
            
            if (!activeTab || !activeTab.dataset || !activeTab.dataset.tab) {
                console.warn("⚠️ No active tab found or tab has no dataset");
                
                // 尝试从markdown作为默认回退
                console.log("🔧 Attempting fallback to markdown content...");
                if (this.elements.markdownText && this.elements.markdownText.textContent) {
                    textToCopy = this.elements.markdownText.textContent;
                    console.log("🔧 Fallback: got markdown text:", textToCopy.length, "characters");
                } else {
                    this.showError("No active tab found and no fallback content available");
                    return;
                }
            } else {
                const tabContent = activeTab.dataset.tab;
                console.log("🔧 Processing tab:", tabContent);
                
                try {
                    switch (tabContent) {
                    case "markdown":
                        textToCopy = this.getMarkdownText();
                        break;
                    case "html":
                        textToCopy = this.getHTMLSourceCode();
                        break;
                    case "cleaned-html":
                        textToCopy = this.getCleanedHTMLSourceCode();
                        break;
                    case "metadata":
                        textToCopy = this.getMetadataText();
                        break;
                    default:
                        textToCopy = this.getMarkdownText();
                    }
                } catch (switchError) {
                    console.error("❌ Error in switch statement:", switchError);
                    this.showError("Error processing content: " + switchError.message);
                    return;
                }
            }
            
            if (!textToCopy || !textToCopy.trim()) {
                console.warn("🔧 No content to copy, length:", textToCopy ? textToCopy.length : 0);
                this.showError("No content to copy");
                return;
            }

            console.log("🔧 Final text to copy length:", textToCopy.length);

            // 使用Chrome扩展的clipboard API进行复制
            await this.copyWithChromeExtension(textToCopy);
            
        } catch (error) {
            console.error("❌ Copy operation failed:", error);
            this.showError("Copy failed: " + error.message);
        } finally {
            // 恢复复制按钮状态（无论成功还是失败）
            this.copyInProgress = false;
            
            if (copyBtn) {
                copyBtn.disabled = false;
                copyBtn.textContent = originalText;
            }
            
            console.log("🔧 Copy operation cleanup completed");
        }
    }

    /**
     * Get markdown text content
     */
    getMarkdownText() {
        console.log("🔧 Getting markdown text from element:", !!this.elements.markdownText);
        if (this.elements.markdownText) {
            const content = this.elements.markdownText.textContent || this.elements.markdownText.innerText || "";
            if (content && content.trim()) {
                console.log("🔧 Got markdown text:", content.length, "characters");
                return content;
            } else {
                console.warn("⚠️ markdownText element has no content");
                throw new Error("Markdown content is empty. Please extract data first.");
            }
        } else {
            console.warn("⚠️ markdownText element is null");
            throw new Error("Markdown element not found");
        }
    }

    /**
     * Get HTML source code
     */
    getHTMLSourceCode() {
        console.log("🔧 Getting HTML source code via method");
        
        const lastExtractionResult = this.resultsHandler.getLastExtractionResult();
        
        if (!lastExtractionResult) {
            console.warn("⚠️ No extraction result available");
            throw new Error("No extraction data available. Please extract data first.");
        }
        
        console.log("🔧 Last extraction result structure:");
        console.log("  - raw exists:", !!lastExtractionResult.raw);
        console.log("  - raw content length:", lastExtractionResult.raw?.content?.length || 0);
        
        if (lastExtractionResult.raw && lastExtractionResult.raw.content) {
            const htmlContent = lastExtractionResult.raw.content;
            if (htmlContent && htmlContent.trim()) {
                console.log("🔧 Got HTML source code from extraction result:", htmlContent.length, "characters");
                return htmlContent;
            } else {
                throw new Error("HTML content is empty in extraction result");
            }
        } else {
            console.warn("⚠️ No raw HTML content in extraction result");
            
            // 回退到元素内容
            if (this.elements.htmlText) {
                const fallbackContent = this.elements.htmlText.textContent || this.elements.htmlText.innerText || "";
                if (fallbackContent && fallbackContent.trim()) {
                    console.log("🔧 Using fallback HTML content from element:", fallbackContent.length, "characters");
                    return fallbackContent;
                } else {
                    throw new Error("HTML content is empty. Please extract data first.");
                }
            } else {
                throw new Error("HTML element not found and no extraction data available");
            }
        }
    }

    /**
     * Get cleaned HTML source code
     */
    getCleanedHTMLSourceCode() {
        console.log("🔧 Getting cleaned HTML source code via method");
        
        const lastExtractionResult = this.resultsHandler.getLastExtractionResult();
        
        if (!lastExtractionResult) {
            console.warn("⚠️ No extraction result available");
            throw new Error("No extraction data available. Please extract data first.");
        }
        
        console.log("🔧 Last extraction result structure:");
        console.log("  - cleaned exists:", !!lastExtractionResult.cleaned);
        console.log("  - cleaned content length:", lastExtractionResult.cleaned?.content?.length || 0);
        
        if (lastExtractionResult.cleaned && lastExtractionResult.cleaned.content) {
            const cleanedContent = lastExtractionResult.cleaned.content;
            if (cleanedContent && cleanedContent.trim()) {
                console.log("🔧 Got cleaned HTML source code from extraction result:", cleanedContent.length, "characters");
                return cleanedContent;
            } else {
                throw new Error("Cleaned HTML content is empty in extraction result");
            }
        } else {
            console.warn("⚠️ No cleaned HTML content in extraction result");
            
            // 回退到元素内容
            if (this.elements.cleanedHtmlText) {
                const fallbackContent = this.elements.cleanedHtmlText.textContent || this.elements.cleanedHtmlText.innerText || "";
                if (fallbackContent && fallbackContent.trim()) {
                    console.log("🔧 Using fallback cleaned HTML content from element:", fallbackContent.length, "characters");
                    return fallbackContent;
                } else {
                    throw new Error("Cleaned HTML content is empty. Please extract data first.");
                }
            } else {
                throw new Error("Cleaned HTML element not found and no extraction data available");
            }
        }
    }

    /**
     * Get metadata text content
     */
    getMetadataText() {
        console.log("🔧 Getting metadata text from element:", !!this.elements.metadataData);
        if (this.elements.metadataData) {
            const content = this.elements.metadataData.textContent || this.elements.metadataData.innerText || "";
            if (content && content.trim()) {
                console.log("🔧 Got metadata text:", content.length, "characters");
                return content;
            } else {
                console.warn("⚠️ metadataData element has no content");
                throw new Error("Metadata content is empty. Please extract data first.");
            }
        } else {
            console.warn("⚠️ metadataData element is null");
            throw new Error("Metadata element not found");
        }
    }

    /**
     * Copy text using Chrome extension clipboard API
     */
    async copyWithChromeExtension(text) {
        try {
            console.log("🔧 Attempting Chrome extension clipboard write...");
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                console.log("✅ Successfully copied using navigator.clipboard");
                this.showSuccess("Content copied to clipboard!");
            } else {
                console.log("🔧 navigator.clipboard not available, trying fallback...");
                this.fallbackCopyToClipboard(text);
            }
        } catch (error) {
            console.error("❌ Chrome extension clipboard failed:", error);
            console.log("🔧 Attempting fallback copy method...");
            this.fallbackCopyToClipboard(text);
        }
    }

    /**
     * Fallback copy method using document.execCommand
     */
    fallbackCopyToClipboard(text) {
        try {
            console.log("🔧 Using fallback copy method...");
            
            // 创建临时textarea元素
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            // 尝试使用execCommand复制
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            
            if (successful) {
                console.log("✅ Fallback copy successful using execCommand");
                this.showSuccess("Content copied to clipboard!");
            } else {
                console.error("❌ Fallback copy failed");
                throw new Error("Fallback copy method failed");
            }
        } catch (error) {
            console.error("❌ All copy methods failed:", error);
            this.showError("Copy to clipboard failed. Please manually select and copy the content.");
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Simple success indication - could be enhanced with proper UI
        console.log("✅ Success:", message);
        // You could add a toast notification here
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error("❌ Error:", message);
        // Use the results handler to show error
        if (this.resultsHandler && this.resultsHandler.showError) {
            this.resultsHandler.showError(message);
        }
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = CopyHandler;
}
