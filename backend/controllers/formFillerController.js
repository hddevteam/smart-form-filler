// controllers/edgeExtension/formFillerController.js
/**
 * Form Filler Controller
 * Handles intelligent form filling requests and form analysis
 */

const gptService = require("../services/gptService");

class FormFillerController {

    constructor() {
        // Bind methods to the correct context
        this.healthCheck = this.healthCheck.bind(this);
        this.analyzeFormRelevance = this.analyzeFormRelevance.bind(this);
        this.analyzeFieldMapping = this.analyzeFieldMapping.bind(this);
    }

    /**
     * Health check endpoint for form filler
     */
    healthCheck(req, res) {
        res.json({
            status: "healthy",
            message: "Form Filler API is running",
            timestamp: new Date().toISOString(),
            version: "2.0.0",
            capabilities: {
                formStructureAnalysis: true,
                contentMapping: true,
                twoStageWorkflow: true,
                fieldTypeRecognition: true
            }
        });
    }

    /**
     * Analyze text content and extract structured data for form filling
     * This method works with actual form structure from the page
     */
    /**
     * Stage 1: Analyze which forms are relevant to the content to fill
     * This helps focus on the most relevant forms when there are many forms on the page
     */
    async analyzeFormRelevance(req, res) {
        try {
            const { 
                content, 
                formStructure,
                pageHtml,
                model = "gpt-4.1-nano",
                language = "zh"
            } = req.body;

            if (!formStructure || !formStructure.forms || formStructure.forms.length === 0) {
                return res.status(400).json({ 
                    error: "No form structure provided",
                    message: "Please provide form structure with forms array" 
                });
            }

            console.log(`🔧 Form relevance analysis - Model: ${model}, Forms: ${formStructure.forms.length}`);

            // Create form relevance analysis prompt
            const relevancePrompt = this.createEnhancedFormRelevancePrompt(content, formStructure, pageHtml, language);

            const messages = [
                {
                    role: "system",
                    content: "You are an intelligent form analysis assistant. Your task is to determine which forms on a page are most relevant to the provided content for form filling."
                },
                {
                    role: "user", 
                    content: relevancePrompt
                }
            ];

            console.log("🔍 Analyzing form relevance...");
            
            // Get API configuration for the model
            const apiConfig = gptService.getApiConfig(model);
            if (!apiConfig.apiKey && !apiConfig.isOllama) {
                throw new Error(`API configuration not found for model: ${model}`);
            }
            if (!apiConfig.apiUrl) {
                throw new Error(`API URL not found for model: ${model}`);
            }

            const response = await gptService.makeRequest({
                apiKey: apiConfig.apiKey,
                apiUrl: apiConfig.apiUrl,
                model: model,
                prompt: messages,
                params: {
                    temperature: 0.2,
                    max_tokens: 1500
                },
                ollamaUrl: apiConfig.ollamaUrl,
                isOllama: apiConfig.isOllama
            });

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                throw new Error("Invalid response from GPT service");
            }

            const responseContent = response.data.choices[0].message.content;
            
            let relevanceResult;
            try {
                relevanceResult = JSON.parse(responseContent);
                console.log("✅ Successfully parsed GPT response:", JSON.stringify(relevanceResult, null, 2));
                
                // Debug: Log field descriptions specifically
                if (relevanceResult.fieldDescriptions) {
                    console.log("📋 Field descriptions found:", Object.keys(relevanceResult.fieldDescriptions));
                    Object.entries(relevanceResult.fieldDescriptions).forEach(([fieldId, desc]) => {
                        console.log(`  - ${fieldId}:`, desc);
                    });
                } else {
                    console.log("⚠️ No fieldDescriptions in GPT response");
                }
                
            } catch (parseError) {
                console.log("⚠️ Failed to parse JSON response, using fallback");
                console.log("📝 Raw GPT response:", responseContent);
                relevanceResult = {
                    relevantForms: [],
                    confidence: 0.3,
                    reasoning: responseContent,
                    parsing_error: true
                };
            }

            console.log("✅ Form relevance analysis completed successfully");

            // Ensure we have the expected structure for the frontend
            const responseData = {
                success: true,
                relevantForms: relevanceResult.relevantForms || [],
                recommendedForm: relevanceResult.recommendedForm || null,
                confidence: relevanceResult.confidence || 0.5,
                reasoning: relevanceResult.reasoning || "",
                fieldDescriptions: relevanceResult.fieldDescriptions || {},
                formDescription: relevanceResult.formDescription || "", // Include form description from GPT
                recommendedLanguage: relevanceResult.recommendedLanguage || language, // Use input language as fallback
                model: model,
                timestamp: new Date().toISOString(),
                usage: response.data?.usage || {}
            };

            // Add HTML processing metadata if available
            if (pageHtml) {
                responseData.htmlProcessed = true;
                responseData.htmlTokenCount = estimateTokenCount(pageHtml);
            }

            return res.json(responseData);

        } catch (error) {
            console.error("❌ Error in form relevance analysis:", error);
            return res.status(500).json({
                error: "Form relevance analysis failed",
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Stage 2: Analyze field mapping for specific form
     */
    async analyzeFieldMapping(req, res) {
        try {
            const { 
                content, 
                selectedForm,
                model = "gpt-4.1-nano",
                language = "zh",
                analysisResult = null, // Previous Analyze Content results
                dataSources = null // Selected data sources for context
            } = req.body;

            if (!content || content.trim().length === 0) {
                return res.status(400).json({ 
                    error: "No content provided",
                    message: "Please provide content to analyze" 
                });
            }

            // Use selectedForm instead of targetForm for consistency
            const targetForm = selectedForm;
            if (!targetForm || !targetForm.fields || targetForm.fields.length === 0) {
                return res.status(400).json({ 
                    error: "No target form provided",
                    message: "Please provide target form structure with fields" 
                });
            }

            console.log(`🔧 Field mapping analysis - Model: ${model}, Fields: ${targetForm.fields.length}`);
            if (analysisResult) {
                console.log("📊 Using previous Analyze Content results for enhanced mapping");
            }
            if (dataSources && dataSources.sources && dataSources.sources.length > 0) {
                console.log(`📊 Using selected data sources for context - Type: ${dataSources.type}, Sources: ${dataSources.sources.length}, Content length: ${dataSources.combinedText.length}`);
            }

            // Create enhanced field mapping prompt that includes user content, analysis results, and data sources
            const mappingPrompt = this.createEnhancedFieldMappingPrompt(
                content, 
                targetForm, 
                analysisResult, 
                language,
                dataSources // Pass data sources to prompt generation
            );

            const messages = [
                {
                    role: "system",
                    content: "You are an expert at mapping text content to form fields. You understand user intent and can handle both direct field mapping and instructional content. Analyze the content and determine the best values for each form field, considering both explicit data and user guidance."
                },
                {
                    role: "user", 
                    content: mappingPrompt
                }
            ];

            console.log("🔍 Analyzing field mapping...");
            
            // Get API configuration for the model
            const apiConfig = gptService.getApiConfig(model);
            if (!apiConfig.apiKey && !apiConfig.isOllama) {
                throw new Error(`API configuration not found for model: ${model}`);
            }
            if (!apiConfig.apiUrl) {
                throw new Error(`API URL not found for model: ${model}`);
            }

            const response = await gptService.makeRequest({
                apiKey: apiConfig.apiKey,
                apiUrl: apiConfig.apiUrl,
                model: model,
                prompt: messages,
                params: {
                    temperature: 0.1,
                    max_tokens: 2000
                },
                ollamaUrl: apiConfig.ollamaUrl,
                isOllama: apiConfig.isOllama
            });

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                throw new Error("Invalid response from GPT service");
            }

            const responseContent = response.data.choices[0].message.content;
            
            let mappingResult;
            try {
                mappingResult = JSON.parse(responseContent);
            } catch (parseError) {
                console.log("⚠️ Failed to parse JSON response, using fallback");
                mappingResult = {
                    fieldMappings: [],
                    confidence: 0.3,
                    parsing_error: true
                };
            }

            console.log("✅ Field mapping analysis completed successfully");

            // Ensure backward compatibility while supporting new format
            const mappings = mappingResult.fieldMappings || [];
            
            // Transform mappings to include xpath and preserve iframe context
            const enhancedMappings = mappings.map(mapping => {
                const originalField = targetForm.fields.find(f => f.id === mapping.fieldId);
                const enhanced = {
                    fieldId: mapping.fieldId,
                    xpath: mapping.xpath || this.findXPathForField(targetForm, mapping.fieldId),
                    suggestedValue: mapping.suggestedValue,
                    // Keep some legacy fields for compatibility
                    fieldName: originalField?.name || mapping.fieldName || mapping.fieldId,
                    value: mapping.suggestedValue, // Alias for compatibility
                    // Preserve iframe context information
                    fieldSource: originalField?.source || "main",
                    fieldIframePath: originalField?.iframePath || "",
                    fieldOriginalId: originalField?.originalId || "",
                    // Preserve additional field attributes
                    fieldLabel: originalField?.label || "",
                    fieldType: originalField?.type || ""
                };
                
                // Simplified debug log for iframe fields
                if (originalField?.source === "iframe") {
                    console.log(`🖼️ Preserving iframe context: ${enhanced.fieldIframePath}`);
                }
                
                return enhanced;
            });

            return res.json({
                success: true,
                fieldMappings: enhancedMappings,
                mappings: enhancedMappings, // Alias for compatibility
                confidence: mappingResult.confidence || 0.8, // Default higher confidence for simplified format
                formDescription: (analysisResult && analysisResult.formDescription) || targetForm.description || targetForm.title || targetForm.name, // Use analysis formDescription if available
                model: model,
                timestamp: new Date().toISOString(),
                usage: response.data?.usage || {}
            });

        } catch (error) {
            console.error("❌ Error in field mapping analysis:", error);
            return res.status(500).json({
                error: "Field mapping analysis failed",
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Create form-aware analysis prompt
     */
    createFormAwareAnalysisPrompt(content, formStructure, language) {
        // Use provided language directly (language dropdown selection)
        const selectedLanguage = language || "English";
        
        console.log(`🌐 Using language: ${selectedLanguage} for content analysis`);

        // Always use English for the prompt itself, but specify target language for output
        let prompt = `Analyze the user content and map it to form fields. Please respond in ${selectedLanguage} language.

Form structure:
${JSON.stringify(formStructure, null, 2)}

User content:
${content}`;

        // Add form description if available
        if (formStructure.description || formStructure.title || formStructure.name) {
            const formDesc = formStructure.description || formStructure.title || formStructure.name;
            prompt += `\n\nForm description: ${formDesc}`;
        }

        prompt += `\n\nPlease return results in the following JSON format:
{
  "mappings": [
    {
      "fieldId": "field ID",
      "fieldName": "field name",
      "fieldType": "field type",
      "extractedValue": "extracted value from content",
      "confidence": 0.8,
      "source": "source text fragment"
    }
  ],
  "extractedInfo": {
    "timeInfo": {},
    "personInfo": {},
    "eventInfo": {},
    "other": {}
  },
  "unmappedContent": ["content fragments that could not be mapped"],
  "unmappedFields": ["fields that could not be filled"],
  "confidence": 0.85,
  "recommendedLanguage": "en or zh - recommended language for this form based on form content and page context"
}`;

        return prompt;
    }

    /**
     * Create form relevance analysis prompt
     */
    /**
     * Create enhanced form relevance prompt (migrated from original implementation)
     */
    createEnhancedFormRelevancePrompt(userContent, formStructure, pageHtml, language = "English") {
        // Process pageHtml with intelligent truncation if provided
        let processedPageHtml = "";
        if (pageHtml) {
            const htmlTokenCount = estimateTokenCount(pageHtml);
            const maxHtmlTokens = 20000; // Allow more tokens for form analysis
            
            if (htmlTokenCount > maxHtmlTokens) {
                console.log(`⚠️ HTML token count (${htmlTokenCount}) exceeds limit (${maxHtmlTokens}), applying smart truncation...`);
                processedPageHtml = smartTruncateHtml(pageHtml, maxHtmlTokens);
                console.log(`📄 Truncated HTML from ${pageHtml.length} to ${processedPageHtml.length} characters`);
            } else {
                processedPageHtml = pageHtml;
            }
        }

        // Generate forms description with more context (always use English)
        const formsDescription = formStructure.forms.map((form, index) => {
            const formInfo = [
                `Form ${index + 1} (ID: ${form.id})`,
                `  Name: ${form.name || "Unnamed Form"}`
            ];
            
            // Add form description if available
            if (form.description) {
                formInfo.push(`  Description: ${form.description}`);
            }
            
            formInfo.push(
                `  Source: ${form.source === "iframe" ? `iframe (${form.iframePath})` : "main page"}`,
                `  Action: ${form.action || "Not specified"}`,
                `  Method: ${form.method || "GET"}`,
                `  Field count: ${form.fields.length}`
            );
            
            // Add detailed field info
            if (form.fields.length > 0) {
                formInfo.push("  Field details:");
                form.fields.forEach((field, fieldIndex) => {
                    let fieldDesc = `    ${fieldIndex + 1}. ${field.id}`;
                    if (field.name && field.name !== field.id) fieldDesc += ` (name: ${field.name})`;
                    if (field.label) fieldDesc += ` - "${field.label}"`;
                    if (field.title) fieldDesc += ` [title: "${field.title}"]`; // Include title for context
                    if (field.placeholder) fieldDesc += ` [placeholder: "${field.placeholder}"]`;
                    fieldDesc += ` (${field.type})`;
                    if (field.required) fieldDesc += " [Required]";
                    if (field.category) fieldDesc += ` [Category: ${field.category}]`;
                    
                    // Add options for select fields
                    if (field.options && field.options.length > 0) {
                        const optionTexts = field.options.map(opt => `"${opt.text || opt.value}"`).join(", ");
                        fieldDesc += ` [Options: ${optionTexts}]`;
                    }
                    
                    // Add options for radio buttons (if grouped)
                    if (field.type === "radio" && field.radioOptions) {
                        const radioTexts = field.radioOptions.map(opt => `"${opt.label || opt.value}"`).join(", ");
                        fieldDesc += ` [Radio options: ${radioTexts}]`;
                    }
                    
                    formInfo.push(fieldDesc);
                });
            }
            
            return formInfo.join("\n");
        }).join("\n\n");

        // Always use English prompts, with flexible language output instruction
        const languageInstruction = "Please respond in the most appropriate language";
        
        return `Please analyze webpage content and user input to identify the most relevant forms and generate field descriptions for the target form. ${languageInstruction}.

${userContent ? `User content to fill:\n"${userContent}"\n` : ""}

Page HTML context:
\`\`\`html
${processedPageHtml || "No page HTML content"}
\`\`\`

Form structure on the page:
${formsDescription}

Please complete the following analysis tasks:

1. **Form Relevance Analysis**: Based on page context and user content, analyze the relevance of each form
2. **Target Form Selection**: Select the most relevant form
3. **Form Description Generation**: Create a concise description of what the recommended form is for (its purpose, context, what it's used to apply for, etc.)
4. **Field Description Generation**: Generate detailed descriptions for each field in the target form, including specific value options for selection fields

Return JSON format:

{
  "relevantForms": [
    {
      "formId": "form ID", 
      "relevanceScore": 0.95
    }
  ],
  "recommendedForm": "recommended form ID",
  "confidence": 0.90,
  "recommendedLanguage": "recommended language for this form based on form content and page context",
  "formDescription": "A concise description of what the recommended form is for, based on form title, purpose, and context",
  "fieldDescriptions": {
    "recommended_form_field_ID": {
      "fieldId": "field ID",
      "description": "Comprehensive field description that includes both purpose and available options. Examples: 'Country selection dropdown with options: United States, Canada, Mexico, Other' or 'Rating selection with options: Excellent (5), Good (4), Average (3), Poor (2), Very Poor (1)' or 'Gender selection with radio options: Male, Female, Other' or 'Newsletter subscription checkbox: Yes/No choice for receiving email updates'"
    }
  }
}

Analysis requirements:
1. Prioritize page context information (titles, descriptions, text around forms)
2. Combine field attributes like label, title, placeholder to understand field meaning
3. Generate clear, practical descriptions for each field that include:
   - Field purpose and what it's used for
   - For selection fields (select, radio, checkbox): List available options/values when detectable
   - For text fields: Expected format or type of content
   - For number fields: Expected range or unit if apparent
4. Relevance scores should realistically reflect form-content matching
5. Field descriptions should be based on page context, not just repeat field labels
6. When options are available in the HTML (option tags, radio values, etc.), include them in the description`;
    }

    /**
     * Create enhanced field mapping prompt that uses user content, analysis results, and data sources
     */
    createEnhancedFieldMappingPrompt(content, targetForm, analysisResult, language, dataSources = null) {
        // Use the language directly as provided by user selection
        const targetLanguage = language || "English";
        
        console.log(`🌐 Using user-selected language: ${targetLanguage} for field mapping`);

        // Always use English for the prompt itself, but specify target language for output
        const languageInstruction = `Please respond in ${targetLanguage} language`;
        let promptParts = [];

        // Start with instruction and language guidance
        promptParts.push(`Analyze user content and generate appropriate values for each form field. ${languageInstruction}.`);

        // Add user content
        promptParts.push(`\nUser input content:\n"${content}"\n`);

        // Add data sources if available
        if (dataSources && dataSources.sources && dataSources.sources.length > 0) {
            promptParts.push(`\nAdditional context from selected data sources (${dataSources.type} format):`);
            promptParts.push(`${dataSources.combinedText}\n`);
            promptParts.push("Note: Use this additional context to enhance field mapping accuracy and provide more relevant information.\n");
        }

        // Add form description - prioritize analysis result over original form description
        let formDesc = null;
        if (analysisResult && analysisResult.formDescription) {
            formDesc = analysisResult.formDescription;
        } else if (targetForm.description || targetForm.title || targetForm.name) {
            formDesc = targetForm.description || targetForm.title || targetForm.name;
        }
        
        if (formDesc) {
            promptParts.push(`Form description: ${formDesc}\n`);
        }

        // Add analysis results if available
        if (analysisResult && analysisResult.fieldDescriptions) {
            promptParts.push("Form field analysis results (for reference):");
            Object.entries(analysisResult.fieldDescriptions).forEach(([fieldId, fieldData]) => {
                promptParts.push(`- ${fieldId}: ${fieldData.description}`);
            });
            promptParts.push("");
        }

        // Add simplified form structure (only essential fields)
        const simplifiedForm = {
            id: targetForm.id,
            name: targetForm.name,
            description: formDesc || targetForm.description || targetForm.title,
            fields: targetForm.fields.map(field => ({
                id: field.id,
                type: field.type,
                xpath: field.xpath || field.selector, // Include xpath for filling
                description: field.label || field.placeholder || field.title || field.name || field.id,
                // Include additional attributes for better field identification
                name: field.name,
                className: field.className,
                ariaLabelledBy: field.ariaLabelledBy,
                ariaLabel: field.ariaLabel,
                placeholder: field.placeholder
            }))
        };

        promptParts.push(`Target form structure:\n${JSON.stringify(simplifiedForm, null, 2)}\n`);

        // Add simplified instructions
        const hasDataSources = dataSources && dataSources.sources && dataSources.sources.length > 0;
        promptParts.push(`Analysis instructions:
1. User content may contain:
   - Direct field values (e.g., "Name: John, Phone: 123456")
   - Instructional guidance (e.g., "please help fill this form based on my info to make it persuasive")
   - A combination of both

2. ${hasDataSources ? 'Additional data sources are provided for context:' : 'Processing strategy:'}
   ${hasDataSources ? '- Use the additional context from data sources to enhance field mapping accuracy' : ''}
   ${hasDataSources ? '- Combine user input with relevant information from data sources' : ''}
   ${hasDataSources ? '- Prioritize user input but supplement with data source information when appropriate' : ''}
   - For direct information: extract exact field values
   - For instructional content: generate appropriate values based on field descriptions${hasDataSources ? ' and available data sources' : ''}
   - Consider user intent and form context

3. **CRITICAL LANGUAGE REQUIREMENT**: ALL field values MUST be generated in ${targetLanguage}. This is mandatory.

Please return results in the following JSON format:
{
  "fieldMappings": [
    {
      "fieldId": "field ID",
      "xpath": "field xpath for form filling",
      "suggestedValue": "suggested value in ${targetLanguage}"
    }
  ]
}`);

        return promptParts.join("\n");
    }

    /**
     * Find XPath for a field in the target form
     */
    findXPathForField(targetForm, fieldId) {
        if (!targetForm.fields) return null;
        
        const field = targetForm.fields.find(f => f.id === fieldId);
        if (!field) return null;
        
        // Priority order: xpath, selector, or generate robust fallback xpath
        if (field.xpath) {
            return field.xpath;
        }
        
        if (field.selector) {
            // Convert CSS selector to XPath if possible
            if (field.selector.startsWith("#")) {
                // ID selector
                const id = field.selector.substring(1);
                return `//*[@id="${id}"]`;
            }
            return field.selector;
        }
        
        // Generate robust fallback xpath using multiple strategies
        const xpathStrategies = [];
        
        // Strategy 1: By name attribute (most reliable for forms)
        if (field.name) {
            xpathStrategies.push(`//*[@name="${field.name}"]`);
        }
        
        // Strategy 2: By ID if available
        if (field.id && field.id !== fieldId) { // fieldId might be our generated ID
            xpathStrategies.push(`//*[@id="${field.id}"]`);
        }
        
        // Strategy 3: By class combination (for Office forms and similar)
        if (field.className) {
            const classes = field.className.split(" ").filter(c => c.trim() && !c.includes("focus") && !c.includes("error"));
            if (classes.length > 0) {
                // Use the most specific class
                xpathStrategies.push(`//*[contains(@class, "${classes[0]}")]`);
            }
        }
        
        // Strategy 4: By placeholder text
        if (field.placeholder) {
            xpathStrategies.push(`//*[@placeholder="${field.placeholder}"]`);
        }
        
        // Strategy 5: By aria-labelledby
        if (field.ariaLabelledBy) {
            xpathStrategies.push(`//*[@aria-labelledby="${field.ariaLabelledBy}"]`);
        }
        
        // Strategy 6: By type and position (less reliable but sometimes necessary)
        const tagName = field.type === "textarea" ? "textarea" : (field.type === "select" ? "select" : "input");
        if (field.type) {
            xpathStrategies.push(`//${tagName}[@type="${field.type}"]`);
        }
        
        // Return the most reliable strategy available
        return xpathStrategies[0] || `//*[@id="${fieldId}"]`;
    }

    /**
     * Generate enhanced XPath with fallback options
     */
    generateEnhancedXPath(field) {
        const strategies = [];
        
        // Strategy 1: By ID (most reliable)
        if (field.id) {
            strategies.push(`//*[@id="${field.id}"]`);
        }
        
        // Strategy 2: By name attribute
        if (field.name) {
            strategies.push(`//*[@name="${field.name}"]`);
        }
        
        // Strategy 3: By type and name combination
        if (field.type && field.name) {
            const tagName = field.type === "textarea" ? "textarea" : (field.type === "select" ? "select" : "input");
            strategies.push(`//${tagName}[@name="${field.name}"]`);
        }
        
        // Strategy 4: By type and placeholder
        if (field.type && field.placeholder) {
            const tagName = field.type === "textarea" ? "textarea" : (field.type === "select" ? "select" : "input");
            strategies.push(`//${tagName}[@placeholder="${field.placeholder}"]`);
        }
        
        // Return primary strategy, but include fallbacks in field data
        return {
            primary: strategies[0] || `//*[@id="${field.id || "unknown"}"]`,
            fallbacks: strategies.slice(1)
        };
    }

    /**
     * Extract text from form structure for language detection
     */
    extractTextFromFormStructure(formStructure) {
        let textParts = [];
        
        // Extract from form-level properties
        if (formStructure.description) textParts.push(formStructure.description);
        if (formStructure.title) textParts.push(formStructure.title);
        if (formStructure.name) textParts.push(formStructure.name);
        
        // Extract from fields if it's a single form
        if (formStructure.fields) {
            formStructure.fields.forEach(field => {
                if (field.label) textParts.push(field.label);
                if (field.placeholder) textParts.push(field.placeholder);
                if (field.title) textParts.push(field.title);
            });
        }
        
        // Extract from multiple forms if it's a form collection
        if (formStructure.forms) {
            formStructure.forms.forEach(form => {
                if (form.description) textParts.push(form.description);
                if (form.title) textParts.push(form.title);
                if (form.name) textParts.push(form.name);
                
                if (form.fields) {
                    form.fields.forEach(field => {
                        if (field.label) textParts.push(field.label);
                        if (field.placeholder) textParts.push(field.placeholder);
                        if (field.title) textParts.push(field.title);
                    });
                }
            });
        }
        
        return textParts.join(" ");
    }

    /**
     * Create field mapping prompt (legacy version - updated to use English prompts)
     */
    createFieldMappingPrompt(content, targetForm, language) {
        // Use the language directly as provided by user
        const targetLanguage = language || "Chinese";
        const languageInstruction = `Please respond in ${targetLanguage} language`;

        return `Analyze text content and determine the best values for each field in the specified form. ${languageInstruction}.

Text content:
${content}

Target form:
${JSON.stringify(targetForm, null, 2)}

Please return results in the following JSON format:
{
  "fieldMappings": [
    {
      "fieldId": "field ID",
      "fieldName": "field name",
      "suggestedValue": "suggested value",
      "confidence": 0.8,
      "reasoning": "reason for choosing this value",
      "alternatives": ["other possible values"]
    }
  ],
  "confidence": 0.85,
  "analysis": "overall analysis",
  "suggestions": ["improvement suggestions"]
}`;
    }
}

/**
 * Smart HTML truncation based on form relevance
 */
function smartTruncateHtml(html, maxTokens) {
    try {
        const cheerio = require("cheerio");
        const $ = cheerio.load(html);
        
        // Priority extraction strategy
        const priorities = [
            "form",  // Highest priority - forms and their containers
            "label, input, textarea, select, button",  // Form elements
            "h1, h2, h3, h4, h5, h6",  // Headers
            "p, div",  // Text content
            "*"  // Everything else
        ];
        
        let extractedHtml = "";
        let currentTokens = 0;
        
        for (const selector of priorities) {
            const elements = $(selector);
            
            elements.each(function() {
                const $el = $(this);
                
                // Skip if already included (child of previously included element)
                if (extractedHtml.includes($el.prop("outerHTML"))) {
                    return;
                }
                
                const elementHtml = $el.prop("outerHTML");
                const elementTokens = estimateTokenCount(elementHtml);
                
                if (currentTokens + elementTokens <= maxTokens) {
                    extractedHtml += elementHtml + "\n";
                    currentTokens += elementTokens;
                } else {
                    return false; // Break the loop
                }
            });
            
            if (currentTokens >= maxTokens * 0.9) {
                break; // Stop if we're close to the limit
            }
        }
        
        return extractedHtml || html.substring(0, maxTokens * 4); // Fallback to simple truncation
    } catch (error) {
        console.error("❌ Smart truncation error:", error);
        return html.substring(0, maxTokens * 4); // Fallback to simple truncation
    }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters for Chinese, 4 characters for English)
 */
function estimateTokenCount(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

module.exports = new FormFillerController();
