// OSeriesAdapter.js - O-series models (o1, o1-mini, o3, o3-mini, etc.) dedicated adapter
const BaseAdapter = require("./BaseAdapter");

class OSeriesAdapter extends BaseAdapter {
    constructor(config) {
        super(config);
    }

    // Process request body - optimized for O-series models with reasoning support
    processRequestBody(prompt, params) {
        // O-series models need more completion tokens for reasoning process
        const optimizedParams = {
            ...params
        };

        // If using max_completion_tokens, ensure sufficient tokens for reasoning and generation
        if (optimizedParams.max_completion_tokens) {
            // Dynamically adjust token count based on task complexity
            const originalTokens = optimizedParams.max_completion_tokens;
            let minTokensForReasoning = 3000;  // Base tokens needed for reasoning process
            let minTokensForOutput = 500;     // Base tokens needed for output content
            
            // Check if this might be a function calling scenario by examining the conversation
            const hasToolMessages = prompt.some(msg => 
                msg.role === "tool" || 
                (msg.role === "assistant" && msg.tool_calls) ||
                (typeof msg.content === "string" && msg.content.includes("search"))
            );
            
            if (hasToolMessages) {
                minTokensForReasoning = 5000;  // More tokens for function calling scenarios
                minTokensForOutput = 1000;     // More tokens for comprehensive response
                console.log("Detected function calling scenario - increasing token allocation");
            }
            
            const recommendedTokens = minTokensForReasoning + minTokensForOutput;
            
            if (originalTokens < recommendedTokens) {
                console.log(`O-series model token optimization: increased from ${originalTokens} to ${recommendedTokens} (reasoning:${minTokensForReasoning} + output:${minTokensForOutput})`);
                optimizedParams.max_completion_tokens = recommendedTokens;
            } else {
                console.log(`O-series model token setting: ${originalTokens} tokens (sufficient)`);
            }
        }

        // Build request body
        const requestBody = {
            messages: prompt,
            ...optimizedParams
        };

        // Handle reasoning effort parameter if present
        if (optimizedParams.reasoning_effort) {
            requestBody.reasoning_effort = optimizedParams.reasoning_effort;
            console.log(`Added reasoning effort: ${optimizedParams.reasoning_effort}`);
        }

        // Handle reasoning summary parameter if present
        if (optimizedParams.reasoning) {
            requestBody.reasoning = optimizedParams.reasoning;
            console.log(`Added reasoning summary config: ${JSON.stringify(optimizedParams.reasoning)}`);
        }

        return requestBody;
    }

    // Get model name for logging
    getModelName() {
        // Return generic name for O-series models
        return "O-series Model";
    }
}

module.exports = OSeriesAdapter;
