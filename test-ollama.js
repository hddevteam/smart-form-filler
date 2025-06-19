// test-ollama.js - Test Ollama integration
const OllamaAdapter = require("./backend/services/gptService/modelAdapters/OllamaAdapter");

async function testOllamaIntegration() {
    console.log("🔧 Testing Ollama integration...");
    
    try {
        // Test if Ollama is available
        const isAvailable = await OllamaAdapter.isAvailable();
        console.log("Ollama available:", isAvailable);
        
        if (!isAvailable) {
            console.log("❌ Ollama server is not running. Please start Ollama first:");
            console.log("  1. Install Ollama: https://ollama.ai/");
            console.log("  2. Start Ollama: `ollama serve`");
            console.log("  3. Pull a model: `ollama pull llama2`");
            return;
        }
        
        // Get available models
        const models = await OllamaAdapter.getAvailableModels();
        console.log("Available Ollama models:", models);
        
        if (models.length === 0) {
            console.log("❌ No Ollama models found. Please pull a model:");
            console.log("  ollama pull llama2");
            console.log("  ollama pull mistral");
            return;
        }
        
        console.log("✅ Ollama integration test passed!");
        console.log(`Found ${models.length} model(s):`);
        models.forEach(model => {
            console.log(`  - ${model.name} (${model.size})`);
        });
        
    } catch (error) {
        console.error("❌ Ollama integration test failed:", error);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testOllamaIntegration();
}

module.exports = { testOllamaIntegration };
