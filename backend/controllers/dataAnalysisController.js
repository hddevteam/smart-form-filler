// controllers/edgeExtension/dataAnalysisController.js
/**
 * Data Analysis Controller - Part 2
 * Handles analysis generation, statistics, and chat functionality
 */

const gptService = require("../services/gptService");

class DataAnalysisController {

    constructor() {
        // Bind methods to the correct context
        this.chatWithDataSources = this.chatWithDataSources.bind(this);
    }

    /**
     * Generate basic analysis information (pure code analysis, no GPT calls)
     */
    generateAnalysisInfo(dataSources) {
        console.log("📊 Generating analysis info using code-based methods...");
        
        try {
            // Generate analysis results based on data source statistics
            const markdownLength = dataSources.markdown.content.length;
            const cleanedLength = dataSources.cleaned.content.length;
            const wordCount = dataSources.markdown.metadata.wordCount || 0;
            
            // Generate basic analysis suggestions
            const insights = [];
            const recommendations = [];
            const qualityIndicators = [];
            
            // Analysis based on content length
            if (markdownLength > 50000) {
                insights.push("Extensive content detected - suitable for comprehensive analysis");
                recommendations.push("Content is quite lengthy - consider breaking into sections");
            } else if (markdownLength < 500) {
                insights.push("Concise content detected - quick analysis ready");
                recommendations.push("Content is relatively short - ensure all key information is captured");
            } else {
                insights.push("Optimal content length detected - well-balanced for analysis");
                recommendations.push("Content length is appropriate for analysis");
            }
            
            // Analysis based on compression ratio
            const compressionRatio = markdownLength / cleanedLength;
            if (compressionRatio < 0.3) {
                insights.push("High compression achieved - content structure is well-optimized");
                qualityIndicators.push("Clean content structure maintained");
            } else if (compressionRatio > 0.8) {
                insights.push("Low compression ratio - original content may contain redundant elements");
                recommendations.push("Content structure could be optimized");
            }
            
            // Readability analysis based on word count
            if (wordCount > 5000) {
                qualityIndicators.push("Long-form content ideal for detailed analysis");
                recommendations.push("Consider using section headers for better navigation");
            } else if (wordCount > 1000) {
                qualityIndicators.push("Well-sized content for comprehensive analysis");
            } else {
                qualityIndicators.push("Concise content suitable for rapid processing");
            }
            
            // Quality score based on content characteristics
            let qualityScore = 70; // Base score
            
            if (wordCount > 200) qualityScore += 10;
            if (markdownLength > 1000) qualityScore += 5;
            if (compressionRatio >= 0.3 && compressionRatio <= 0.7) qualityScore += 10;
            if (dataSources.cleaned.structure.tables > 0) qualityScore += 5;
            if (dataSources.cleaned.structure.links > 0) qualityScore += 5;
            
            qualityScore = Math.min(95, qualityScore); // Max 95 points
            
            return {
                insights,
                recommendations,
                qualityScore,
                qualityIndicators,
                metadata: {
                    analysisMethod: "code-based",
                    contentLength: markdownLength,
                    wordCount: wordCount,
                    compressionRatio: Math.round(compressionRatio * 100) / 100,
                    extractedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error("❌ Analysis info generation error:", error);
            return {
                insights: ["Content extracted successfully"],
                recommendations: ["Basic analysis completed"],
                qualityScore: 75,
                qualityIndicators: ["Content is ready for use"],
                metadata: {
                    analysisMethod: "code-based",
                    error: error.message,
                    extractedAt: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Generate statistics
     */
    generateStats(dataSources) {
        // Get real original size from raw data source
        const originalSize = dataSources.raw.metadata.originalSize;
        const mainPageSize = dataSources.raw.metadata.mainPageSize;
        const iframeContentSize = dataSources.raw.metadata.iframeContentSize;
        
        const cleanedSize = dataSources.cleaned.metadata.cleanedSize;
        const markdownSize = dataSources.markdown.metadata.markdownSize;

        return {
            originalSize: originalSize, // Real total input size (main page + iframe)
            mainPageSize: mainPageSize, // Main page original size
            iframeContentSize: iframeContentSize, // Iframe content total size
            cleanedSize: cleanedSize,
            markdownSize: markdownSize,
            compressionRatio: {
                cleaned: originalSize > 0 ? ((originalSize - cleanedSize) / originalSize * 100).toFixed(1) + "%" : "0%",
                markdown: originalSize > 0 ? ((originalSize - markdownSize) / originalSize * 100).toFixed(1) + "%" : "0%"
            },
            sizeBreakdown: {
                "Main Page": Math.round(mainPageSize / 1024) + "KB",
                "Iframe Content": Math.round(iframeContentSize / 1024) + "KB", 
                "Total Input": Math.round(originalSize / 1024) + "KB",
                "Cleaned Output": Math.round(cleanedSize / 1024) + "KB",
                "Markdown Output": Math.round(markdownSize / 1024) + "KB"
            },
            processingTime: new Date().toISOString(),
            dataSourcesGenerated: 3,
            includesIframeContent: iframeContentSize > 0
        };
    }

    /**
     * Chat with data sources API endpoint
     */
    async chatWithDataSources(req, res) {
        try {
            const { 
                message,
                model = "gpt-4.1-nano",
                dataSources = [],
                chatHistory = []
            } = req.body;

            console.log(`🔧 Chat request - Model: ${model}, Data sources: ${dataSources.length}, History: ${chatHistory.length}`);

            if (!message || !message.trim()) {
                return res.status(400).json({
                    success: false,
                    error: "Message is required"
                });
            }

            // Prepare context from data sources (if any)
            let context = "";
            let systemPrompt = "";
            
            if (dataSources.length > 0) {
                // Chat with data sources
                console.log(`📊 Processing ${dataSources.length} data sources for context`);
                const contextParts = [];
                dataSources.forEach((source, index) => {
                    console.log(`📄 Data Source ${index + 1}: ${source.title} (${source.type}) - ${source.content.length} chars`);
                    const sourceInfo = `Data Source ${index + 1} (${source.type}):
Title: ${source.title}
URL: ${source.url}
Content:
${source.content}

---
`;
                    contextParts.push(sourceInfo);
                });
                
                context = contextParts.join("\n");
                console.log(`📝 Total context length: ${context.length} characters`);
                
                systemPrompt = `You are a helpful AI assistant that answers questions based on provided data sources. 

You have access to the following data sources:
${context}

Instructions:
- Answer questions based only on the information provided in the data sources above
- If information is not available in the data sources, clearly state that
- Cite which data source(s) you're referencing when possible
- Be concise but comprehensive
- Format your response clearly with appropriate markdown formatting
- If asked about multiple sources, compare and contrast the information`;
            } else {
                // General chat without data sources
                systemPrompt = `You are a helpful AI assistant. Provide accurate, helpful, and well-structured responses to user questions. Use markdown formatting when appropriate to make your responses clear and readable.`;
            }

            // Prepare conversation history
            const messages = [
                {
                    role: "system",
                    content: systemPrompt
                }
            ];

            // Add chat history
            chatHistory.forEach(historyItem => {
                messages.push({
                    role: historyItem.role,
                    content: historyItem.content
                });
            });

            // Add current user message
            messages.push({
                role: "user",
                content: message
            });

            console.log(`🔧 Sending chat request to GPT with ${messages.length} messages`);

            // Get API configuration for the model
            const apiConfig = gptService.getApiConfig(model);
            if (!apiConfig.apiKey && !apiConfig.isOllama) {
                throw new Error(`API configuration not found for model: ${model}`);
            }
            if (!apiConfig.apiUrl) {
                throw new Error(`API URL not found for model: ${model}`);
            }

            // Call GPT service using makeRequest (consistent with other methods)
            const response = await gptService.makeRequest({
                apiKey: apiConfig.apiKey,
                apiUrl: apiConfig.apiUrl,
                model: model,
                prompt: messages,
                params: {
                    max_tokens: 2000,
                    temperature: 0.7
                },
                ollamaUrl: apiConfig.ollamaUrl,
                isOllama: apiConfig.isOllama
            });

            // Check if response has data and choices
            console.log("🔧 Response structure check:", {
                hasData: !!response.data,
                hasChoices: !!(response.data && response.data.choices),
                choicesLength: response.data?.choices?.length,
                hasFirstChoice: !!(response.data?.choices?.[0]),
                hasMessage: !!(response.data?.choices?.[0]?.message),
                hasContent: !!(response.data?.choices?.[0]?.message?.content)
            });

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                console.error("❌ Invalid response structure:", response);
                throw new Error("Invalid response from GPT service");
            }

            const aiResponse = response.data.choices[0].message.content;
            
            if (!aiResponse) {
                console.error("❌ Empty response content:", response.data.choices[0]);
                throw new Error("Empty response from GPT service");
            }

            console.log("✅ Chat response generated successfully");

            res.json({
                success: true,
                response: aiResponse,
                model: model,
                timestamp: new Date().toISOString(),
                dataSourcesUsed: dataSources.length,
                usage: response.data.usage || {}
            });

        } catch (error) {
            console.error("❌ Chat with data sources error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Chat request failed"
            });
        }
    }

}

module.exports = new DataAnalysisController();
