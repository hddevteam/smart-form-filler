// API Routes for Smart Form Filler
const express = require('express');
const router = express.Router();

// Import controllers
const controllers = require('../controllers');

// Extension Core APIs
router.get('/extension/health', controllers.extensionCore.healthCheck);
router.get('/extension/models', controllers.extensionCore.getAvailableModels);

// Data Extraction APIs
router.post('/extension/extract-data-sources', controllers.dataExtraction.extractDataSources);

// Data Analysis APIs
router.post('/extension/chat-with-data', controllers.dataAnalysis.chatWithData);

// Form Filler APIs
router.post('/form-filler/analyze-form-relevance', controllers.formFiller.analyzeFormRelevance);
router.post('/form-filler/analyze-field-mapping', controllers.formFiller.analyzeFieldMapping);

// API Information endpoint
router.get('/info', (req, res) => {
    res.json({
        name: 'Smart Form Filler API',
        version: '1.0.0',
        description: 'Backend API for Smart Form Filler browser extension',
        endpoints: {
            health: '/api/extension/health',
            models: '/api/extension/models',
            extractDataSources: '/api/extension/extract-data-sources',
            chatWithData: '/api/extension/chat-with-data',
            analyzeFormRelevance: '/api/form-filler/analyze-form-relevance',
            analyzeFieldMapping: '/api/form-filler/analyze-field-mapping'
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
