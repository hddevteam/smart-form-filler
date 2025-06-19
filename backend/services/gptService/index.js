// services/gptService/index.js
/**
 * Entry point for GPT Service
 * Aggregates and exports all service modules
 */

const config = require("./config");
const apiService = require("./apiService");
const tools = require("./tools");
const templates = require("./templates");

// Combined export of all modules
module.exports = {
    // Configuration
    config: config,
    defaultParams: config.defaultParams,
    getApiConfig: config.getApiConfig,
    getAvailableModels: config.getAvailableModels,
    supportsFeature: config.supportsFeature,
    
    // API Service
    makeRequest: apiService.makeRequest,
    handleRequestError: apiService.handleRequestError,
    processModelParameters: apiService.processModelParameters,
    filterMessagesByModel: apiService.filterMessagesByModel,
    processMessagesForModel: apiService.processMessagesForModel,
    processReasoningSummary: apiService.processReasoningSummary,
    
    // Tools
    toolDefinitions: tools.toolDefinitions,
    handleGetCurrentTime: tools.handleGetCurrentTime,
    handleBingSearch: tools.handleBingSearch, 
    handleWebpageAnalysis: tools.handleWebpageAnalysis,
    processToolCalls: tools.processToolCalls,
    
    // Templates
    searchAnswerZhTemplate: templates.searchAnswerZhTemplate,
    searchAnswerEnTemplate: templates.searchAnswerEnTemplate,
    formatSearchResults: templates.formatSearchResults
};