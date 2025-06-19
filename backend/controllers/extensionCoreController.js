// controllers/edgeExtension/extensionCoreController.js
/**
 * Edge Extension Core Controller
 * Handles basic extension API requests, health checks, and model management
 */

const gptService = require("../services/gptService");

class ExtensionCoreController {
    
    constructor() {
        // Bind methods to the correct context
        this.getAvailableModels = this.getAvailableModels.bind(this);
        this.refreshOllamaModels = this.refreshOllamaModels.bind(this);
    }
    
    /**
     * Health check endpoint for extension
     */
    healthCheck(req, res) {
        res.json({
            status: "healthy",
            message: "Extension API is running",
            timestamp: new Date().toISOString(),
            version: "2.0.0",
            endpoints: {
                extractDataSources: "/extension/extract-data-sources",
                chatWithData: "/extension/chat-with-data",
                models: "/extension/models",
                health: "/extension/health"
            }
        });
    }

    /**
     * Get available models for the extension
     */
    async getAvailableModels(req, res) {
        try {
            // Get dynamically available models from platform configuration
            const availableModels = await gptService.getAvailableModels();
            
            // Ensure we have at least one model available
            if (availableModels.length === 0) {
                return res.json({ 
                    models: [{ id: "gpt-4.1-nano", name: "GPT-4.1 Nano (Fallback)" }],
                    totalAvailable: 1,
                    generatedAt: new Date().toISOString(),
                    warning: "No models configured, using fallback"
                });
            }
            
            res.json({ 
                models: availableModels.map(model => ({ 
                    id: model.id, 
                    name: model.name,
                    type: model.type || "cloud",
                    provider: model.provider || "unknown"
                })),
                totalAvailable: availableModels.length,
                generatedAt: new Date().toISOString()
            }); 
        } catch (error) {
            console.error("❌ Error getting available models:", error);
            res.status(500).json({
                error: "Failed to get available models",
                models: [{ id: "gpt-4.1-nano", name: "GPT-4.1 Nano (Fallback)" }],
                totalAvailable: 1
            });
        }
    }

    /**
     * Refresh Ollama models - get latest models from local Ollama server
     */
    async refreshOllamaModels(req, res) {
        try {
            console.log("🔧 Refreshing Ollama models...");
            
            const { getOllamaModels } = require("../services/gptService/config");
            const ollamaModels = await getOllamaModels();
            
            res.json({
                success: true,
                models: ollamaModels,
                count: ollamaModels.length,
                message: ollamaModels.length > 0 
                    ? `Found ${ollamaModels.length} Ollama model(s)`
                    : "No Ollama models found. Make sure Ollama is running and models are installed.",
                generatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("❌ Error refreshing Ollama models:", error);
            res.status(500).json({
                success: false,
                error: "Failed to refresh Ollama models",
                message: error.message,
                models: []
            });
        }
    }

}

module.exports = new ExtensionCoreController();
