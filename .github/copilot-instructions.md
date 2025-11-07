# Copilot Instructions for Smart Form Filler

**Project Type:** TypeScript-based Browser Extension (Frontend-only, TDD approach)

**Documentation Language:** English (all code, comments, commit messages, and documentation must be in English)

## 🎯 Project Overview

Smart Form Filler is a TypeScript browser extension for AI-powered data extraction and form filling.

**Current Phase:** Migration to TypeScript + TDD (see `.github/TS_MIGRATION_PLAN.md`)

**Architecture:**
- Pure frontend browser extension (Manifest V3)
- User-configured AI APIs (Azure OpenAI, Ollama)
- Test-driven development with Vitest + Playwright

## 🏗️ Development Principles

### Core Rules
1. **TDD First**: Write tests before implementation (Red → Green → Refactor)
2. **Type Safety**: Use TypeScript strictly, avoid `any` unless documented
3. **Modular Design**: Single responsibility, clear interfaces, <300 lines per file
4. **Test Coverage**: Maintain ≥80% overall, ≥90% for core modules
5. **English Only**: All documentation, comments, and commit messages in English

## 💻 TypeScript Standards

### Code Style
- **Language**: TypeScript 5.3+ with strict mode
- **Async Operations**: Use async/await, Promise-based
- **Error Handling**: Typed errors, comprehensive try/catch
- **Imports**: Use path aliases (`@/config`, `@/types`)

### Naming Conventions
- **Variables/Functions**: camelCase (`getCurrentModel`, `formData`)
- **Classes/Interfaces**: PascalCase (`IApiService`, `ConfigManager`)
- **Types**: PascalCase with descriptive names (`ChatMessage`, `ModelConfig`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`, `DEFAULT_TIMEOUT`)
- **Files**: camelCase (`apiConfigManager.ts`, `storageManager.ts`)

### Type Definitions
```typescript
/**
 * Description of the interface/type
 */
export interface ApiConfig {
  provider: 'azure' | 'ollama';
  apiKey?: string;
  endpoint: string;
}

/**
 * Service for managing API configurations
 */
export class ApiConfigManager {
  async saveConfig(name: string, config: ApiConfig): Promise<void> {
    // Implementation with proper error handling
  }
}
```

## 🧪 Testing Requirements

### TDD Workflow
1. **Write Test First**: Define expected behavior in test
2. **Run Test (Red)**: Verify test fails
3. **Implement**: Write minimal code to pass test
4. **Run Test (Green)**: Verify test passes
5. **Refactor**: Optimize code while keeping tests green

### Test Structure
```typescript
// src/config/__tests__/apiConfigManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiConfigManager } from '../apiConfigManager';

describe('ApiConfigManager', () => {
  let manager: ApiConfigManager;
  
  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ApiConfigManager();
  });
  
  it('should save valid Azure config', async () => {
    const config = { provider: 'azure', apiKey: 'test' };
    await manager.saveConfig('test', config);
    expect(await manager.getConfig('test')).toEqual(config);
  });
});
```

### Coverage Targets
- **Core Services**: ≥90% (config, AI services)
- **Utilities**: 100% (pure functions)
- **UI Components**: ≥70% (interactive elements)
- **Overall**: ≥80%

## 🤖 AI Service Architecture

### Provider Support
- **Azure OpenAI**: User-configured endpoint, API key, deployment
- **Ollama**: Local models (http://localhost:11434)
- **Pattern**: Factory pattern for service creation, adapter pattern for API formats

### Implementation Pattern
```typescript
// src/services/ai/azureOpenAIService.ts
export class AzureOpenAIService implements IAIService {
  constructor(private config: AzureOpenAIConfig) {}
  
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    // Use background script for CORS handling
    const response = await chrome.runtime.sendMessage({
      type: 'API_CALL',
      url: this.buildUrl(),
      options: this.buildRequestOptions(messages, options)
    });
    
    if (!response.success) {
      throw new ApiError(response.error);
    }
    
    return this.processResponse(response.data);
  }
}
```

### Error Handling
- Type-safe errors with specific error classes
- Exponential backoff for retries (max 3 attempts)
- User-friendly error messages
- No sensitive data in logs

## 📁 Project Structure

```
src/
├── background/          # Background script (API proxy, message routing)
├── content/             # Content scripts (form detection, filling)
├── popup/               # Popup UI (settings, controls)
├── config/              # Configuration management
│   ├── apiConfigManager.ts
│   ├── storageManager.ts
│   └── modelRegistry.ts
├── services/
│   ├── ai/              # AI services (Azure, Ollama, adapters)
│   └── processing/      # Data processing (HTML, Markdown)
├── types/               # TypeScript type definitions
│   ├── api.ts
│   ├── config.ts
│   ├── models.ts
│   └── chrome.d.ts
└── utils/               # Utility functions (HTTP, logger, crypto)
```

## 📝 Commit Standards

Follow Conventional Commits with milestone tracking:

```bash
<type>(<scope>): <subject>

<body>

MILESTONE: M[x] - [Milestone Name]
CHECKPOINT: CP-M[x]-[n]
```

**Types**: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `perf`

**Example**:
```bash
git commit -m "feat(config): implement API config manager

- Add Azure OpenAI config support
- Add Ollama config support
- Implement encryption for API keys
- Add comprehensive tests (95% coverage)

MILESTONE: M2 - Configuration Management
CHECKPOINT: CP-M2-2"
```

## 🔐 Security Requirements

### Data Protection
- **API Keys**: Encrypt before storing (Chrome Storage API + base64)
- **User Data**: Process locally, never send to external servers
- **Storage**: Use `chrome.storage.local` for persistence
- **Validation**: Sanitize all user inputs and web page data

### CORS Handling
Use background script as proxy for API calls:
```typescript
// background/apiProxy.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_CALL') {
    fetch(request.url, request.options)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

## 🛠️ Development Tools

**Build & Dev**:
- `pnpm dev` - Start development build with watch mode
- `pnpm build` - Production build
- `pnpm type-check` - TypeScript type checking

**Testing**:
- `pnpm test` - Run all tests
- `pnpm test:watch` - Watch mode for TDD
- `pnpm test:coverage` - Generate coverage report
- `pnpm test:e2e` - Run Playwright E2E tests

**Quality**:
- `pnpm lint` - ESLint check
- `pnpm format` - Prettier format
- Pre-commit hooks automatically run lint + tests

## 🚦 Code Review Checklist

Before submitting code, ensure:

**TypeScript**:
- [ ] No `any` types (or documented exceptions)
- [ ] All interfaces/types exported from `src/types/`
- [ ] JSDoc comments for public APIs
- [ ] Type-safe error handling

**Testing**:
- [ ] Tests written BEFORE implementation
- [ ] All tests pass (`pnpm test`)
- [ ] Coverage meets target (check with `pnpm test:coverage`)
- [ ] Mock external dependencies (Chrome API, fetch)

**Code Quality**:
- [ ] No linting errors (`pnpm lint`)
- [ ] Formatted with Prettier (`pnpm format`)
- [ ] Files <300 lines
- [ ] No console.log (use Logger utility)

**Documentation**:
- [ ] README updated if API changed
- [ ] Commit message follows convention
- [ ] MILESTONE and CHECKPOINT tags included

## 📚 Key References

**Migration Plan**: `.github/TS_MIGRATION_PLAN.md`  
**TDD Guide**: `.github/TDD_GUIDE.md`  
**Milestones**: `.github/MILESTONES.md`

**Current Milestone**: Check progress in `MILESTONES.md`

**Tech Stack**:
- TypeScript 5.3+ (strict mode)
- Vite 5.x (build tool)
- Vitest 1.x (unit tests)
- Playwright 1.40+ (E2E tests)
- pnpm 8.x (package manager)

## ⚡ Quick Start for Contributors

1. **Setup Project**:
   ```bash
   git clone <repo>
   cd smart-form-filler
   pnpm install
   ```

2. **Start TDD Workflow**:
   ```bash
   pnpm test:watch  # Keep running in terminal
   # Write test → See it fail → Implement → See it pass
   ```

3. **Before First Commit**:
   - Read `.github/TS_MIGRATION_PLAN.md`
   - Check current milestone in `.github/MILESTONES.md`
   - Review `.github/TDD_GUIDE.md` for testing patterns

4. **Common Tasks**:
   - Add new feature: Start with test in `__tests__/` folder
   - Fix bug: Write failing test first, then fix
   - Refactor: Ensure tests pass before and after

---

**Last Updated**: 2025-11-07  
**Document Version**: 2.0.0 (TypeScript Migration)
