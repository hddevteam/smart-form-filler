// modules/chatHandler.js
/**
 * Chat Handler Module
 * Handles chat functionality with data sources
 */

class ChatHandler {
    constructor(elements, apiClient) {
        this.elements = elements;
        this.apiClient = apiClient;
        this.extractionHistory = []; // Reference to extraction history
        this.selectedDataSources = new Set(); // Selected data source IDs
        this.chatHistory = []; // Chat conversation history
        this.isLoading = false;
        this.dataSourceConfig = null; // Data source configuration
        
        console.log("🔧 ChatHandler initialized");
    }

    /**
     * Set reference to extraction history
     */
    setExtractionHistory(history) {
        this.extractionHistory = history;
        this.refreshDataSourceList();
    }

    /**
     * Handle data source configuration change
     */
    onDataSourceChanged(config) {
        this.dataSourceConfig = config;
        this.updateSendButtonState();
        console.log("🔧 Data source configuration updated:", config);
    }

    /**
     * Check if data source is configured
     */
    isDataSourceConfigured() {
        // Allow chat even without data sources - user might want to ask general questions
        // If data sources are configured, they will be included in the context
        return true; // Always allow chat
        
        // Original logic (keeping for reference):
        // return this.dataSourceConfig && 
        //        this.dataSourceConfig.selectedItems && 
        //        this.dataSourceConfig.selectedItems.length > 0;
    }

    /**
     * Show chat interface
     */
    showChat() {
        // Populate chat model dropdown
        this.populateChatModels();
        
        // Refresh data source list
        this.refreshDataSourceList();
        
        // Chat is now handled via main tab switching - no need to show/hide sections
        console.log("💬 Chat interface opened via tab switch");
        
        // Reset chat state
        this.resetChat();
        
        // Enable/disable send button based on selections
        this.updateSendButtonState();
    }

    /**
     * Hide chat interface
     */
    hideChat() {
        // Chat is now handled via main tab switching - no need to show/hide sections
        console.log("💬 Chat interface closed via tab switch");
    }

    /**
     * Populate chat model dropdown with available models
     * NOTE: Since we now use a global model selector, this method is no longer needed
     * but kept for compatibility. The global model selector is managed by PopupManager.
     */
    populateChatModels() {
        console.log("🔧 Chat models are now managed by global model selector - this method is deprecated");
        // No longer needed as we use global model selector
    }

    /**
     * Refresh data source list based on extraction history
     */
    refreshDataSourceList() {
        const container = this.elements.dataSourceList;
        container.innerHTML = "";
        
        if (this.extractionHistory.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6b7280;">
                    No data sources available. Extract data from pages first.
                </div>
            `;
            return;
        }
        
        // Create checkbox for each extraction result
        this.extractionHistory.forEach((item, index) => {
            const sourceItem = document.createElement("div");
            sourceItem.className = "data-source-item";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `dataSource_${item.id}`;
            checkbox.className = "data-source-item__checkbox";
            checkbox.dataset.sourceId = item.id;
            checkbox.dataset.sourceIndex = index;
            
            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.className = "data-source-item__info";
            
            label.innerHTML = `
                <div class="data-source-item__title">${this.escapeHtml(item.title)}</div>
                <div class="data-source-item__url">${this.escapeHtml(item.url)}</div>
            `;
            
            // Add event listener for checkbox
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    this.selectedDataSources.add(item.id);
                } else {
                    this.selectedDataSources.delete(item.id);
                }
                this.updateSendButtonState();
            });
            
            sourceItem.appendChild(checkbox);
            sourceItem.appendChild(label);
            container.appendChild(sourceItem);
        });
    }

    /**
     * Update data source list (public method for external calls)
     */
    updateDataSourceList() {
        this.refreshDataSourceList();
    }

    /**
     * Update send button state based on selections
     */
    updateSendButtonState() {
        const hasModel = this.getSelectedModel();
        const hasMessage = this.elements.chatInput?.value?.trim();
        // Remove data source requirement - allow chat without data sources
        
        console.log('[ChatHandler] [DEBUG] Send button state check:', {
            hasModel: !!hasModel,
            modelValue: hasModel,
            hasMessage: !!hasMessage,
            messageValue: hasMessage,
            isLoading: this.isLoading,
            sendBtnElement: !!this.elements.sendChatBtn,
            chatInputElement: !!this.elements.chatInput,
            chatInputValue: this.elements.chatInput?.value || 'NOT_FOUND'
        });
        
        // Enable send button if we have model and message (data source is optional)
        if (this.elements.sendChatBtn) {
            const shouldEnable = !!(hasModel && hasMessage && !this.isLoading);
            this.elements.sendChatBtn.disabled = !shouldEnable;
            console.log('[ChatHandler] [DEBUG] Send button enabled:', shouldEnable);
            console.log('[ChatHandler] [DEBUG] Send button disabled attribute:', this.elements.sendChatBtn.disabled);
        } else {
            console.warn('[ChatHandler] [DEBUG] Send button element not found');
            console.log('[ChatHandler] [DEBUG] Available elements:', Object.keys(this.elements));
        }
    }

    /**
     * Get selected data sources content
     */
    getSelectedDataSourcesContent() {
        // Use PopupDataSourceManager for Chat data sources
        if (window.popupManager && window.popupManager.dataSourceManager) {
            const chatDataSources = window.popupManager.dataSourceManager.getChatDataSources();
            if (chatDataSources && chatDataSources.sources.length > 0) {
                console.log("📊 Using Chat data sources from PopupDataSourceManager:", {
                    type: chatDataSources.type,
                    sourceCount: chatDataSources.sources.length,
                    totalContentLength: chatDataSources.combinedText.length
                });
                
                return chatDataSources.sources.map(source => ({
                    title: source.title,
                    url: source.url,
                    type: chatDataSources.type,
                    content: source.content
                }));
            }
        }
        
        // Fallback to legacy dataSourceConfig if PopupDataSourceManager is not available
        if (!this.dataSourceConfig || !this.dataSourceConfig.selectedItems) {
            return [];
        }

        const content = [];
        const selectedType = this.dataSourceConfig.type;
        
        this.dataSourceConfig.selectedItems.forEach(sourceId => {
            // Parse source ID to get extraction index and type
            const [, extractionIndex, sourceType, iframeIndex] = sourceId.split('-');
            const extractionItem = this.extractionHistory[parseInt(extractionIndex)];
            
            if (!extractionItem) return;
            
            let sourceContent = "";
            let title = "";
            let url = "";
            
            if (sourceType === 'main' && extractionItem.analysis) {
                // Main page content
                title = extractionItem.analysis.title || `Page ${parseInt(extractionIndex) + 1}`;
                url = extractionItem.analysis.url || 'Unknown URL';
                
                switch (selectedType) {
                    case "markdown":
                        sourceContent = extractionItem.analysis.markdown || "";
                        break;
                    case "cleaned":
                        sourceContent = extractionItem.analysis.cleanedHtml || "";
                        break;
                    case "raw":
                        sourceContent = extractionItem.analysis.content || "";
                        break;
                    default:
                        sourceContent = extractionItem.analysis.markdown || "";
                }
            } else if (sourceType === 'iframe' && extractionItem.analysis && extractionItem.analysis.iframes) {
                // Iframe content
                const iframe = extractionItem.analysis.iframes[parseInt(iframeIndex)];
                if (iframe) {
                    title = iframe.title || `Iframe ${parseInt(iframeIndex) + 1}`;
                    url = iframe.src || extractionItem.analysis.url || 'Unknown URL';
                    
                    switch (selectedType) {
                        case "markdown":
                            sourceContent = iframe.markdown || "";
                            break;
                        case "cleaned":
                            sourceContent = iframe.cleanedHtml || "";
                            break;
                        case "raw":
                            sourceContent = iframe.content || "";
                            break;
                        default:
                            sourceContent = iframe.markdown || "";
                    }
                }
            }
            
            if (sourceContent) {
                content.push({
                    title: title,
                    url: url,
                    type: selectedType,
                    content: sourceContent
                });
            }
        });
        
        return content;
    }

    /**
     * Get selected model from global model selector
     * @returns {string|null} The selected model ID or null if service unavailable
     */
    getSelectedModel() {
        const globalModelSelect = document.getElementById("globalModelSelect");
        const selectedValue = globalModelSelect?.value;
        
        // If no value selected or selector is disabled (service unavailable), return null
        if (!selectedValue || globalModelSelect?.disabled) {
            return null;
        }
        
        return selectedValue;
    }

    /**
     * Send chat message
     */
    async sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        const model = this.getSelectedModel();
        
        if (!model) {
            this.showError("❌ Service unavailable: Please check backend connection and try again");
            return;
        }
        
        // Data source configuration is now optional - if configured, it will be included in context
        console.log('[ChatHandler] [DEBUG] Sending message, data source configured:', !!this.dataSourceConfig);
        
        // Add user message to chat
        this.addMessage("user", message);
        
        // Clear input
        this.elements.chatInput.value = "";
        this.updateSendButtonState();
        
        // Show loading message
        const loadingMessage = this.addMessage("ai", "");
        this.showLoadingMessage(loadingMessage);
        
        try {
            this.isLoading = true;
            this.updateSendButtonState();
            
            // Send request to chat API
            // Always use official endpoint
            const endpoint = "/extension/chat-with-data";
            
            // Get selected data sources content
            const dataSources = this.getSelectedDataSourcesContent();
            console.log('[ChatHandler] Data sources for chat:', {
                count: dataSources.length,
                sources: dataSources.map(ds => ({ title: ds.title, type: ds.type, contentLength: ds.content.length }))
            });
            
            const response = await this.apiClient.makeRequest(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    message: message,
                    model: model,
                    dataSources: dataSources, // Use configured data sources
                    chatHistory: this.chatHistory.slice(-10) // Last 10 messages for context
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remove loading message and add AI response
                loadingMessage.remove();
                this.addMessage("ai", result.response);
                
                // Update chat history
                this.chatHistory.push(
                    { role: "user", content: message },
                    { role: "assistant", content: result.response }
                );
            } else {
                throw new Error(result.error || "Chat request failed");
            }
            
        } catch (error) {
            console.error("Chat error:", error);
            
            // Remove loading message and show error
            loadingMessage.remove();
            this.addMessage("ai", `Sorry, I encountered an error: ${error.message}`);
            
        } finally {
            this.isLoading = false;
            this.updateSendButtonState();
        }
    }

    /**
     * Add message to chat
     */
    addMessage(sender, content) {
        const messagesContainer = this.elements.chatMessages;
        
        // Remove welcome message if it exists
        const welcome = messagesContainer.querySelector(".chat-welcome");
        if (welcome) {
            welcome.remove();
        }
        
        const messageElement = document.createElement("div");
        messageElement.className = `chat-message chat-message--${sender}`;
        
        const avatar = document.createElement("div");
        avatar.className = `chat-message__avatar chat-message__avatar--${sender}`;
        avatar.textContent = sender === "user" ? "U" : "AI";
        
        const messageContent = document.createElement("div");
        messageContent.className = "chat-message__content";
        messageContent.textContent = content;
        
        // Add copy button for messages with content
        const messageActions = document.createElement("div");
        messageActions.className = "chat-message__actions";
        
        if (content && content.trim()) {
            const copyButton = document.createElement("button");
            copyButton.className = "chat-message__copy-btn";
            copyButton.innerHTML = "📋";
            copyButton.title = "Copy message";
            copyButton.addEventListener("click", (e) => {
                e.stopPropagation();
                this.copyMessage(content);
            });
            messageActions.appendChild(copyButton);
        }
        
        messageElement.appendChild(avatar);
        messageElement.appendChild(messageContent);
        messageElement.appendChild(messageActions);
        
        messagesContainer.appendChild(messageElement);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        return messageElement;
    }

    /**
     * Show loading animation in message
     */
    showLoadingMessage(messageElement) {
        const content = messageElement.querySelector(".chat-message__content");
        content.innerHTML = `
            <span>Thinking</span>
            <div class="chat-loading-dots">
                <div class="chat-loading-dot"></div>
                <div class="chat-loading-dot"></div>
                <div class="chat-loading-dot"></div>
            </div>
        `;
        messageElement.classList.add("chat-message--loading");
    }

    /**
     * Copy message content to clipboard
     */
    async copyMessage(content) {
        try {
            await navigator.clipboard.writeText(content);
            console.log("✅ Message copied to clipboard");
            
            // Show temporary feedback (could be enhanced with a toast notification)
            const notification = document.createElement("div");
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 10000;
                animation: fadeInOut 2s ease-in-out;
            `;
            notification.textContent = "Message copied!";
            
            // Add fade animation
            const style = document.createElement("style");
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateX(100%); }
                    20%, 80% { opacity: 1; transform: translateX(0); }
                    100% { opacity: 0; transform: translateX(100%); }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 2000);
            
        } catch (error) {
            console.error("Failed to copy message:", error);
            // Fallback for older browsers
            this.copyMessageFallback(content);
        }
    }

    /**
     * Fallback copy method for older browsers
     */
    copyMessageFallback(content) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = content;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            console.log("✅ Message copied to clipboard (fallback)");
        } catch (error) {
            console.error("Failed to copy message (fallback):", error);
        }
    }

    /**
     * Clear all chat messages
     */
    clearChat() {
        console.log("🔧 Clearing chat messages...");
        
        // Reset to initial state
        this.resetChat();
        
        console.log("✅ Chat cleared");
    }

    /**
     * Reset chat to initial state
     */
    resetChat() {
        // Clear messages
        this.elements.chatMessages.innerHTML = `
            <div class="chat-welcome">
                <div class="chat-welcome__icon">💬</div>
                <div class="chat-welcome__title">Start chatting with your data</div>
                <div class="chat-welcome__description">
                    Select data sources above and ask questions about the content.
                </div>
            </div>
        `;
        
        // Clear chat history
        this.chatHistory = [];
        
        // Clear selected data sources
        this.selectedDataSources.clear();
        
        // Uncheck all checkboxes
        const checkboxes = this.elements.dataSourceList.querySelectorAll("input[type=\"checkbox\"]");
        checkboxes.forEach(cb => cb.checked = false);
        
        // Clear input
        this.elements.chatInput.value = "";
        
        // Update button state
        this.updateSendButtonState();
    }

    /**
     * Show error in chat
     */
    showError(message) {
        this.addMessage("ai", `❌ ${message}`);
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
     * Bind chat events
     */
    bindEvents() {
        console.log("🔧 Binding chat events...");
        
        try {
            // Safe event binding helper
            const safeBindEvent = (element, eventType, handler, elementName) => {
                try {
                    if (!element) {
                        console.warn(`⚠️ Chat element "${elementName}" is null or undefined, skipping event binding`);
                        return false;
                    }
                    
                    if (typeof element.addEventListener !== "function") {
                        console.error(`❌ Chat element "${elementName}" does not have addEventListener method. Element type:`, typeof element, element);
                        return false;
                    }
                    
                    element.addEventListener(eventType, handler);
                    console.log(`✅ Successfully bound ${eventType} event to chat "${elementName}"`);
                    return true;
                } catch (error) {
                    console.error(`❌ Failed to bind ${eventType} event to chat "${elementName}":`, error);
                    return false;
                }
            };
            
            // Chat model selection change
            safeBindEvent(this.elements.chatModelSelect, "change", () => {
                this.updateSendButtonState();
            }, "chatModelSelect");
            
            // Data source type change
            safeBindEvent(this.elements.dataSourceTypeSelect, "change", () => {
                // Refresh descriptions or content preview if needed
            }, "dataSourceTypeSelect");
            
            // Chat input changes
            safeBindEvent(this.elements.chatInput, "input", () => {
                this.updateSendButtonState();
            }, "chatInput");
            
            // Send button click
            safeBindEvent(this.elements.sendChatBtn, "click", () => {
                this.sendMessage();
            }, "sendChatBtn");
            
            // Enter key in chat input
            safeBindEvent(this.elements.chatInput, "keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            }, "chatInput (keydown)");
            
            // Clear chat button
            safeBindEvent(this.elements.clearChatBtn, "click", () => {
                this.clearChat();
            }, "clearChatBtn");
            
            // Note: closeChatBtn no longer exists in the new tab-based structure
            // Chat is now closed via main tab navigation
            
            console.log("✅ Chat events bound successfully");
        } catch (error) {
            console.error("❌ Critical error during chat event binding:", error);
            throw new Error(`Chat event binding failed: ${error.message}`);
        }
    }

    /**
     * Handle data source configuration change
     */
    onDataSourceChanged(config) {
        try {
            console.log('[ChatHandler] Data source configuration changed:', config);
            this.dataSourceConfig = config;
            this.updateChatInterface();
        } catch (error) {
            console.error('[ChatHandler] Error handling data source change:', error);
        }
    }

    /**
     * Update chat interface based on current configuration
     */
    updateChatInterface() {
        try {
            // Update send button state
            this.updateSendButtonState();
            
            // Clear previous chat if data source changed
            if (this.chatHistory.length > 0) {
                this.resetChat();
            }
            
            console.log('[ChatHandler] Chat interface updated');
        } catch (error) {
            console.error('[ChatHandler] Error updating chat interface:', error);
        }
    }

    /**
     * Check if data source is properly configured
     */
    isDataSourceConfigured() {
        return this.dataSourceConfig && this.dataSourceConfig.source && this.dataSourceConfig.source.trim();
    }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = ChatHandler;
}
