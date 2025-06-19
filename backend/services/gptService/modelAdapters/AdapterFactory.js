// AdapterFactory.js - Adapter factory
const BaseAdapter = require("./BaseAdapter");
const DeepSeekAdapter = require("./DeepSeekAdapter");
const OSeriesAdapter = require("./OSeriesAdapter");
const OllamaAdapter = require("./OllamaAdapter");

class AdapterFactory {
    static getAdapter(model, config) {
        // Check if it's an Ollama model (starts with "ollama:")
        if (model && model.startsWith("ollama:")) {
            return new OllamaAdapter(config);
        }
        
        switch (model) {
        case "deepseek-r1":
            return new DeepSeekAdapter(config);
        case "o1":
        case "o1-mini":
        case "o3":
        case "o3-mini":
        case "o4-mini":
            return new OSeriesAdapter(config);
        default:
            return new BaseAdapter(config);
        }
    }
}

module.exports = AdapterFactory;