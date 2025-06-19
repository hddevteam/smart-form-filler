// edge-extension/src/modules/formAnalysisService.js
/**
 * Form Analysis Service - Handles form content analysis and field mapping
 */

/**
 * Service for analyzing form content and generating field mappings
 */
class FormAnalysisService {
    /**
     * Constructor
     * @param {Object} apiClient - API client
     */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }
    
    /**
     * Analyze content with form structure (Stage 1)
     * @param {string} content - User content to analyze
     * @param {Array} forms - Detected forms
     * @param {string} pageHtml - Page HTML
     * @param {string} model - Selected AI model
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeFormRelevance(content, forms, pageHtml, model) {
        if (!this.apiClient) {
            throw new Error("API client is not initialized");
        }
        
        // Generate form summary manually
        const formStructure = {
            forms: forms,
            summary: this._generateFormSummary(forms)
        };
        
        const requestPayload = {
            content: content,
            formStructure: formStructure,
            pageHtml: pageHtml,
            model: model
        };
        
        console.log("🚀 Making API request to analyze form relevance with payload:", {
            contentLength: content?.length || 0,
            formCount: formStructure.forms?.length || 0,
            pageHtmlLength: pageHtml?.length || 0,
            model: model
        });
        
        // Always use official endpoint
        const endpoint = "/form-filler/analyze-form-relevance";
        
        console.log("🚀 Using official endpoint:", endpoint);
        
        const response = await this.apiClient.makeRequest(endpoint, {
            method: "POST",
            body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
            throw new Error(`Stage 1 failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Form relevance analysis failed");
        }
        
        return data;
    }
    
    /**
     * Generate field mapping (Stage 2)
     * @param {string} content - User content to analyze
     * @param {Object} selectedForm - Selected form
     * @param {string} model - Selected AI model
     * @param {Object} analysisResult - Previous Analyze Content results (optional)
     * @param {string} language - Selected language for output
     * @returns {Promise<Object>} Mapping results
     */
    async analyzeFieldMapping(content, selectedForm, model, analysisResult = null, language = "zh") {
        if (!this.apiClient) {
            throw new Error("API client is not initialized");
        }
        
        // Always use official endpoint
        const endpoint = "/form-filler/analyze-field-mapping";
        
        console.log("🚀 Using official endpoint:", endpoint);
        
        const response = await this.apiClient.makeRequest(endpoint, {
            method: "POST",
            body: JSON.stringify({
                content: content,
                selectedForm: selectedForm,
                model: model,
                language: language,
                analysisResult: analysisResult // Include previous analysis results
            })
        });

        if (!response.ok) {
            throw new Error(`Stage 2 failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || "Field mapping analysis failed");
        }
        
        return data;
    }
    
    /**
     * Generate form summary for API call
     * @param {Array} forms - Array of form objects
     * @returns {Object} Form summary
     * @private
     */
    _generateFormSummary(forms) {
        const totalFields = forms.reduce((total, form) => total + form.fields.length, 0);
        const categories = {};
        
        forms.forEach(form => {
            form.fields.forEach(field => {
                categories[field.category] = (categories[field.category] || 0) + 1;
            });
        });

        return {
            totalForms: forms.length,
            totalFields: totalFields,
            categories: categories,
            pageUrl: window.location.href,
            pageTitle: document.title
        };
    }
}

// Make FormAnalysisService available globally
window.FormAnalysisService = FormAnalysisService;
