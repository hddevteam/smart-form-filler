# Contributing to Smart Form Filler

Thank you for your interest in contributing to Smart Form Filler! This document provides guidelines and information for contributors.

## 🎯 Ways to Contribute

- **🐛 Report Bugs**: Help us identify and fix issues
- **✨ Suggest Features**: Propose new functionality or improvements
- **📖 Improve Documentation**: Help make our docs clearer and more comprehensive
- **💻 Submit Code**: Fix bugs, implement features, or improve performance
- **🧪 Testing**: Help test new features and report issues
- **🌍 Translations**: Help translate the extension (future feature)

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- A Chromium-based browser (Chrome, Edge, Brave, etc.)

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/smart-form-filler.git
   cd smart-form-filler
   ```

2. **Install Dependencies**
   ```bash
   npm run install:all
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Load Extension in Browser**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension` folder

5. **Test Demo**
   ```bash
   npm run demo
   ```
   Then visit `http://localhost:3002`

## 📁 Project Structure

```
smart-form-filler/
├── backend/                 # Backend API server
│   ├── controllers/         # API endpoints and business logic
│   ├── services/           # Core services (GPT, data processing)
│   ├── routes/             # Express routes
│   └── utils/              # Utility functions
├── extension/              # Browser extension
│   ├── src/                # Extension source code
│   │   ├── modules/        # Feature modules
│   │   ├── services/       # Extension services
│   │   └── utils/          # Utility functions
│   ├── manifest.json       # Extension manifest
│   └── popup.html          # Extension popup UI
├── demo/                   # Interactive demo
│   ├── modules/            # Demo-specific modules
│   └── *.html              # Demo pages
└── docs/                   # Documentation
```

## 🔧 Development Guidelines

### Code Style

- **JavaScript**: Follow ES6+ standards
- **Formatting**: Use consistent indentation (2 spaces)
- **Naming**: Use camelCase for variables and functions, PascalCase for classes
- **Comments**: Document complex logic and API interfaces

### Modular Architecture

The project follows a modular architecture:

- **Single Responsibility**: Each module should have one clear purpose
- **Loose Coupling**: Modules should be independent and easily testable
- **Clear Interfaces**: Use well-defined APIs between modules
- **File Size**: Keep files under 300 lines for maintainability

### Git Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, documented code
   - Follow existing patterns and conventions
   - Add tests for new functionality

3. **Commit Messages**
   Use conventional commits format:
   ```
   type(scope): description
   
   feat(form-filler): add support for nested form fields
   fix(api): resolve timeout issues with Ollama models
   docs(readme): update installation instructions
   refactor(ui): extract form validation logic
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request using our PR template.

### Testing

- **Manual Testing**: Test extension functionality in browser
- **AI Models**: Test with both Ollama and cloud models
- **Cross-Browser**: Test in Chrome and Edge when possible
- **Demo Testing**: Verify demo scenarios work correctly

## 🐛 Bug Reports

When reporting bugs, please:

1. **Use the Bug Report Template**: This helps us understand the issue
2. **Provide Reproduction Steps**: Clear steps to reproduce the bug
3. **Include Environment Details**: Browser, OS, extension version
4. **Add Logs/Screenshots**: Console errors and visual evidence
5. **Check Existing Issues**: Avoid duplicates

## ✨ Feature Requests

For new features:

1. **Use the Feature Request Template**: Provides structured information
2. **Explain the Use Case**: Why is this feature needed?
3. **Consider Implementation**: Think about how it might work
4. **Check Roadmap**: See if it's already planned

## 📖 Documentation

Documentation improvements are always welcome:

- **README Updates**: Keep installation and usage guides current
- **Code Comments**: Explain complex logic
- **API Documentation**: Document backend endpoints
- **Examples**: Add more demo scenarios

## 🔒 Security

- **Report Security Issues**: Email security concerns privately
- **Data Privacy**: Be mindful of user data handling
- **AI Model Security**: Consider implications of AI integrations
- **Extension Permissions**: Only request necessary permissions

## 🧪 AI Model Guidelines

When working with AI features:

- **Local-First**: Prioritize Ollama/local model support
- **Fallback Handling**: Graceful degradation when models unavailable
- **Error Handling**: Clear error messages for AI failures
- **Privacy**: Minimize data sent to cloud services
- **Performance**: Optimize for responsive user experience

## 📋 Pull Request Process

1. **Follow PR Template**: Complete all relevant sections
2. **Self-Review**: Review your own code before submission
3. **Tests**: Ensure all tests pass
4. **Documentation**: Update docs for new features
5. **Breaking Changes**: Clearly document any breaking changes

### Review Process

- PRs require at least one approval
- Automated checks must pass
- Address reviewer feedback promptly
- Squash commits before merging (if requested)

## 🏷️ Issue Labels

We use labels to categorize issues:

- **Type**: `bug`, `enhancement`, `documentation`
- **Priority**: `critical`, `high`, `medium`, `low`
- **Component**: `extension`, `backend`, `demo`, `ai-integration`
- **Status**: `needs-triage`, `in-progress`, `blocked`

## 💬 Communication

- **GitHub Issues**: For bugs, features, and discussions
- **Pull Requests**: For code review and collaboration
- **Discussions**: For general questions and ideas

## 🎉 Recognition

Contributors will be:

- Added to the contributors list
- Mentioned in release notes for significant contributions
- Thanked in the community

## 📄 License

By contributing, you agree that your contributions will be licensed under the same ISC License that covers the project.

## ❓ Questions?

If you have questions not covered here:

1. Check existing documentation
2. Search through issues
3. Create a new discussion or issue
4. Tag relevant maintainers

Thank you for contributing to Smart Form Filler! 🚀
