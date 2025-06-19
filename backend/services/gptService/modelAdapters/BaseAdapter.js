// BaseAdapter.js - Base model adapter interface
class BaseAdapter {
    constructor(config) {
        this.config = config;
    }

    // Process request headers
    getHeaders(apiKey) {
        return {
            "Content-Type": "application/json",
            "api-key": apiKey
        };
    }

    // Process request parameters
    processRequestParameters(params) {
        return params;
    }

    // Process request body
    processRequestBody(prompt, params) {
        return {
            messages: prompt,
            ...params
        };
    }
}

module.exports = BaseAdapter;