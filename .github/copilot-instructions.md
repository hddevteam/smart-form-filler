# Copilot Instructions for Smart Form Filler

This document provides guidance for GitHub Copilot when working on the Smart Form Filler project.

## 🎯 Project Overview

Smart Form Filler is an AI-powered browser extension for intelligent data extraction and form filling. The project consists of:

- **Browser Extension**: Chrome/Edge extension with popup interface and content scripts
- **Backend API**: Node.js/Express server providing AI model integration and data processing
- **Demo Application**: Interactive demo showcasing extension capabilities

## 🏗️ Architecture Principles

### Modular Design
- **Single Responsibility**: Each module should have one clear purpose
- **Loose Coupling**: Modules should be independent and easily testable  
- **Clear Interfaces**: Use well-defined APIs between modules
- **File Size**: Keep files under 300 lines for optimal maintainability

### Code Organization
```
├── extension/src/modules/     # Feature-specific modules
├── backend/controllers/       # API endpoint handlers
├── backend/services/          # Business logic services
└── demo/modules/             # Demo-specific functionality
```

## 💻 Coding Standards

### JavaScript Style
- Use ES6+ features (async/await, destructuring, arrow functions)
- Prefer const/let over var
- Use template literals for string interpolation
- Implement proper error handling with try/catch

### Naming Conventions
- **Variables/Functions**: camelCase (`getCurrentModel`, `formData`)
- **Classes**: PascalCase (`FormAnalyzer`, `DataExtractor`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`, `DEFAULT_CONFIG`)
- **Files**: kebab-case (`form-filler-handler.js`, `popup-manager.js`)

### Function Structure
```javascript
/**
 * Brief description of what the function does
 * @param {type} paramName - Parameter description
 * @returns {type} Return value description
 */
async function functionName(paramName) {
    try {
        // Implementation
        return result;
    } catch (error) {
        console.error('Function failed:', error);
        throw new Error(`Specific error context: ${error.message}`);
    }
}
```

## 🔧 Extension Development

### Content Script Patterns
- Use message passing for communication with background scripts
- Implement proper DOM observation for dynamic content
- Handle both iframe and main page contexts
- Graceful degradation when APIs are unavailable

### Popup Interface
- Maintain state in `popupManager.js`
- Handle settings persistence in `popupSettingsManager.js`
- Manage AI model selection in `popupModelManager.js`
- Process form interactions in `popupEventHandlers.js`

### Form Processing
- Detect forms using `formDetectionService.js`
- Analyze form structure with `formAnalysisService.js`
- Fill forms via `formFillerHandler.js`
- Provide user feedback through `uiController.js`

## 🤖 AI Integration Guidelines

### Model Support
- **Primary**: Ollama local models (privacy-first approach)
- **Secondary**: Cloud models (OpenAI, DeepSeek, etc.)
- Always provide fallback options when models are unavailable

### API Communication
```javascript
// Preferred pattern for AI API calls
const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        model: selectedModel,
        prompt: userPrompt,
        context: extractedData
    })
});

if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
}
```

### Error Handling
- Implement circuit breaker pattern for API failures
- Provide clear user feedback for different error types
- Log errors appropriately without exposing sensitive data
- Offer retry mechanisms with exponential backoff

## 📊 Data Processing

### Extraction Pipeline
1. **Raw Data**: Extract HTML content from page
2. **Cleaning**: Remove scripts, styles, unnecessary elements
3. **Structuring**: Convert to JSON/Markdown formats
4. **Enhancement**: Add context and metadata

### Form Analysis
1. **Detection**: Identify form elements and structure
2. **Classification**: Categorize field types and purposes
3. **Mapping**: Match extracted data to form fields
4. **Validation**: Ensure data compatibility and format

## 🎨 UI/UX Patterns

### User Feedback
- Show loading states for async operations
- Provide clear success/error messages
- Use progressive disclosure for complex settings
- Maintain consistent visual hierarchy

### State Management
```javascript
// Preferred state management pattern
class ComponentManager {
    constructor() {
        this.state = {
            isLoading: false,
            selectedModel: null,
            extractedData: null
        };
        this.eventEmitter = new EventTarget();
    }
    
    updateState(updates) {
        this.state = { ...this.state, ...updates };
        this.eventEmitter.dispatchEvent(new CustomEvent('stateChange', {
            detail: this.state
        }));
    }
}
```

## 🔐 Security & Privacy

### Data Handling
- Minimize data collection and retention
- Use local storage for non-sensitive settings
- Implement secure communication with backend
- Respect user privacy preferences

### Extension Security
- Request minimal necessary permissions
- Validate all inputs from web pages
- Sanitize data before processing
- Use Content Security Policy (CSP)

## 🧪 Testing Patterns

### Manual Testing
- Test with various form types and structures
- Verify functionality across different browsers
- Check performance with large documents
- Validate AI model switching and fallbacks

### Error Scenarios
- Network connectivity issues
- Invalid form structures
- AI model unavailability
- Malformed API responses

## 📦 Backend Development

### API Design
- Use RESTful endpoints with clear naming
- Implement proper HTTP status codes
- Provide detailed error responses
- Support both local and cloud AI models

### Service Architecture
```javascript
// Preferred service pattern
class ServiceName {
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    
    async processData(input) {
        this.validateInput(input);
        const result = await this.performOperation(input);
        return this.formatOutput(result);
    }
    
    validateInput(input) {
        if (!input) throw new Error('Input required');
        // Additional validation
    }
}
```

## 🔄 Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `bugfix/*`: Bug fix branches

### Commit Messages
Follow conventional commits:
```
feat(form-filler): add support for nested fieldsets
fix(api): resolve timeout issues with Ollama models
docs(readme): update installation instructions
refactor(ui): extract validation logic to separate module
```

## 📋 Common Patterns

### Module Structure
```javascript
// Standard module pattern
class ModuleName {
    constructor(dependencies = {}) {
        this.dependencies = dependencies;
        this.initialized = false;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.setupModule();
            this.initialized = true;
        } catch (error) {
            console.error('Module initialization failed:', error);
            throw error;
        }
    }
    
    async setupModule() {
        // Module-specific setup
    }
}

export default ModuleName;
```

### Event Handling
```javascript
// Preferred event handling pattern
class EventHandler {
    constructor() {
        this.bindEvents();
    }
    
    bindEvents() {
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('change', this.handleChange.bind(this));
    }
    
    handleClick(event) {
        const target = event.target;
        if (target.matches('.action-button')) {
            this.performAction(target);
        }
    }
}
```

## 🎯 Performance Guidelines

### Optimization Strategies
- Lazy load modules when needed
- Debounce user input handling
- Cache API responses when appropriate
- Use efficient DOM queries and updates

### Memory Management
- Remove event listeners when components are destroyed
- Clear intervals and timeouts appropriately
- Avoid memory leaks in long-running processes
- Monitor and optimize large data structures

## 🚀 Deployment Considerations

### Extension Distribution
- Follow Chrome Web Store guidelines
- Implement proper versioning and updates
- Provide clear installation instructions
- Handle permission requests gracefully

### Backend Deployment
- Environment-specific configurations
- Proper error logging and monitoring
- Scalable architecture for multiple users
- Security hardening for production

## 📚 Documentation Standards

### Code Documentation
- Document complex algorithms and business logic
- Provide examples for public APIs
- Explain non-obvious design decisions
- Keep documentation current with code changes

### User Documentation
- Clear installation and setup instructions
- Comprehensive troubleshooting guides
- Examples for common use cases
- Regular updates for new features

---

This document should guide development decisions and ensure consistency across the Smart Form Filler codebase. Update as the project evolves and new patterns emerge.
