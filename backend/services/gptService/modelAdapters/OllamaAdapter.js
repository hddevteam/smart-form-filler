// OllamaAdapter.js - Ollama model adapter
const BaseAdapter = require("./BaseAdapter");

class OllamaAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
        this.baseUrl = config.ollamaUrl || "http://localhost:11434";
    }

    // Override headers for Ollama API
    getHeaders(apiKey) {
        return {
            "Content-Type": "application/json"
            // Ollama doesn't require API key for local usage
        };
    }

    // Process request body for Ollama format
    processRequestBody(prompt, params) {
        // Convert OpenAI format to Ollama format
        const messages = this.convertMessages(prompt);
        
        // Extract the actual model name from "ollama:model-name" format
        const modelName = params.model && params.model.startsWith("ollama:") 
            ? params.model.replace("ollama:", "") 
            : params.model || "llama2";
        
        return {
            model: modelName,
            messages: messages,
            stream: false,
            options: {
                temperature: params.temperature || 0.8,
                top_p: params.top_p || 0.95,
                num_predict: params.max_tokens || 2000
            }
        };
    }

    // Process response to match OpenAI format
    processResponse(response) {
        if (!response || !response.message) {
            throw new Error("Invalid Ollama response format");
        }

        // Convert Ollama response to OpenAI format
        return {
            data: {
                choices: [{
                    message: {
                        role: response.message.role || "assistant",
                        content: response.message.content || ""
                    },
                    finish_reason: "stop"
                }],
                usage: {
                    prompt_tokens: response.prompt_eval_count || 0,
                    completion_tokens: response.eval_count || 0,
                    total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
                }
            }
        };
    }

    // Convert OpenAI message format to Ollama format
    convertMessages(messages) {
        return messages.map(msg => {
            // Handle different message types
            if (msg.role === "system") {
                return {
                    role: "system",
                    content: msg.content
                };
            } else if (msg.role === "user") {
                return {
                    role: "user",
                    content: msg.content
                };
            } else if (msg.role === "assistant") {
                return {
                    role: "assistant",
                    content: msg.content
                };
            }
            return msg;
        });
    }

    // Get available models from Ollama API
    static async getAvailableModels(baseUrl = "http://localhost:11434") {
        try {
            const response = await fetch(`${baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`Failed to fetch Ollama models: ${response.status}`);
            }
            
            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error("Error fetching Ollama models:", error);
            throw error;
        }
    }

    // Check if Ollama server is running
    static async isAvailable(baseUrl = "http://localhost:11434") {
        try {
            const response = await fetch(`${baseUrl}/api/tags`, {
                method: "GET",
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.error("Ollama server not available:", error);
            return false;
        }
    }
}

module.exports = OllamaAdapter;
