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
     */
    populateChatModels() {
        console.log("🔧 Populating chat models...");
        
        // Copy models from main model select
        const mainModelSelect = this.elements.modelSelect;
        const chatModelSelect = this.elements.chatModelSelect;
        
        if (!chatModelSelect) {
            console.warn("⚠️ Chat model select element not found");
            return;
        }
        
        // Clear existing options
        chatModelSelect.innerHTML = "";
        
        // Add default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select model...";
        chatModelSelect.appendChild(defaultOption);
        
        // Check if main model select has models
        if (mainModelSelect && mainModelSelect.options.length > 1) {
            // Copy options from main model select (skip first empty option)
            console.log(`🔧 Copying ${mainModelSelect.options.length - 1} models from main selector`);
            for (let i = 0; i < mainModelSelect.options.length; i++) {
                const option = mainModelSelect.options[i];
                if (option.value) {
                    const newOption = document.createElement("option");
                    newOption.value = option.value;
                    newOption.textContent = option.textContent;
                    chatModelSelect.appendChild(newOption);
                }
            }
            
            // Set default to currently selected model
            if (mainModelSelect.value) {
                chatModelSelect.value = mainModelSelect.value;
                console.log(`🔧 Set chat model to: ${mainModelSelect.value}`);
            }
        } else {
            // Main model select is empty, add some default models
            console.log("🔧 Main model select is empty, adding default models");
            const defaultModels = [
                { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
                { id: "gpt-4o-mini", name: "GPT-4o Mini" },
                { id: "gpt-4o", name: "GPT-4o" },
                { id: "gpt-4", name: "GPT-4" },
                { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" }
            ];
            
            defaultModels.forEach(model => {
                const option = document.createElement("option");
                option.value = model.id;
                option.textContent = model.name;
                chatModelSelect.appendChild(option);
            });
            
            // Set default to first model
            chatModelSelect.value = defaultModels[0].id;
            console.log(`🔧 Set default chat model to: ${defaultModels[0].id}`);
        }
        
        console.log(`✅ Chat model select populated with ${chatModelSelect.options.length - 1} models`);
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
        const hasModel = this.elements.chatModelSelect.value;
        const hasDataSources = this.selectedDataSources.size > 0;
        const hasMessage = this.elements.chatInput.value.trim();
        
        this.elements.sendChatBtn.disabled = !hasModel || !hasDataSources || !hasMessage || this.isLoading;
    }

    /**
     * Get selected data sources content
     */
    getSelectedDataSourcesContent() {
        const selectedType = this.elements.dataSourceTypeSelect.value;
        const content = [];
        
        this.selectedDataSources.forEach(sourceId => {
            const item = this.extractionHistory.find(h => h.id === sourceId);
            if (item && item.dataSources) {
                let sourceContent = "";
                
                switch (selectedType) {
                case "markdown":
                    sourceContent = item.dataSources.markdown?.content || "";
                    break;
                case "cleaned":
                    sourceContent = item.dataSources.cleaned?.content || "";
                    break;
                case "raw":
                    sourceContent = item.dataSources.raw?.content || "";
                    break;
                default:
                    sourceContent = item.dataSources.markdown?.content || "";
                }
                
                if (sourceContent) {
                    content.push({
                        title: item.title,
                        url: item.url,
                        type: selectedType,
                        content: sourceContent
                    });
                }
            }
        });
        
        return content;
    }

    /**
     * Send chat message
     */
    async sendMessage() {
        const message = this.elements.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        const model = this.elements.chatModelSelect.value;
        const dataSources = this.getSelectedDataSourcesContent();
        
        if (!model || dataSources.length === 0) {
            this.showError("Please select a model and at least one data source.");
            return;
        }
        
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
            
            const response = await this.apiClient.makeRequest(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    message: message,
                    model: model,
                    dataSources: dataSources,
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
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
    module.exports = ChatHandler;
}
