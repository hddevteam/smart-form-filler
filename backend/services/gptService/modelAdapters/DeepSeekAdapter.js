// DeepSeekAdapter.js - DeepSeek model-specific adapter
const BaseAdapter = require("./BaseAdapter");

class DeepSeekAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
    }

    // Override request header handling method, add Bearer token
    getHeaders(apiKey) {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        };
    }

    // Override parameter handling method
    processRequestParameters(params) {
        // Ensure all parameters are of the correct type
        const processedParams = {
            temperature: params.temperature ? parseFloat(params.temperature) : 0.7,
            top_p: params.top_p ? parseFloat(params.top_p) : 1,
            max_tokens: params.max_tokens ? parseInt(params.max_tokens) : 2048,
            stream: params.stream || false
        };
        return processedParams;
    }

    // Override request body handling method
    processRequestBody(prompt, params) {
        // Ensure message format is correct
        if (!Array.isArray(prompt)) {
            prompt = [{ role: "user", content: prompt }];
        }

        // Build standard request body
        return {
            model: "deepseek-r1", // Explicitly specify model name
            messages: prompt.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            ...this.processRequestParameters(params)
        };
    }
}

module.exports = DeepSeekAdapter;