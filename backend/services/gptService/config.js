// services/gptService/config.js
/**
 * Configuration module for GPT Services
 * Contains environment variables, API keys, and default parameters
 */

// Environment configuration
const devMode = process.env.DEV_MODE ? eval(process.env.DEV_MODE) : false;

// API Keys Configuration
const apiKeys = {
    gpt4o: process.env.GPT_4O_API_KEY,
    gpt4oMini: process.env.GPT_4O_MINI_API_KEY,
    o1: process.env.O1_API_KEY,
    o1Mini: process.env.O1_MINI_API_KEY,
    o3: process.env.O3_API_KEY, // API Key for o3 model
    o3Mini: process.env.O3_API_KEY, // API Key for o3-mini model
    deepseek: process.env.DEEPSEEK_API_KEY, // API Key for DeepSeek
    o4Mini: process.env.O4_MINI_API_KEY, // API Key for o4-mini model
    gpt45: process.env.GPT_4_5_API_KEY, // API Key for gpt-4.5-preview model
    gpt41: process.env.GPT_4_1_API_KEY, // API Key for gpt-4.1 model
    gpt41Nano: process.env.GPT_4_1_NANO_API_KEY, // API Key for gpt-4.1-nano model
    gpt41Mini: process.env.GPT_4_1_MINI_API_KEY, // API Key for gpt-4.1-mini model
    // Default key based on environment
    default: devMode ? process.env.API_KEY_DEV : process.env.GPT_4_1_API_KEY
};

// API URLs Configuration
const apiUrls = {
    gpt4o: process.env.GPT_4O_API_URL,
    gpt4oMini: process.env.GPT_4O_MINI_API_URL,
    o1: process.env.O1_API_URL,
    o1Mini: process.env.O1_MINI_API_URL,
    o3: process.env.O3_API_URL, // URL for o3 model
    o3Mini: process.env.O3_API_URL,
    deepseek: `${process.env.DEEPSEEK_API_URL}/chat/completions`,
    o4Mini: process.env.O4_MINI_API_URL, // URL for o4-mini model
    gpt45: process.env.GPT_4_5_API_URL, // URL for gpt-4.5-preview model
    gpt41: process.env.GPT_4_1_API_URL, // URL for gpt-4.1 model
    gpt41Nano: process.env.GPT_4_1_NANO_API_URL, // URL for gpt-4.1-nano model
    gpt41Mini: process.env.GPT_4_1_MINI_API_URL, // URL for gpt-4.1-mini model
    // Default URL based on environment
    default: devMode ? process.env.API_URL_DEV : process.env.GPT_4_1_API_URL
};

// Default parameters for API requests
const defaultParams = {
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2000
};

/**
 * Get model supported features
 * Based on: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/reasoning
 * @type {Object}
 */
const modelFeatures = {
    "gpt-4o": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    },
    "gpt-4o-mini": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    },
    "o1": { 
        supportsFunctionCalls: false, 
        supportsSystemMessages: false, 
        supportsDeveloperMessages: true,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false, // Temporarily disabled - requires preview access
        requiresMaxCompletionTokens: true
    },
    "o1-mini": { 
        supportsFunctionCalls: false, 
        supportsSystemMessages: false, 
        supportsDeveloperMessages: true,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false, // Temporarily disabled - requires preview access
        requiresMaxCompletionTokens: true
    },
    "o3": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: true,
        supportsReasoningSummary: false, // Temporarily disabled - requires preview access
        supportsReasoningEffort: false, // Temporarily disabled - requires preview access
        requiresMaxCompletionTokens: true
    },
    "o3-mini": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: true,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false, // Temporarily disabled - requires preview access
        requiresMaxCompletionTokens: true
    },
    "o4-mini": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: true,
        supportsReasoningSummary: false, // Temporarily disabled - requires preview access
        supportsReasoningEffort: false, // Temporarily disabled - requires preview access
        requiresMaxCompletionTokens: true
    },
    "deepseek-r1": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    },
    "gpt-4.5-preview": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    },
    "gpt-4.1": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    },
    "gpt-4.1-nano": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    },
    "gpt-4.1-mini": { 
        supportsFunctionCalls: true, 
        supportsSystemMessages: true, 
        supportsDeveloperMessages: false,
        supportsReasoningSummary: false,
        supportsReasoningEffort: false,
        requiresMaxCompletionTokens: false
    }
};

/**
 * Get API configuration based on model name
 * @param {string} model - Model name
 * @returns {Object} API configuration {apiKey, apiUrl}
 */
const getApiConfig = (model) => {
    let apiKey, apiUrl;
    
    switch (model) {
    case "gpt-4o":
        apiKey = apiKeys.gpt4o;
        apiUrl = apiUrls.gpt4o;
        break;
    case "gpt-4o-mini":
        apiKey = apiKeys.gpt4oMini;
        apiUrl = apiUrls.gpt4oMini;
        break;
    case "o1":
        apiKey = apiKeys.o1;
        apiUrl = apiUrls.o1;
        break;
    case "o1-mini":
        apiKey = apiKeys.o1Mini;
        apiUrl = apiUrls.o1Mini;
        break;
    case "o3":  // Add o3 configuration
        apiKey = apiKeys.o3;
        apiUrl = apiUrls.o3;
        break;
    case "o3-mini":
        apiKey = apiKeys.o3Mini;
        apiUrl = apiUrls.o3Mini;
        break;
    case "deepseek-r1":  // Add deepseek-r1 configuration
        apiKey = apiKeys.deepseek;
        apiUrl = apiUrls.deepseek;
        break;
    case "o4-mini":  // Add o4-mini configuration
        apiKey = apiKeys.o4Mini;
        apiUrl = apiUrls.o4Mini;
        break;
    case "gpt-4.5-preview":  // Add gpt-4.5-preview configuration
        apiKey = apiKeys.gpt45;
        apiUrl = apiUrls.gpt45;
        break;
    case "gpt-4.1":  // Add gpt-4.1 configuration
        apiKey = apiKeys.gpt41;
        apiUrl = apiUrls.gpt41;
        break;
    case "gpt-4.1-nano":  // Add gpt-4.1-nano configuration
        apiKey = apiKeys.gpt41Nano;
        apiUrl = apiUrls.gpt41Nano;
        break;
    case "gpt-4.1-mini":  // Add gpt-4.1-mini configuration
        apiKey = apiKeys.gpt41Mini;
        apiUrl = apiUrls.gpt41Mini;
        break;
    default:
        // Default to GPT-4O if model not specified
        apiKey = apiKeys.gpt41;
        apiUrl = apiUrls.gpt41;
        break;
    }

    return { apiKey, apiUrl };
};

/**
 * Get all available models that have valid API configuration
 */
const getAvailableModels = () => {
    const modelList = [
        { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
        { id: "gpt-4.1-mini", name: "GPT-4.1 Mini" },
        { id: "gpt-4.1", name: "GPT-4.1" },
        { id: "gpt-4o-mini", name: "GPT-4O Mini" },
        { id: "gpt-4o", name: "GPT-4O" },
        { id: "gpt-4.5-preview", name: "GPT-4.5 Preview" },
        { id: "o1-mini", name: "O1 Mini" },
        { id: "o1", name: "O1" },
        { id: "o3-mini", name: "O3 Mini" },
        { id: "o3", name: "O3" },
        { id: "o4-mini", name: "O4 Mini" },
        { id: "deepseek-r1", name: "DeepSeek R1" }
    ];
    
    const availableModels = [];
    
    modelList.forEach(model => {
        try {
            const config = getApiConfig(model.id);
            if (config && config.apiKey && config.apiUrl) {
                availableModels.push({
                    ...model,
                    features: modelFeatures[model.id] || {},
                    configured: true
                });
            }
        } catch (error) {
            // Model not configured, skip it
        }
    });
    
    return availableModels;
};

/**
 * Check if model supports specified feature
 * @param {string} model - Model name
 * @param {string} feature - Feature name
 * @returns {boolean} Whether the feature is supported
 */
const supportsFeature = (model, feature) => {
    const features = modelFeatures[model] || modelFeatures["gpt-4o"]; // Default to gpt-4o features
    return !!features[feature];
};

module.exports = {
    devMode,
    apiKeys,
    apiUrls,
    defaultParams,
    modelFeatures,
    getApiConfig,
    getAvailableModels,
    supportsFeature
};