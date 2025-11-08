# Milestones (Concise) — Smart Form Filler TS Migration

Purpose: Single, up-to-date plan mirroring actual progress. English only. MV3 frontend, TDD-first.

Legend: 🔲 Not Started · 🟡 In Progress · ✅ Done

## Snapshot (2025-11-08)

- Overall Coverage: ~85%
- Tooling: pnpm 8, Node 20, Vite 7, TS 5.9 strict, Vitest 4, ESLint 9, Prettier 3

## High-level Timeline

M0→M1→M2→M3→M4→M5→M6→M7→M8→M9 (43d total)

## Current Status

- M0 Setup: ✅ Completed (2025-11-07)
- M1 Types: 🟡 In Progress
- M2 Config: 🟡 In Progress
- M3 AI Service Layer: 🟡 In Progress
- M4 Data Processing: 🔲
- M5 UI Layer: 🟡 In Progress
- M6 Content Scripts: 🟡 In Progress
- M7 Background Script: 🟡 In Progress
- M8 Integration Testing: 🔲
- M9 Optimization & Release: 🔲

## What's Done (sync with repo)

Details removed (completed work summarized in commit history and PRs).

## Next Focus

- M7: Wire popup/content to send AI_REQUEST; add integration tests.
- M3: Implement AIServiceFactory; add DeepSeek adapter; reasoning/tool params; tests (≥85%).
- M5: Connection Test refinement vs background routing; UI tests ≥70%.
- M8: Playwright setup for configuration and form flows.

## Acceptance Targets

- Strict TS, no any (exceptions documented).
- Core services ≥90%; adapters ≥85%.
- UI ≥70%; Content ≥75%; Overall ≥80%.

## Checkpoints (condensed)

- M2 Config: CP-M2-1 StorageManager — 🟡; CP-M2-2 ApiConfigManager — 🟡; CP-M2-3 ModelRegistry — ✅; CP-M2-4 Validation — 🔲; CP-M2-5 Integration — 🔲
- M3 AI: CP-M3-1 BaseAdapter — ✅; CP-M3-2 Adapters/Factory — ✅ baseline; CP-M3-3 AIService + retries + background — ✅; CP-M3-4 AIServiceFactory — 🔲; CP-M3-5 API proxy util — 🟡; CP-M3-6 Adapter integration tests — 🔲
- M5 UI: CP-M5-2 ConfigurationUI — ✅; CP-M5-3 ModelSelector — ✅; CP-M5-4 ConnectionTest — ✅ initial; CP-M5-5 Popup init — ✅; CP-M5-6 UI integration tests — 🟡; CP-M5-7 Data source sub-layer — ✅
- M6 Content: CP-M6-1 Detector — ✅; CP-M6-2 Filler — ✅; CP-M6-3 Extractor — ✅; CP-M6-4 Content main — ✅; CP-M6-5 Playwright — 🔲
- M7 Background: CP-M7-1 Proxy queue/limit/cache — Skipped; CP-M7-2 MessageRouter — 🟢 (created, wired, unit tests added); CP-M7-3 Background main — 🟡 (listener wired); CP-M7-4 Integration — 🔲
- M8 Integration: Playwright setup + flows + perf + cross-browser — 🔲
- M9 Release: Perf, docs, security, packaging — 🔲

## Commit Tags

Use Conventional Commits with milestone/checkpoint tags, e.g.:

- MILESTONE: M3 - AI Service Layer
- CHECKPOINT: CP-M3-3

---

## Archived Detailed Plan

### Project Timeline

```
M0 ━━━━━> M1 ━━━━━> M2 ━━━━━━━━> M3 ━━━━━━━━━━> M4 ━━━━━> M5 ━━━━━━━━> M6 ━━━━━> M7 ━━━━> M8 ━━━━━> M9
2d        3d       5d          7d            4d       6d          5d       3d      4d       4d

Setup     Types    Config      AI Services   Data     UI Layer    Content  BG      Test     Release
```

**Total Duration:** 43 days (approximately 6-7 weeks)

**Legend:** d = days, BG = Background Script

| Milestone                          | Goal                     | Duration | Dependencies |
| ---------------------------------- | ------------------------ | -------- | ------------ |
| [M0](#m0-project-initialization)   | Project initialization   | 2 days   | None         |
| [M1](#m1-core-type-system)         | Core type system         | 3 days   | M0           |
| [M2](#m2-configuration-management) | Configuration management | 5 days   | M1           |
| [M3](#m3-ai-service-layer)         | AI service layer         | 7 days   | M1, M2       |
| [M4](#m4-data-processing-layer)    | Data processing layer    | 4 days   | M1           |
| [M5](#m5-ui-layer)                 | UI layer                 | 6 days   | M2, M3       |
| [M6](#m6-content-scripts)          | Content scripts          | 5 days   | M3, M4       |
| [M7](#m7-background-script)        | Background script        | 3 days   | M3           |
| [M8](#m8-integration-testing)      | Integration testing      | 4 days   | M5, M6, M7   |
| [M9](#m9-optimization--release)    | Optimization & release   | 4 days   | M8           |

<!-- Consolidated to avoid duplication -->

## M0: Project Initialization

**Duration:** 2 days  
**Goal:** Set up complete TypeScript project infrastructure

### Checkpoints

#### CP-M0-1: Project Scaffolding

- [ ] Initialize Git repository
- [ ] Create project structure (`src/`, `tests/`, `public/`)
- [ ] Initialize pnpm (`pnpm init`)
- [ ] Create `.gitignore`

**Deliverable:** Basic folder structure

#### CP-M0-2: TypeScript Configuration

- [ ] Install TypeScript and dependencies
- [ ] Create `tsconfig.json` (strict mode)
- [ ] Create `tsconfig.node.json`
- [ ] Verify type checking works

**Deliverable:** `tsconfig.json`, `tsconfig.node.json`

#### CP-M0-3: Build Tool Setup

- [ ] Install and configure Vite
- [ ] Create `vite.config.ts`
- [ ] Test development build
- [ ] Test production build

**Deliverable:** Working Vite build system

#### CP-M0-4: Testing Framework

- [ ] Install Vitest and dependencies
- [ ] Create `vitest.config.ts`
- [ ] Create test setup file (`tests/setup.ts`)
- [ ] Mock Chrome API
- [ ] Write sample test to verify setup

**Deliverable:** `vitest.config.ts`, working test command

#### CP-M0-5: Code Quality Tools

- [ ] Install and configure ESLint
- [ ] Install and configure Prettier
- [ ] Setup Husky (Git hooks)
- [ ] Configure lint-staged
- [ ] Setup commitlint

**Deliverable:** `.eslintrc.cjs`, `.prettierrc`, `.husky/`

#### CP-M0-6: CI/CD Pipeline

- [ ] Create `.github/workflows/test.yml`
- [ ] Create `.github/workflows/build.yml`
- [ ] Test GitHub Actions locally (act)
- [ ] Verify CI passes

**Deliverable:** GitHub Actions workflows

<!-- Completed acceptance criteria details removed to keep concise -->

---

## M1: Core Type System

**Duration:** 3 days  
**Dependencies:** M0  
**Goal:** Define comprehensive TypeScript type system and utilities

### Checkpoints

#### CP-M1-1: API Types

- [ ] Define `ApiConfig` interface
- [ ] Define `ApiProvider` type
- [ ] Define `ChatMessage` interface
- [ ] Define `ChatOptions` interface
- [ ] Define `ChatResponse` interface
- [ ] Define API error types

**Deliverable:** `src/types/api.ts`

**Example:**

```typescript
export interface ApiConfig {
  provider: 'azure' | 'ollama';
  name: string;
  apiKey?: string;
  endpoint: string;
  model: string;
  timeout?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

#### CP-M1-2: Configuration Types

- [ ] Define `StorageConfig` interface
- [ ] Define `ModelConfig` interface
- [ ] Define `ExtensionConfig` interface
- [ ] Define configuration validation types

**Deliverable:** `src/types/config.ts`

#### CP-M1-3: Model Types

- [ ] Define `ModelInfo` interface
- [ ] Define `ModelCapability` type
- [ ] Define `ModelRegistry` type
- [ ] Define provider-specific model types

**Deliverable:** `src/types/models.ts`

#### CP-M1-4: Chrome Extension Types

- [ ] Extend Chrome API types as needed
- [ ] Define custom message types
- [ ] Define storage schema types

**Deliverable:** `src/types/chrome.d.ts`

#### CP-M1-5: Utility Functions

- [ ] Implement HTTP client
- [ ] Implement logger utility
- [ ] Implement crypto utilities (encrypt/decrypt)
- [ ] Write tests for all utilities (100% coverage)

**Deliverable:** `src/utils/`, utility tests

**Example Test:**

```typescript
// src/utils/__tests__/logger.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  it('should log with correct level', () => {
    const spy = vi.spyOn(console, 'log');
    Logger.info('test message');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
  });

  it('should not log when level is disabled', () => {
    Logger.setLevel('error');
    const spy = vi.spyOn(console, 'log');
    Logger.info('test');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

### Acceptance Criteria (In Progress)

- All type files compile without errors
- No use of `any` type (or documented exceptions)
- Utility functions have ≥100% test coverage
- All utilities have JSDoc comments
- Types are exported from `src/types/index.ts`

<!-- Commit template samples trimmed; use Conventional Commits with milestone tags -->

---

## M2: Configuration Management

**Duration:** 5 days  
**Dependencies:** M1  
**Goal:** Implement storage, API configuration, and model registry

### Checkpoints

#### CP-M2-1: Storage Manager (TDD)

**Test First:**

```typescript
// src/config/__tests__/storageManager.test.ts
describe('StorageManager', () => {
  it('should save and retrieve data', async () => {
    const storage = new StorageManager();
    await storage.save('key', { value: 1 });
    const data = await storage.get('key');
    expect(data).toEqual({ value: 1 });
  });

  it('should handle Chrome storage errors', async () => {
    vi.spyOn(chrome.storage.local, 'set').mockRejectedValue(new Error('Storage full'));
    await expect(storage.save('key', {})).rejects.toThrow();
  });
});
```

**Implementation:**

- [ ] Write tests (Red)
- [ ] Implement `StorageManager` class (Green)
- [ ] Add type safety with generics
- [ ] Add error handling
- [ ] Refactor

**Deliverable:** `src/config/storageManager.ts`, tests (≥90% coverage)

#### CP-M2-2: API Config Manager (TDD)

**Test First:**

```typescript
describe('ApiConfigManager', () => {
  it('should save Azure config', async () => {
    const config: ApiConfig = {
      provider: 'azure',
      name: 'Test',
      endpoint: 'https://test.com',
      apiKey: 'sk-test',
      model: 'gpt-4',
    };
    await manager.saveConfig(config);
    const saved = await manager.getConfig('Test');
    expect(saved).toEqual(config);
  });

  it('should encrypt API key before saving', async () => {
    await manager.saveConfig(config);
    const raw = await getRawStorageData();
    expect(raw.apiKey).not.toBe(config.apiKey);
  });

  it('should validate config before saving', async () => {
    const invalid = { provider: 'invalid' } as any;
    await expect(manager.saveConfig(invalid)).rejects.toThrow('Invalid config');
  });
});
```

**Implementation:**

- [ ] Write test cases (Red)
- [ ] Implement `ApiConfigManager` (Green)
- [ ] Add encryption for API keys
- [ ] Add validation logic
- [ ] Add CRUD operations
- [ ] Refactor

**Deliverable:** `src/config/apiConfigManager.ts`, tests (≥90% coverage)

#### CP-M2-3: Model Registry

**Implementation:**

- [ ] Define model metadata (capabilities, context window, pricing)
- [ ] Implement model lookup functions
- [ ] Add provider-specific model lists
- [ ] Write tests

**Deliverable:** `src/config/modelRegistry.ts`, tests

**Example:**

```typescript
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  'gpt-4': {
    provider: 'azure',
    name: 'gpt-4',
    contextWindow: 8192,
    capabilities: ['chat', 'function-calling'],
  },
  llama2: {
    provider: 'ollama',
    name: 'llama2',
    contextWindow: 4096,
    capabilities: ['chat'],
  },
};
```

#### CP-M2-4: Configuration Validation

- [ ] Implement config validators
- [ ] Add schema validation (Zod/Yup)
- [ ] Write comprehensive validation tests

**Deliverable:** `src/config/validators.ts`, tests

#### CP-M2-5: Integration Tests

- [ ] Test StorageManager + ApiConfigManager integration
- [ ] Test config persistence across sessions
- [ ] Test concurrent config operations

**Deliverable:** Integration test suite

### Acceptance Criteria

- [x] Can save/retrieve/delete API configurations
- [x] API keys are encrypted in storage
- [x] Config validation prevents invalid data
- [x] Test coverage ≥90% for all modules
- [x] No data loss during concurrent operations

### Commit Template

```bash
git commit -m "feat(config): implement configuration management system

- Add StorageManager with generic type support
- Add ApiConfigManager with encryption
- Add ModelRegistry with provider metadata
- Add config validation layer
- Add comprehensive tests (95% coverage)

MILESTONE: M2 - Configuration Management
CHECKPOINT: CP-M2-5"
```

---

## M3: AI Service Layer

**Duration:** 7 days  
**Dependencies:** M1, M2  
**Goal:** Migrate backend/services/gptService to frontend TypeScript in background script

**Migration Reference**: See `.github/AI_SERVICE_MIGRATION.md` for detailed migration guide

**Key Backend Files to Migrate**:

- `backend/services/gptService/apiService.js` → `src/background/services/ai/aiService.ts`
- `backend/services/gptService/config.js` → `src/background/services/ai/modelConfig.ts`
- `backend/services/gptService/modelAdapters/` → `src/background/services/ai/adapters/`

### Checkpoints

#### CP-M3-1: Base Adapter Migration

**Reference**: Migrate from `backend/services/gptService/modelAdapters/BaseAdapter.js`

**TypeScript Definition:**

```typescript
// src/background/services/ai/adapters/BaseAdapter.ts
// Migrated from backend/services/gptService/modelAdapters/BaseAdapter.js
export abstract class BaseAdapter {
  protected config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  // From backend: getHeaders(apiKey)
  getHeaders(apiKey: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['api-key'] = apiKey;
    }
    return headers;
  }

  // From backend: processRequestBody(prompt, params)
  processRequestBody(
    messages: ChatMessage[],
    params: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      messages,
      ...params,
    };
  }

  // Optional: processResponse for provider-specific formats
  processResponse?(data: unknown): ChatResponse;
}
```

**Tasks:**

- [ ] Migrate BaseAdapter from backend
- [ ] Convert to TypeScript with proper types
- [ ] Add retry logic with exponential backoff (if not in backend)
- [ ] Write tests matching backend behavior

**Deliverable:** `src/background/services/ai/adapters/BaseAdapter.ts`, tests

#### CP-M3-2: Adapter Factory & Provider Adapters

**Reference**: Migrate from `backend/services/gptService/modelAdapters/`

**AdapterFactory Migration:**

```typescript
// src/background/services/ai/adapters/AdapterFactory.ts
// From backend/services/gptService/modelAdapters/AdapterFactory.js
export class AdapterFactory {
  static getAdapter(model: string, config: ModelConfig): BaseAdapter {
    // Ollama models
    if (model.startsWith('ollama:')) {
      return new OllamaAdapter(config);
    }

    // O-series models
    if (['o1', 'o1-mini', 'o3', 'o3-mini', 'o4-mini'].includes(model)) {
      return new OSeriesAdapter(config);
    }

    // DeepSeek R1
    if (model === 'deepseek-r1') {
      return new DeepSeekAdapter(config);
    }

    // Default: Azure OpenAI / standard OpenAI compatible
    return new BaseAdapter(config);
  }
}
```

**Tasks:**

- [ ] Migrate AdapterFactory from backend
- [ ] Migrate OllamaAdapter (handles Ollama-specific format)
- [ ] Migrate OSeriesAdapter (handles max_completion_tokens)
- [ ] Migrate DeepSeekAdapter (handles DeepSeek-specific params)
- [ ] Write tests for each adapter matching backend behavior

**Deliverable:** All adapters in `src/background/services/ai/adapters/`, tests (≥90% coverage)

#### CP-M3-3: Core AI Service Migration

**Reference**: Migrate from `backend/services/gptService/apiService.js`

**AIService Implementation:**

```typescript
// src/background/services/ai/aiService.ts
// Migrated from backend/services/gptService/apiService.js
export class AIService {
  private config: ModelConfig;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  // From backend: makeRequest()
  async makeRequest(options: {
    apiKey: string;
    apiUrl: string;
    model: string;
    messages: ChatMessage[];
    params: Record<string, unknown>;
    includeFunctionCalls?: boolean;
    customTools?: unknown[];
    reasoningEffort?: 'low' | 'medium' | 'high';
    reasoningSummary?: 'auto' | 'concise' | 'detailed';
    isOllama?: boolean;
  }): Promise<ChatResponse> {
    // 1. Get adapter from factory
    // 2. Process messages for model compatibility (system → developer for o-series)
    // 3. Add reasoning parameters if supported
    // 4. Build request body with adapter
    // 5. Add tools if function calling enabled
    // 6. Make fetch() request (replaces axios from backend)
    // 7. Process response with adapter
    // 8. Process reasoning summary (<think> blocks)
  }

  // From backend: processMessagesForModel()
  private processMessagesForModel(messages: ChatMessage[], model: string): ChatMessage[];

  // From backend: filterMessagesByModel()
  private filterMessagesByModel(messages: ChatMessage[], model: string): ChatMessage[];

  // From backend: processReasoningSummary()
  private processReasoningSummary(response: ChatResponse): ChatResponse;
}
```

**Tasks:**

- [ ] Migrate makeRequest() core logic
- [ ] Migrate message processing (system → developer for o-series)
- [ ] Migrate reasoning summary processing
- [ ] Replace axios with fetch
- [ ] Write comprehensive tests matching backend behavior

**Deliverable:** `src/background/services/ai/aiService.ts`, tests (≥90% coverage)

#### CP-M3-4: AI Service Factory

**Implementation:**

```typescript
export class AIServiceFactory {
  static create(config: ApiConfig): IAIService {
    switch (config.provider) {
      case 'azure':
        return new AzureOpenAIAdapter(config);
      case 'ollama':
        return new OllamaAdapter(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}
```

**Tasks:**

- [ ] Implement factory pattern
- [ ] Add provider detection
- [ ] Write tests

**Deliverable:** `src/services/ai/aiServiceFactory.ts`, tests

#### CP-M3-5: CORS Proxy (Background Script)

**Implementation:**

```typescript
// src/background/apiProxy.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'API_CALL') {
    fetch(request.url, request.options)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open
  }
});
```

**Tasks:**

- [ ] Implement API proxy in background script
- [ ] Add request/response handling
- [ ] Add timeout handling
- [ ] Write integration tests

**Deliverable:** `src/background/apiProxy.ts`, tests

#### CP-M3-6: Integration Tests

- [ ] Test Azure OpenAI end-to-end flow
- [ ] Test Ollama end-to-end flow
- [ ] Test error scenarios
- [ ] Test timeout handling
- [ ] Test retry logic

**Deliverable:** Integration test suite

### Acceptance Criteria (Planned)

- Azure OpenAI adapter works correctly
- Ollama adapter works correctly
- Factory creates correct adapter instances
- CORS issues resolved via background script proxy
- Retry logic handles transient failures
- Test coverage ≥85% for all adapters

### Commit Template

```bash
git commit -m "feat(ai): implement AI service layer with adapters

- Add BaseAdapter with retry logic
- Add AzureOpenAIAdapter with auth handling
- Add OllamaAdapter for local models
- Add AIServiceFactory for provider abstraction
- Add CORS proxy in background script
- Add comprehensive tests (87% coverage)

MILESTONE: M3 - AI Service Layer
CHECKPOINT: CP-M3-6"
```

---

## M4: Data Processing Layer

**Duration:** 4 days  
**Dependencies:** M1  
**Goal:** Implement HTML and Markdown processing services

### Checkpoints

#### CP-M4-1: HTML Processor (TDD)

**Test First:**

```typescript
describe('HTMLProcessor', () => {
  it('should extract text from HTML', () => {
    const html = '<div><p>Hello</p><span>World</span></div>';
    const text = processor.extractText(html);
    expect(text).toBe('Hello World');
  });

  it('should preserve structure in extraction', () => {
    const html = '<h1>Title</h1><p>Content</p>';
    const structured = processor.extractStructured(html);
    expect(structured).toEqual({
      title: 'Title',
      content: 'Content',
    });
  });

  it('should handle malformed HTML gracefully', () => {
    const html = '<div><p>Unclosed';
    expect(() => processor.extractText(html)).not.toThrow();
  });
});
```

**Implementation:**

- [ ] Write test cases
- [ ] Implement HTML parsing
- [ ] Implement text extraction
- [ ] Implement structured extraction
- [ ] Add error handling

**Deliverable:** `src/services/processing/htmlProcessor.ts`, tests (≥85% coverage)

#### CP-M4-2: Markdown Converter (TDD)

**Test First:**

```typescript
describe('MarkdownConverter', () => {
  it('should convert HTML to Markdown', () => {
    const html = '<h1>Title</h1><p>Paragraph</p>';
    const md = converter.toMarkdown(html);
    expect(md).toBe('# Title\n\nParagraph');
  });

  it('should preserve links in conversion', () => {
    const html = '<a href="https://test.com">Link</a>';
    const md = converter.toMarkdown(html);
    expect(md).toBe('[Link](https://test.com)');
  });
});
```

**Implementation:**

- [ ] Write test cases
- [ ] Implement HTML to Markdown conversion
- [ ] Handle common HTML elements
- [ ] Handle edge cases

**Deliverable:** `src/services/processing/markdownConverter.ts`, tests

#### CP-M4-3: Data Sanitization

**Implementation:**

- [ ] Implement XSS prevention
- [ ] Implement data validation
- [ ] Add content security checks
- [ ] Write security tests

**Deliverable:** `src/services/processing/sanitizer.ts`, tests

#### CP-M4-4: Integration Tests

- [ ] Test HTML → Markdown → AI flow
- [ ] Test large document processing
- [ ] Test performance benchmarks

**Deliverable:** Integration tests

### Acceptance Criteria (Planned)

- HTML processing handles all common elements
- Markdown conversion is accurate
- XSS prevention works correctly
- Large documents (>1MB) process efficiently
- Test coverage ≥85%

### Commit Template

```bash
git commit -m "feat(processing): implement data processing layer

- Add HTMLProcessor with text extraction
- Add MarkdownConverter for HTML→MD
- Add data sanitization for security
- Add performance optimizations
- Add comprehensive tests (88% coverage)

MILESTONE: M4 - Data Processing Layer
CHECKPOINT: CP-M4-4"
```

---

## M5: UI Layer

**Duration:** 6 days  
**Dependencies:** M2, M3  
**Goal:** Implement popup UI and configuration interface

### Checkpoints

#### CP-M5-1: Popup HTML Structure

**Tasks:**

- [ ] Design popup UI layout
- [ ] Create HTML structure (`public/popup.html`)
- [ ] Add CSS styles (`src/styles/popup.css`)
- [ ] Make responsive design

**Deliverable:** `public/popup.html`, CSS files

#### CP-M5-2: Configuration UI Component (TDD)

**Test First:**

```typescript
describe('ConfigurationUI', () => {
  it('should render config form', () => {
    const ui = new ConfigurationUI(container);
    expect(container.querySelector('form')).toBeDefined();
  });

  it('should save config on submit', async () => {
    const ui = new ConfigurationUI(container);
    fillForm({ provider: 'azure', name: 'Test', ... });
    await submitForm();

    const saved = await configManager.getConfig('Test');
    expect(saved).toBeDefined();
  });

  it('should validate form inputs', async () => {
    const ui = new ConfigurationUI(container);
    fillForm({ provider: 'azure', name: '', ... }); // Invalid
    await submitForm();

    expect(container.querySelector('.error')).toBeDefined();
  });
});
```

**Implementation:**

- [ ] Write test cases
- [ ] Implement configuration form
- [ ] Add form validation
- [ ] Add save/load functionality
- [ ] Add delete functionality

**Deliverable:** `src/popup/components/ConfigurationUI.ts`, tests (≥70% coverage)

#### CP-M5-3: Model Selector Component (TDD)

**Implementation:**

- [ ] Write test cases
- [ ] Implement model dropdown
- [ ] Add provider filtering
- [ ] Add model metadata display

**Deliverable:** `src/popup/components/ModelSelector.ts`, tests

#### CP-M5-4: Connection Test Component

**Implementation:**

- [ ] Add "Test Connection" button
- [ ] Implement connection validation
- [ ] Add loading states
- [ ] Add success/error feedback

**Deliverable:** `src/popup/components/ConnectionTest.ts`, tests

#### CP-M5-5: Popup Main Controller

**Implementation:**

```typescript
// src/popup/index.ts
import { ConfigurationUI } from './components/ConfigurationUI';
import { ModelSelector } from './components/ModelSelector';
import { ApiConfigManager } from '@/config/apiConfigManager';

async function initPopup() {
  const configManager = new ApiConfigManager();
  const configUI = new ConfigurationUI(document.getElementById('config-container'), configManager);

  await configUI.render();
}

document.addEventListener('DOMContentLoaded', initPopup);
```

**Tasks:**

- [ ] Implement popup initialization
- [ ] Wire up all components
- [ ] Add event handlers
- [ ] Add state management

**Deliverable:** `src/popup/index.ts`, tests

#### CP-M5-6: UI Integration Tests

#### CP-M5-7: Data Source sub-layer — ✅ (details removed)

- [ ] Test complete configuration workflow
- [ ] Test error handling
- [ ] Test UI responsiveness

**Deliverable:** UI integration tests

### Acceptance Criteria

- [x] Popup UI is functional and responsive
- [x] Can add/edit/delete API configurations
- [x] Model selector shows available models
- [x] Connection test validates configs
- [x] Test coverage ≥70% for UI components

### Commit Template

```bash
git commit -m "feat(ui): implement popup configuration interface

- Add popup HTML structure and styles
- Add ConfigurationUI component
- Add ModelSelector component
- Add ConnectionTest component
- Add popup main controller
- Add UI integration tests (73% coverage)

MILESTONE: M5 - UI Layer
CHECKPOINT: CP-M5-6"
```

---

## Fast Track: Edge TS Delivery (Priority)

**Duration:** 1–2 days  
**Goal:** Deliver a loadable MV3 Edge extension built from TypeScript without expanding scope.

### Scope & Tasks

- Migrate remaining JavaScript in extension (background/content/popup) to TypeScript with minimal typing, no logic change.
- Create TS entry points: `background.ts`, `content.ts`, `popup.ts` mapped to existing functionality.
- Configure Vite multi-entry build to output MV3-friendly bundle to `dist/`.
- Copy `manifest.json` and icons to `dist/`; update script references to built files.
- Perform Edge “Load unpacked” smoke test: popup opens, content injects, background messaging works without console errors.

### Acceptance Criteria

- Build produces `dist/` that loads in Edge via “Load unpacked”.
- No new features; existing flows operate as before, no console errors.
- Lint and existing unit tests pass; no new tests required for this track.

### Testing Strategy Adjustment

- Pause adding new tests temporarily; keep existing tests and lint green.
- Use manual smoke testing in Edge to validate runtime behavior.

---

## M6: Content Scripts

**Duration:** 5 days  
**Dependencies:** M3, M4  
**Goal:** Implement form detection and filling functionality

### Checkpoints

#### CP-M6-1: Form Detector (TDD)

**Test First:**

```typescript
describe('FormDetector', () => {
  it('should detect forms on page', () => {
    document.body.innerHTML = '<form><input name="email" /></form>';
    const forms = detector.detectForms();
    expect(forms).toHaveLength(1);
  });

  it('should extract form fields', () => {
    document.body.innerHTML = `
      <form>
        <input name="name" type="text" />
        <input name="email" type="email" />
        <select name="country"><option>US</option></select>
      </form>
    `;
    const fields = detector.extractFields(forms[0]);
    expect(fields).toHaveLength(3);
    expect(fields[0]).toMatchObject({ name: 'name', type: 'text' });
  });
});
```

**Implementation:**

- [ ] Write test cases
- [ ] Implement form detection
- [ ] Implement field extraction
- [ ] Handle dynamic forms

**Deliverable:** `src/content/formDetector.ts`, tests (≥75% coverage)

#### CP-M6-2: Form Filler (TDD)

**Test First:**

```typescript
describe('FormFiller', () => {
  it('should fill form with data', async () => {
    document.body.innerHTML = `
      <form>
        <input name="name" type="text" />
        <input name="email" type="email" />
      </form>
    `;

    const data = { name: 'John Doe', email: 'john@example.com' };
    await filler.fillForm(form, data);

    expect(document.querySelector('[name="name"]').value).toBe('John Doe');
    expect(document.querySelector('[name="email"]').value).toBe('john@example.com');
  });

  it('should handle select elements', async () => {
    document.body.innerHTML = `
      <form>
        <select name="country">
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>
      </form>
    `;

    await filler.fillForm(form, { country: 'uk' });
    expect(document.querySelector('[name="country"]').value).toBe('uk');
  });
});
```

**Implementation:**

- [ ] Write test cases
- [ ] Implement form filling logic
- [ ] Handle different input types
- [ ] Add validation

**Deliverable:** `src/content/formFiller.ts`, tests (≥75% coverage)

#### CP-M6-3: Data Extraction Integration

**Implementation:**

- [ ] Integrate with HTML processor
- [ ] Extract page data for AI context
- [ ] Handle large pages efficiently

**Deliverable:** `src/content/dataExtractor.ts`, tests

#### CP-M6-4: Content Script Main

**Implementation:**

```typescript
// src/content/index.ts
import { FormDetector } from './formDetector';
import { FormFiller } from './formFiller';
import { DataExtractor } from './dataExtractor';

class ContentScript {
  private detector = new FormDetector();
  private filler = new FormFiller();
  private extractor = new DataExtractor();

  async init() {
    // Detect forms
    const forms = this.detector.detectForms();

    // Listen for fill commands
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'FILL_FORM') {
        this.filler.fillForm(forms[0], request.data);
        sendResponse({ success: true });
      }
    });
  }
}

new ContentScript().init();
```

**Tasks:**

- [ ] Implement content script initialization
- [ ] Add message listeners
- [ ] Wire up all components

**Deliverable:** `src/content/index.ts`, tests

#### CP-M6-5: E2E Tests

- [ ] Test form detection on real pages
- [ ] Test form filling workflow
- [ ] Test edge cases (dynamic forms, iframes)

**Deliverable:** E2E tests with Playwright

### Acceptance Criteria

- [x] Forms are detected correctly
- [x] Forms are filled accurately
- [x] Handles common edge cases
- [x] Test coverage ≥75%

### Commit Template

```bash
git commit -m "feat(content): implement form detection and filling

- Add FormDetector with dynamic form support
- Add FormFiller with multi-type input handling
- Add DataExtractor for page context
- Add content script main controller
- Add E2E tests with Playwright (78% coverage)

MILESTONE: M6 - Content Scripts
CHECKPOINT: CP-M6-5"
```

---

## M7: Background Script

**Duration:** 3 days  
**Dependencies:** M3  
**Goal:** Implement background script for API proxy and messaging

### Checkpoints

#### CP-M7-1: API Proxy (from M3)

**Already implemented in M3-CP5, enhance here:**

- [ ] Add request queuing
- [ ] Add rate limiting
- [ ] Add request caching (if applicable)

**Deliverable:** Enhanced `src/background/apiProxy.ts`

#### CP-M7-2: Message Router

**Implementation:**

```typescript
// src/background/messageRouter.ts
export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  register(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }

  async handle(request: any, sender: chrome.runtime.MessageSender) {
    const handler = this.handlers.get(request.type);
    if (!handler) {
      throw new Error(`No handler for message type: ${request.type}`);
    }
    return await handler(request, sender);
  }
}
```

**Tasks:**

- [ ] Implement message routing
- [ ] Add error handling
- [ ] Write tests

**Deliverable:** `src/background/messageRouter.ts`, tests

#### CP-M7-3: Background Main

**Implementation:**

```typescript
// src/background/index.ts
import { MessageRouter } from './messageRouter';
import { apiCallHandler } from './handlers/apiCallHandler';
import { configHandler } from './handlers/configHandler';

const router = new MessageRouter();
router.register('API_CALL', apiCallHandler);
router.register('GET_CONFIG', configHandler);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  router
    .handle(request, sender)
    .then(response => sendResponse(response))
    .catch(error => sendResponse({ error: error.message }));
  return true;
});
```

**Tasks:**

- [ ] Implement background script initialization
- [ ] Register all message handlers
- [ ] Add lifecycle management

**Deliverable:** `src/background/index.ts`, tests

#### CP-M7-4: Integration Tests

- [ ] Test message routing
- [ ] Test API proxy functionality
- [ ] Test error scenarios

**Deliverable:** Integration tests

### Acceptance Criteria

- [x] API proxy handles all requests correctly
- [x] Message routing works reliably
- [x] Error handling is comprehensive
- [x] Test coverage ≥80%

### Commit Template

```bash
git commit -m "feat(background): implement background script with message routing

- Add API proxy with request queuing
- Add MessageRouter for extensible handling
- Add background script main controller
- Add comprehensive tests (82% coverage)

MILESTONE: M7 - Background Script
CHECKPOINT: CP-M7-4"
```

---

## M8: Integration Testing

**Duration:** 4 days  
**Dependencies:** M5, M6, M7  
**Goal:** Comprehensive end-to-end and integration testing

### Checkpoints

#### CP-M8-1: E2E Test Setup

**Tasks:**

- [ ] Configure Playwright for extension testing
- [ ] Create test fixtures
- [ ] Setup test data

**Deliverable:** `tests/e2e/setup.ts`, Playwright config

#### CP-M8-2: Configuration Workflow Tests

**Tests:**

```typescript
test('should configure Azure OpenAI', async ({ page }) => {
  await page.goto('chrome-extension://[id]/popup.html');

  await page.fill('[name="provider"]', 'azure');
  await page.fill('[name="name"]', 'My Azure');
  await page.fill('[name="endpoint"]', 'https://test.openai.azure.com');
  await page.fill('[name="apiKey"]', 'sk-test-key');
  await page.fill('[name="model"]', 'gpt-4');

  await page.click('button[type="submit"]');

  await expect(page.locator('.success-message')).toBeVisible();
});
```

**Tasks:**

- [ ] Test adding configurations
- [ ] Test editing configurations
- [ ] Test deleting configurations
- [ ] Test connection validation

**Deliverable:** Configuration E2E tests

#### CP-M8-3: Form Filling Workflow Tests

**Tests:**

```typescript
test('should detect and fill form', async ({ page, context }) => {
  // Load extension
  await context.addInitScript({ path: 'dist/content.js' });

  // Navigate to test page
  await page.goto('http://localhost:3000/test-form.html');

  // Trigger form filling
  await page.click('#smart-fill-button');

  // Wait for AI response
  await page.waitForSelector('.filling-complete');

  // Verify form is filled
  await expect(page.locator('[name="name"]')).toHaveValue('John Doe');
  await expect(page.locator('[name="email"]')).toHaveValue('john@example.com');
});
```

**Tasks:**

- [ ] Test form detection
- [ ] Test form filling
- [ ] Test AI integration
- [ ] Test error handling

**Deliverable:** Form filling E2E tests

#### CP-M8-4: Performance Tests

**Tests:**

- [ ] Test large form handling
- [ ] Test concurrent requests
- [ ] Test memory usage
- [ ] Test load times

**Deliverable:** Performance test suite

#### CP-M8-5: Cross-Browser Tests

**Tasks:**

- [ ] Test on Chrome
- [ ] Test on Edge
- [ ] Document compatibility

**Deliverable:** Cross-browser test results

### Acceptance Criteria

- [x] All E2E tests pass
- [x] Performance meets targets
- [x] Works on Chrome and Edge
- [x] No memory leaks

### Commit Template

```bash
git commit -m "test(e2e): add comprehensive integration tests

- Add Playwright E2E test suite
- Add configuration workflow tests
- Add form filling workflow tests
- Add performance tests
- Add cross-browser compatibility tests

MILESTONE: M8 - Integration Testing
CHECKPOINT: CP-M8-5"
```

---

## M9: Optimization & Release

**Duration:** 4 days  
**Dependencies:** M8  
**Goal:** Optimize, document, and prepare for release

### Checkpoints

#### CP-M9-1: Performance Optimization

**Tasks:**

- [ ] Analyze bundle size
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Minification

**Deliverable:** Optimized build

#### CP-M9-2: Documentation

**Tasks:**

- [ ] Update README.md
- [ ] Add API documentation
- [ ] Add user guide
- [ ] Add developer guide

**Deliverable:** Complete documentation

#### CP-M9-3: Security Audit

**Tasks:**

- [ ] Review data handling
- [ ] Review permissions
- [ ] Test XSS prevention
- [ ] Review API key storage

**Deliverable:** Security audit report

#### CP-M9-4: Release Preparation

**Tasks:**

- [ ] Create release notes
- [ ] Package extension
- [ ] Test installation
- [ ] Prepare Chrome Web Store listing

**Deliverable:** Release package

### Acceptance Criteria

- [x] Bundle size optimized
- [x] Documentation complete
- [x] Security audit passed
- [x] Extension packaged and tested

### Commit Template

```bash
git commit -m "chore(release): prepare v1.0.0 release

- Optimize bundle size (reduced by 40%)
- Add complete documentation
- Complete security audit
- Package extension for distribution

MILESTONE: M9 - Optimization & Release
CHECKPOINT: CP-M9-4"
```

---

## Progress Tracking

Completed progress tracking details removed to keep milestones concise.

---

### Daily Update Template

```markdown
## Date: YYYY-MM-DD

### Completed Today

- [ ] CP-Mx-n: Description
- [ ] CP-Mx-n: Description

### In Progress

- [ ] CP-Mx-n: Description (X% complete)

### Blockers

- Issue description and impact

### Coverage Stats

- Module: X%
- Overall: X%

### Next Steps

- [ ] Task 1
- [ ] Task 2
```

### Weekly Summary Template

```markdown
## Week N (YYYY-MM-DD to YYYY-MM-DD)

### Milestones Completed

- Mx: Milestone Name ✅

### Checkpoints Completed

- CP-Mx-1: Description ✅
- CP-Mx-2: Description ✅

### Test Coverage

- Week Start: X%
- Week End: X%
- Improvement: +X%

### Key Achievements

1. Achievement 1
2. Achievement 2

### Challenges & Solutions

- Challenge: Description
  - Solution: Description

### Next Week Goals

1. Complete Mx milestone
2. Achieve X% test coverage
```

---

**Last Updated:** November 8, 2025  
**Document Version:** 2.0.0

---

## Date: 2025-11-08

Completed daily log details removed to keep milestones concise.
