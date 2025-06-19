// Smart Form Filler Controllers Index
/**
 * Smart Form Filler Controllers
 * Unified export for all controllers
 */

const extensionCoreController = require("./extensionCoreController");
const dataExtractionController = require("./dataExtractionController");
const dataAnalysisController = require("./dataAnalysisController");
const formFillerController = require("./formFillerController");
const logsController = require("./logsController");

module.exports = {
    // Core extension functionality
    extensionCore: extensionCoreController,
    
    // Data extraction functionality
    dataExtraction: dataExtractionController,
    
    // Data analysis functionality
    dataAnalysis: dataAnalysisController,
    
    // Form filler functionality
    formFiller: formFillerController,
    
    // Logging functionality
    logs: logsController
};
