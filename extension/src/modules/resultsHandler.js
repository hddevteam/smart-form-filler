// modules/resultsHandler.js
/**
 * Results Handler Module
 * Handles display and processing of extraction and summary results
 */

class ResultsHandler {
    constructor(elements, uiController = null) {
        console.log("🔧 ResultsHandler: Constructor called with elements:", {
            elements: !!elements,
            errorState: !!elements?.errorState,
            errorMessage: !!elements?.errorMessage,
            resultsSection: !!elements?.resultsSection
        });
        
        this.elements = elements;
        this.uiController = uiController; // Optional UI controller reference
        this.lastExtractionResult = null;
        this.extractionHistory = []; // Store all extraction results
        this.currentViewIndex = -1; // Index of currently viewed item
        console.log("🔧 ResultsHandler initialized with history support");
    }

    /**
     * Show extraction results in the UI (add to history)
     */
    showExtractionResults(response) {
        if (!response.success) {
            this.showError(response.message || "Extraction failed");
            return;
        }

        const { dataSources, stats } = response;
        const currentPageUrl = response.currentPageUrl || "";
        
        // Create history item
        const historyItem = {
            id: Date.now(),
            timestamp: new Date(),
            url: currentPageUrl,
            title: response.title || this.extractPageTitle(currentPageUrl, dataSources),
            dataSources: dataSources,
            stats: stats
        };
        
        // Add to history (at the beginning)
        this.extractionHistory.unshift(historyItem);
        
        // Store the last extraction result for copy functionality
        this.lastExtractionResult = dataSources;
        
        // Notify data source manager about extraction history update
        this.notifyExtractionHistoryUpdated();
        
        // Refresh the history display
        this.refreshHistoryDisplay();
        
        // Update main chat button state
        this.updateMainChatButtonState();
        
        // Show the results section
        this.elements.resultsSection.classList.remove("hidden");
        
        console.log(`📊 Added extraction result to history. Total items: ${this.extractionHistory.length}`);
    }

    /**
     * Extract page title from URL or content (fallback method)
     * This method is used only when the real page title is not available from the API response
     */
    extractPageTitle(url, dataSources) {
        try {
            // First priority: Try to extract title from markdown content (usually contains the real page title)
            if (dataSources.markdown && dataSources.markdown.content) {
                const titleMatch = dataSources.markdown.content.match(/^#\s+(.+)$/m);
                if (titleMatch) {
                    return titleMatch[1].trim();
                }
            }
            
            // Second priority: Try to extract from HTML <title> tag in raw content
            if (dataSources.raw && dataSources.raw.content) {
                const titleMatch = dataSources.raw.content.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1].trim()) {
                    return titleMatch[1].trim();
                }
            }
            
            // Third priority: Try to extract from HTML <title> tag in cleaned content
            if (dataSources.cleaned && dataSources.cleaned.content) {
                const titleMatch = dataSources.cleaned.content.match(/<title[^>]*>([^<]+)<\/title>/i);
                if (titleMatch && titleMatch[1].trim()) {
                    return titleMatch[1].trim();
                }
            }
            
            // Last resort: Generate title from URL
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.replace(/^www\./, "");
            const pathname = urlObj.pathname;
            
            if (pathname && pathname !== "/") {
                const pathParts = pathname.split("/").filter(part => part);
                const lastPart = pathParts[pathParts.length - 1];
                if (lastPart) {
                    return `${hostname} - ${lastPart.replace(/[-_]/g, " ")}`;
                }
            }
            
            return hostname;
        } catch (error) {
            console.warn("Error extracting page title:", error);
            return url || "Unknown Page";
        }
    }

    /**
     * Refresh the history display
     */
    refreshHistoryDisplay() {
        if (!this.elements.historyContainer) {
            console.warn("History container element not found");
            return;
        }

        // Clear current display
        this.elements.historyContainer.innerHTML = "";
        
        if (this.extractionHistory.length === 0) {
            this.showEmptyState();
            return;
        }

        // Create history items
        this.extractionHistory.forEach((item, index) => {
            const historyElement = this.createHistoryItemElement(item, index);
            this.elements.historyContainer.appendChild(historyElement);
        });
        
        // Hide detail view and show history list
        this.showHistoryList();
    }

    /**
     * Create a history item element
     */
    createHistoryItemElement(item, index) {
        const element = document.createElement("div");
        element.className = `history-item${index === 0 ? " history-item--latest" : ""}`;
        element.dataset.index = index;
        
        const timestamp = this.formatTimestamp(item.timestamp);
        const statsText = this.formatStats(item.stats);
        
        element.innerHTML = `
            <div class="history-item__header">
                <h4 class="history-item__title">${this.escapeHtml(item.title)}</h4>
                <span class="history-item__timestamp">${timestamp}</span>
            </div>
            <a href="${item.url}" class="history-item__url" title="${this.escapeHtml(item.url)}" target="_blank">${this.escapeHtml(item.url)}</a>
            <div class="history-item__stats">
                <div class="history-item__stat">
                    <span>📄</span>
                    <span>${statsText}</span>
                </div>
            </div>
            <div class="history-item__actions">
                <button class="history-item__action-btn" data-action="select" title="Select as Data Source">📌</button>
                <button class="history-item__action-btn" data-action="view" title="View Details">👁️</button>
                <button class="history-item__action-btn history-item__action-btn--delete" data-action="delete" title="Delete">🗑️</button>
            </div>
        `;
        
        // Add click handlers
        element.addEventListener("click", (e) => {
            if (e.target.dataset.action === "delete") {
                e.stopPropagation();
                this.deleteHistoryItem(index);
            } else if (e.target.dataset.action === "view") {
                e.stopPropagation();
                this.viewHistoryItem(index);
            } else if (e.target.dataset.action === "select") {
                e.stopPropagation();
                this.selectDataSource(index);
            } else if (!e.target.closest(".history-item__actions")) {
                e.stopPropagation();
                this.viewHistoryItem(index);
            }
        });
        
        return element;
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return timestamp.toLocaleDateString();
    }

    /**
     * Format stats for display
     */
    formatStats(stats) {
        if (!stats) return "No stats";
        
        const originalKB = Math.round(stats.originalSize / 1024);
        const markdownKB = Math.round(stats.markdownSize / 1024);
        
        return `${originalKB}KB → ${markdownKB}KB`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.historyContainer.innerHTML = `
            <div class="history-empty">
                <div class="history-empty__icon">📊</div>
                <div class="history-empty__title">No Extractions Yet</div>
                <div class="history-empty__description">
                    Navigate to any webpage and click "Extract Data Sources" to start building your extraction history.
                </div>
            </div>
        `;
    }

    /**
     * View a specific history item
     */
    viewHistoryItem(index) {
        if (index < 0 || index >= this.extractionHistory.length) {
            console.warn("Invalid history index:", index);
            return;
        }
        
        const item = this.extractionHistory[index];
        this.currentViewIndex = index;
        
        // Set the current result for copy functionality
        this.lastExtractionResult = item.dataSources;
        
        // Show detail view
        this.showDetailView(item);
    }

    /**
     * Show detail view for a history item
     */
    showDetailView(item) {
        // Show extraction-specific tabs
        this.elements.markdownTab.classList.remove("hidden");
        this.elements.htmlTab.classList.remove("hidden");
        this.elements.cleanedHtmlTab.classList.remove("hidden");
        
        // Create URL header for different formats
        const urlHeaderMarkdown = `<!-- Source Page: ${item.url} -->\n\n`;
        const urlHeaderHtml = `<!-- Source Page: ${item.url} -->\n`;

        // Enhanced debugging for content sizes
        console.log("🔧 ResultsHandler: Displaying detail view with content sizes:", {
            markdownSize: item.dataSources.markdown?.content?.length || 0,
            rawHtmlSize: item.dataSources.raw?.content?.length || 0,
            cleanedHtmlSize: item.dataSources.cleaned?.content?.length || 0,
            totalDataSourceSize: JSON.stringify(item.dataSources).length
        });

        // Check for iframe content markers in raw HTML
        const rawContent = item.dataSources.raw?.content || "";
        const iframeMarkers = rawContent.match(/<!-- IFRAME_CONTENT_START:/g);
        const additionalIframeMarkers = rawContent.match(/<!-- ADDITIONAL_IFRAME_START:/g);
        console.log("🔧 ResultsHandler: Iframe content analysis:", {
            rawContentLength: rawContent.length,
            mainIframeMarkers: iframeMarkers ? iframeMarkers.length : 0,
            additionalIframeMarkers: additionalIframeMarkers ? additionalIframeMarkers.length : 0,
            totalIframeMarkers: (iframeMarkers?.length || 0) + (additionalIframeMarkers?.length || 0)
        });

        // Populate all content areas (removed outputText)
        this.elements.markdownText.textContent = urlHeaderMarkdown + (item.dataSources.markdown?.content || "No markdown content available");
        this.elements.htmlText.textContent = urlHeaderHtml + (item.dataSources.raw?.content || "No raw HTML content available");
        this.elements.cleanedHtmlText.textContent = urlHeaderHtml + (item.dataSources.cleaned?.content || "No cleaned HTML content available");
        this.elements.metadataData.textContent = JSON.stringify({
            url: item.url,
            timestamp: item.timestamp.toISOString(),
            stats: item.stats
        }, null, 2);

        // Show detail view and hide history list
        this.elements.currentResultsDetail.classList.remove("hidden");
        this.elements.historyContainer.style.display = "none";
        
        // Reset to first tab
        this.switchResultTab("markdown");
    }

    /**
     * Show history list and hide detail view
     */
    showHistoryList() {
        this.elements.currentResultsDetail.classList.add("hidden");
        if (this.elements.historyContainer) {
            this.elements.historyContainer.style.display = "block";
        }
        this.currentViewIndex = -1;
    }

    /**
     * Delete a history item
     */
    deleteHistoryItem(index) {
        if (index < 0 || index >= this.extractionHistory.length) {
            console.warn("Invalid history index for deletion:", index);
            return;
        }
        
        // Remove item from history
        this.extractionHistory.splice(index, 1);
        
        // Notify data source manager about extraction history update
        this.notifyExtractionHistoryUpdated();
        
        // Update main chat button state
        this.updateMainChatButtonState();
        
        // If we're currently viewing this item, go back to history list
        if (this.currentViewIndex === index) {
            this.showHistoryList();
        } else if (this.currentViewIndex > index) {
            this.currentViewIndex--; // Adjust index if needed
        }
        
        // Refresh display
        this.refreshHistoryDisplay();
        
        console.log(`🗑️ Deleted history item. Remaining items: ${this.extractionHistory.length}`);
    }

    /**
     * Clear all history
     */
    clearAllHistory() {
        this.extractionHistory = [];
        this.currentViewIndex = -1;
        this.lastExtractionResult = null;
        
        // Notify data source manager about extraction history update
        this.notifyExtractionHistoryUpdated();
        
        this.refreshHistoryDisplay();
        this.updateMainChatButtonState();
        console.log("🗑️ Cleared all extraction history");
    }

    /**
     * Clear current result (go back to history list)
     */
    clearCurrentResult() {
        this.showHistoryList();
    }

    /**
     * Show summary results in the UI
     */
    showSummaryResults(response) {
        if (!response.success) {
            this.showError(response.message || "Summary failed");
            return;
        }

        const { result, selectedDataSource, recommendations } = response;
        const currentPageUrl = response.currentPageUrl || "";
        
        // Hide extraction-specific tabs
        this.elements.markdownTab.classList.add("hidden");
        this.elements.htmlTab.classList.add("hidden");
        this.elements.cleanedHtmlTab.classList.add("hidden");
        
        // Create URL header for summary result
        // Remove outputText reference as Output tab is removed
        
        this.elements.metadataData.textContent = JSON.stringify({
            sourcePageUrl: currentPageUrl,
            purpose: response.purpose,
            dataSource: selectedDataSource,
            recommendations: recommendations
        }, null, 2);
        
        // Update meta information
        this.elements.resultsMeta.textContent = 
            `Purpose: ${response.purpose} | Data source: ${selectedDataSource} | Model: ${response.model}`;
        
        this.elements.resultsSection.classList.remove("hidden");
        this.elements.errorState.classList.add("hidden");
    }

    /**
     * Format HTML for display
     */
    formatHTML(html) {
        // Basic HTML formatting for display
        return html.length > 2000 ? html.substring(0, 2000) + "...[truncated]" : html;
    }

    /**
     * Switch between result tabs
     */
    switchResultTab(tabName) {
        // Update tab states
        this.elements.resultsTabs.forEach(tab => {
            tab.classList.toggle("results-tab--active", tab.dataset.tab === tabName);
        });
        
        // Show corresponding panel (removed outputPanel from array)
        const panels = [this.elements.markdownPanel, 
            this.elements.htmlPanel, this.elements.cleanedHtmlPanel, this.elements.metadataPanel];
        panels.forEach(panel => panel && panel.classList.remove("results-panel--active"));
        
        switch (tabName) {
        case "markdown":
            this.elements.markdownPanel && this.elements.markdownPanel.classList.add("results-panel--active");
            break;
        case "html":
            this.elements.htmlPanel && this.elements.htmlPanel.classList.add("results-panel--active");
            break;
        case "cleaned-html":
            this.elements.cleanedHtmlPanel && this.elements.cleanedHtmlPanel.classList.add("results-panel--active");
            break;
        case "metadata":
            this.elements.metadataPanel && this.elements.metadataPanel.classList.add("results-panel--active");
            break;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.log("🔧 ResultsHandler: Showing error:", message);
        
        // Defensive check for elements
        if (!this.elements) {
            console.error("❌ ResultsHandler: elements not initialized");
            return;
        }
        
        if (!this.elements.errorMessage) {
            console.error("❌ ResultsHandler: errorMessage element not found");
            return;
        }
        
        if (!this.elements.errorState) {
            console.error("❌ ResultsHandler: errorState element not found");
            return;
        }
        
        if (!this.elements.resultsSection) {
            console.error("❌ ResultsHandler: resultsSection element not found");
            return;
        }
        
        this.elements.errorMessage.textContent = message;
        this.elements.errorState.classList.remove("hidden");
        this.elements.resultsSection.classList.add("hidden");
        
        console.log("✅ ResultsHandler: Error displayed successfully");
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log("✅ ResultsHandler: Success:", message);
        
        // Create success notification element
        const notification = document.createElement('div');
        notification.className = 'success-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        // Add CSS animation if not already added
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get the last extraction result
     */
    getLastExtractionResult() {
        return this.lastExtractionResult;
    }

    /**
     * Update main chat button state
     */
    updateMainChatButtonState() {
        if (this.uiController && this.uiController.updateMainChatButtonState) {
            this.uiController.updateMainChatButtonState(this.extractionHistory.length > 0);
        }
    }

    /**
     * Select a data source from history and sync across tabs
     */
    selectDataSource(index) {
        if (index < 0 || index >= this.extractionHistory.length) {
            console.warn("Invalid history index:", index);
            this.showError("Invalid data source selection");
            return;
        }

        const item = this.extractionHistory[index];
        console.log("📌 Selecting data source:", item.title);

        try {
            // Create data source configuration with consistent ID format
            // Use the same ID format as generated in popupDataSourceManager.js
            const consistentId = `extraction-${index}-main`;
            const dataSourceConfig = {
                type: 'markdown',
                selectedItems: [{
                    id: consistentId,
                    title: item.title,
                    url: item.url,
                    timestamp: item.timestamp,
                    content: this.combineDataSourceContent(item.dataSources)
                }]
            };

            console.log("📋 Data source config created:", {
                itemsCount: dataSourceConfig.selectedItems.length,
                contentLength: dataSourceConfig.selectedItems[0].content.length,
                title: dataSourceConfig.selectedItems[0].title
            });

            // Sync selection across all tabs
            const syncSuccess = this.syncDataSourceSelection(dataSourceConfig);

            if (syncSuccess) {
                // Show success message with data source type
                this.showSuccess(`✅ Selected "${item.title}" as Markdown data source`);
                
                // Add visual feedback to the selected item
                this.highlightSelectedItem(index);
                
                // Switch to Form Filler tab if available
                setTimeout(() => {
                    this.switchToFormFillerTab();
                }, 500);
            } else {
                this.showSuccess(`📌 Markdown data source "${item.title}" selected (manual sync may be needed)`);
            }
            
        } catch (error) {
            console.error("❌ Error selecting data source:", error);
            this.showError("Failed to select data source: " + error.message);
        }
    }

    /**
     * Highlight selected item with visual feedback
     */
    highlightSelectedItem(index) {
        // Remove previous selections
        document.querySelectorAll('.history-item--selected').forEach(item => {
            item.classList.remove('history-item--selected');
        });
        
        // Add selection to current item
        const selectedItem = document.querySelector(`[data-index="${index}"]`);
        if (selectedItem) {
            selectedItem.classList.add('history-item--selected');
            
            // Add CSS for selection if not already added
            if (!document.getElementById('selection-styles')) {
                const style = document.createElement('style');
                style.id = 'selection-styles';
                style.textContent = `
                    .history-item--selected {
                        border: 2px solid #28a745 !important;
                        background: #f8fff9 !important;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 8px rgba(40, 167, 69, 0.2) !important;
                    }
                    .history-item--selected .history-item__action-btn[data-action="select"] {
                        background: #28a745 !important;
                        color: white !important;
                    }
                    .history-item--selected .history-item__action-btn[data-action="select"]::after {
                        content: " Selected" !important;
                        font-size: 10px;
                        font-weight: bold;
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Auto-remove selection highlight after 3 seconds
            setTimeout(() => {
                if (selectedItem) {
                    selectedItem.classList.remove('history-item--selected');
                }
            }, 3000);
        }
    }

    /**
     * Combine data source content into markdown text
     */
    combineDataSourceContent(dataSources) {
        if (!dataSources) {
            return '';
        }

        // Handle single dataSources object (not array)
        if (dataSources.markdown && dataSources.markdown.content) {
            return dataSources.markdown.content;
        }
        
        if (dataSources.cleaned && dataSources.cleaned.content) {
            return dataSources.cleaned.content;
        }
        
        if (dataSources.raw && dataSources.raw.content) {
            return dataSources.raw.content;
        }

        // Handle array format (legacy support)
        if (Array.isArray(dataSources)) {
            const markdownParts = [];
            dataSources.forEach((source, index) => {
                if (source.markdown) {
                    markdownParts.push(`## Data Source ${index + 1}\n\n${source.markdown}`);
                } else if (source.text) {
                    markdownParts.push(`## Data Source ${index + 1}\n\n${source.text}`);
                }
            });
            return markdownParts.join('\n\n---\n\n');
        }

        return '';
    }

    /**
     * Sync data source selection across Chat and Form Filler tabs
     */
    syncDataSourceSelection(config) {
        try {
            // Try multiple ways to access the popup manager
            let popupManager = null;
            
            // Method 1: Global window reference
            if (window.popupManager) {
                popupManager = window.popupManager;
            }
            // Method 2: Through UI controller
            else if (this.uiController?.popupManager) {
                popupManager = this.uiController.popupManager;
            }
            // Method 3: Through direct property
            else if (this.popupManager) {
                popupManager = this.popupManager;
            }
            // Method 4: Try to find through DOM
            else {
                const popupElement = document.querySelector('[data-popup-manager]');
                if (popupElement?.popupManager) {
                    popupManager = popupElement.popupManager;
                }
            }
            
            if (popupManager?.dataSourceManager) {
                // Update Chat tab configuration
                popupManager.dataSourceManager.updateChatConfiguration(config);
                
                // Update Form Filler configuration 
                popupManager.dataSourceManager.updateFormFillerConfiguration(config);
                
                console.log("🔄 Data source selection synced across tabs");
                return true;
            } else {
                console.warn("⚠️ PopupManager or DataSourceManager not available for sync");
                
                // Fallback: try to dispatch custom event for manual handling
                const event = new CustomEvent('dataSourceSelected', {
                    detail: config
                });
                document.dispatchEvent(event);
                console.log("📡 Dispatched dataSourceSelected event as fallback");
                return false;
            }
        } catch (error) {
            console.error("❌ Error syncing data source selection:", error);
            return false;
        }
    }

    /**
     * Switch to Form Filler tab for streamlined workflow
     */
    switchToFormFillerTab() {
        try {
            const formFillerTab = document.getElementById('formFillerTab');
            if (formFillerTab) {
                formFillerTab.click();
                console.log("🔄 Switched to Form Filler tab");
            }
        } catch (error) {
            console.error("❌ Error switching to Form Filler tab:", error);
        }
    }

    /**
     * Notify data source manager about extraction history updates
     */
    notifyExtractionHistoryUpdated() {
        try {
            // Dispatch custom event for data source manager
            const event = new CustomEvent('extractionHistoryUpdated', {
                detail: {
                    historyLength: this.extractionHistory.length,
                    lastItem: this.extractionHistory[0]
                }
            });
            document.dispatchEvent(event);
            
            // Also try to directly notify the data source manager if available
            if (window.popupManager?.dataSourceManager?.updateAvailableDataSources) {
                window.popupManager.dataSourceManager.updateAvailableDataSources();
            }
            
            console.log('🔄 Extraction history update notification sent');
        } catch (error) {
            console.error('❌ Error notifying extraction history update:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = ResultsHandler;
}
