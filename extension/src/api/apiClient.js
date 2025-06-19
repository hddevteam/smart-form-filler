/* global chrome */
// API Client for communicating with Azure ChatGPT backend
class ApiClient {
    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.authManager = null; // Will be injected
    }

    setAuthManager(authManager) {
        this.authManager = authManager;
    }

    getBaseUrl() {
        // Smart Form Filler backend
        return "http://localhost:3001";
    }

    async makeRequest(endpoint, options = {}) {
        console.log("🔧 makeRequest called:", { endpoint, options: { ...options, body: options.body ? "..." : undefined } });
        
        const defaultHeaders = {
            "Content-Type": "application/json"
        };

        const requestOptions = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        // Ensure endpoint starts with /api for backend routes
        const apiEndpoint = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;
        const fullUrl = `${this.baseUrl}${apiEndpoint}`;
        
        console.log("🔧 makeRequest:", {
            originalEndpoint: endpoint,
            apiEndpoint: apiEndpoint,
            fullUrl: fullUrl,
            method: requestOptions.method || "GET",
            bodySize: requestOptions.body ? requestOptions.body.length : 0
        });
        
        const startTime = Date.now();
        const response = await fetch(fullUrl, requestOptions);
        const endTime = Date.now();
        
        console.log("🔧 Response received:", {
            url: fullUrl,
            status: response.status,
            statusText: response.statusText,
            duration: `${endTime - startTime}ms`,
            ok: response.ok
        });
        
        if (!response.ok) {
            console.error("❌ Request failed:", {
                status: response.status,
                statusText: response.statusText,
                url: fullUrl
            });
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return response;
    }

    async getAvailableModels() {
        try {
            // Always use official endpoint
            const response = await this.makeRequest("/extension/models");
            const data = await response.json();
            
            if (data.models && Array.isArray(data.models)) {
                return data.models;
            }
            
            // If response doesn't have models array, throw error to indicate service issue
            throw new Error("Invalid response format from models endpoint");
        } catch (error) {
            console.error("Failed to fetch models:", error);
            // Don't return fallback models - let the UI handle service unavailable state
            throw error;
        }
    }

    transformModelsData(backendData) {
        // Handle different backend response formats
        if (Array.isArray(backendData)) {
            return backendData.map(model => ({
                id: model.id || model.model || model.name,
                name: model.displayName || model.name || model.id
            }));
        }
        
        if (backendData.models) {
            return backendData.models.map(model => ({
                id: model.id || model.model || model.name,
                name: model.displayName || model.name || model.id
            }));
        }

        // If no valid data, throw error instead of returning fallback
        throw new Error("Invalid models data format received from backend");
    }

    async testConnection() {
        try {
            const response = await this.makeRequest("/extension/health");
            return response.ok;
        } catch (error) {
            console.error("Connection test failed:", error);
            return false;
        }
    }

    async getUserProfile() {
        try {
            const response = await this.makeRequest("/user/profile");
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
            throw error;
        }
    }

    async refreshOllamaModels() {
        try {
            console.log("🔧 Refreshing Ollama models...");
            const response = await this.makeRequest("/extension/refresh-ollama-models", {
                method: "POST"
            });
            const data = await response.json();
            
            console.log("🔧 Ollama models refresh response:", data);
            return data;
        } catch (error) {
            console.error("❌ Failed to refresh Ollama models:", error);
            throw error;
        }
    }

    // Alias for getAvailableModels for backward compatibility
    async getModels() {
        return this.getAvailableModels();
    }

    // Get current active tab (for extension context)
    async getCurrentTab() {
        try {
            if (typeof chrome !== "undefined" && chrome.tabs) {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                return tabs[0];
            }
        } catch (error) {
            console.warn("🔧 Could not get current tab:", error.message);
        }
        return null;
    }
}

// Export for use in extension
window.ApiClient = ApiClient;
