# Smart Form Filler - TypeScript Migration Plan

> **Project Goal:** Migrate existing JavaScript project to TypeScript with TDD (Test-Driven Development), creating a type-safe, pure frontend browser extension

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Architecture Design](#architecture-design)
- [Migration Strategy](#migration-strategy)
- [Milestone Planning](#milestone-planning)
- [Checkpoints & Acceptance Criteria](#checkpoints--acceptance-criteria)
- [Commit Standards](#commit-standards)
- [TDD Implementation Guide](#tdd-implementation-guide)

---

## 🎯 Project Overview

### Migration Goals

1. **Language Migration:** JavaScript → TypeScript
2. **Architecture Transformation:** Backend/Frontend Separation → Pure Frontend Browser Extension
3. **Development Methodology:** Traditional Development → TDD (Test-Driven Development)
4. **API Configuration:** Backend Management → User Frontend Configuration (Azure OpenAI + Ollama)

### Core Values

- ✅ **Type Safety:** Compile-time error detection, fewer runtime bugs
- ✅ **Code Quality:** TDD ensures high test coverage
- ✅ **Developer Experience:** IDE intelligence, safer refactoring
- ✅ **Maintainability:** Clear type definitions, documentation as code
- ✅ **User Experience:** No backend deployment needed, ready to use

---

## 🛠️ Technology Stack

### Core Technologies

| Domain              | Choice            | Version     | Rationale                                |
| ------------------- | ----------------- | ----------- | ---------------------------------------- |
| **Language**        | TypeScript        | 5.3+        | Strong type system, excellent tooling    |
| **Runtime**         | Browser Extension | Manifest V3 | Chrome/Edge extension standard           |
| **Build Tool**      | Vite              | 5.x         | Fast builds, native TS support           |
| **Package Manager** | pnpm              | 8.x         | Fast, space-efficient, monorepo-friendly |

### Testing Framework

| Test Type      | Framework   | Version | Purpose                       |
| -------------- | ----------- | ------- | ----------------------------- |
| **Unit Tests** | Vitest      | 1.x     | Fast, Vite native integration |
| **E2E Tests**  | Playwright  | 1.40+   | Browser extension testing     |
| **Coverage**   | c8/Istanbul | -       | Code coverage statistics      |
| **Mock**       | vitest/mock | -       | Dependency mocking            |

### Code Quality Tools

| Tool            | Purpose                  | Config File         |
| --------------- | ------------------------ | ------------------- |
| **ESLint**      | TypeScript code linting  | `.eslintrc.cjs`     |
| **Prettier**    | Code formatting          | `.prettierrc`       |
| **Husky**       | Git Hooks                | `.husky/`           |
| **lint-staged** | Pre-commit checks        | `package.json`      |
| **commitlint**  | Commit message standards | `.commitlintrc.cjs` |

### Development Tools

```json
{
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "playwright": "^1.40.0",
    "@types/chrome": "^0.0.253",
    "@types/node": "^20.10.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "prettier": "^3.1.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "@commitlint/cli": "^18.4.3",
    "@commitlint/config-conventional": "^18.4.3"
  }
}
```

---

## 🏗️ Architecture Design

### Project Structure

```
smart-form-filler/
├── .github/                          # GitHub configuration
│   ├── workflows/                    # CI/CD
│   │   ├── test.yml                 # Test pipeline
│   │   ├── build.yml                # Build pipeline
│   │   └── release.yml              # Release pipeline
│   ├── TS_MIGRATION_PLAN.md         # This document
│   ├── MILESTONES.md                # Milestone planning
│   └── TDD_GUIDE.md                 # TDD guide
├── src/                              # TypeScript source code
│   ├── background/                   # Background Script
│   │   ├── index.ts                 # Message router
│   │   ├── services/
│   │   │   └── ai/                  # AI services (migrated from backend/services/gptService)
│   │   │       ├── aiService.ts     # From backend apiService.js
│   │   │       ├── modelConfig.ts   # From backend config.js
│   │   │       └── adapters/        # From backend modelAdapters/
│   │   │           ├── AdapterFactory.ts
│   │   │           ├── BaseAdapter.ts
│   │   │           ├── OllamaAdapter.ts
│   │   │           ├── OSeriesAdapter.ts
│   │   │           └── DeepSeekAdapter.ts
│   │   └── __tests__/
│   ├── content/                      # Content Scripts
│   │   ├── index.ts
│   │   ├── formDetector.ts
│   │   ├── formFiller.ts
│   │   ├── dataExtractor.ts
│   │   └── __tests__/
│   ├── popup/                        # Popup UI
│   │   ├── index.ts
│   │   ├── components/              # UI components
│   │   └── __tests__/
│   ├── config/                       # Configuration management
│   │   ├── storageManager.ts        # chrome.storage.local wrapper
│   │   └── modelRegistry.ts
│   ├── services/                     # Core services
│   │   └── processing/              # Data processing (migrated from backend controllers)
│   │       ├── htmlProcessor.ts     # From backend dataExtractionController.js
│   │       ├── markdownConverter.ts # From backend dataExtractionController.js
│   │       └── __tests__/
│   ├── types/                        # TypeScript type definitions
│   │   ├── ai.ts                    # AI service types
│   │   ├── config.ts                # Configuration types
│   │   ├── models.ts                # Model types
│   │   ├── chrome.d.ts              # Chrome extension type extensions
│   │   └── global.d.ts              # Global types
│   └── utils/                        # Utility functions
│       ├── logger.ts
│       └── __tests__/
├── backend/                          # Reference implementation (DO NOT USE IN RUNTIME)
│   └── services/gptService/         # Reference for migration to src/background/services/ai/
│       ├── apiService.js            # Reference for aiService.ts
│       ├── config.js                # Reference for modelConfig.ts
│       └── modelAdapters/           # Reference for adapters/
├── tests/                            # Test files
│   ├── unit/                        # Unit tests
│   ├── integration/                 # Integration tests
│   └── e2e/                         # E2E tests
│       └── extension.spec.ts
├── public/                           # Static assets
│   ├── manifest.json
│   ├── popup.html
│   └── icons/
├── dist/                             # Build output (.gitignore)
├── coverage/                         # Test coverage reports (.gitignore)
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.node.json                # Node environment TS config
├── vite.config.ts                    # Vite configuration
├── vitest.config.ts                  # Vitest configuration
├── playwright.config.ts              # Playwright configuration
├── .eslintrc.cjs                     # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── .commitlintrc.cjs                 # Commitlint configuration
└── package.json
```

### Module Dependency Diagram

```
┌─────────────────────────────────────────┐
│           Browser Extension             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Popup UI │  │ Content  │  │Background││
│  │          │  │ Scripts  │  │ Script   ││
│  └────┬─────┘  └────┬─────┘  └────┬────┘│
│       │             │             │     │
│       └─────────────┼─────────────┘     │
│                     │                   │
│         ┌───────────▼────────────┐      │
│         │   Config Manager       │      │
│         │  - API Config          │      │
│         │  - Model Registry      │      │
│         │  - Storage Manager     │      │
│         └───────────┬────────────┘      │
│                     │                   │
│         ┌───────────▼────────────┐      │
│         │   AI Services          │      │
│         │  - Azure OpenAI        │      │
│         │  - Ollama              │      │
│         │  - Adapters            │      │
│         └───────────┬────────────┘      │
│                     │                   │
│         ┌───────────▼────────────┐      │
│         │   Processing Services  │      │
│         │  - HTML Processor      │      │
│         │  - Markdown Converter  │      │
│         │  - Data Extractor      │      │
│         └────────────────────────┘      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📈 Migration Strategy

### Approach: Greenfield + Incremental

Adopt **New TypeScript Project + TDD** method instead of directly converting existing code:

#### Why Not Direct Conversion?

| Method                  | Pros                               | Cons                             | Decision       |
| ----------------------- | ---------------------------------- | -------------------------------- | -------------- |
| File-by-file conversion | Gradual, low risk                  | Incomplete types, time-consuming | ❌ Not adopted |
| Greenfield rewrite      | Clean architecture, complete types | More work, possible feature gaps | ✅ **Adopted** |

#### Migration Principles

1. **Test First:** Write tests before implementation for each module (TDD)
2. **Type First:** Define type interfaces before logic implementation
3. **Module Independence:** Each module can be independently tested and migrated
4. **Feature Parity:** Ensure no missing functionality in new implementation
5. **Incremental Delivery:** Deliver usable versions by milestone

### Migration Workflow (Per Module)

```
1. Analyze existing features → Write specifications
2. Define TypeScript types → types/*.ts
3. Write test cases (Red) → __tests__/*.test.ts
4. Implement minimum features (Green) → *.ts
5. Refactor optimization (Refactor) → Optimize code
6. Integration tests → Verify cooperation with other modules
7. Documentation update → JSDoc + README
```

---

## 🎯 Milestone Planning

Detailed planning in [MILESTONES.md](./MILESTONES.md)

### Overview

| Milestone | Goal                     | Duration | Deliverables                                        |
| --------- | ------------------------ | -------- | --------------------------------------------------- |
| **M0**    | Project initialization   | 2 days   | Project scaffolding, config files                   |
| **M1**    | Core type system         | 3 days   | Complete type definitions, utilities                |
| **M2**    | Configuration management | 5 days   | API config, storage management                      |
| **M3**    | AI service layer         | 7 days   | Migrate backend/services/gptService to frontend TS  |
| **M4**    | Data processing layer    | 4 days   | HTML/Markdown processing (from backend controllers) |
| **M5**    | UI layer                 | 6 days   | Popup, configuration interface                      |
| **M6**    | Content Scripts          | 5 days   | Form detection, filling, data extraction            |
| **M7**    | Background Script        | 3 days   | Message routing (no API proxy - direct calls in M3) |
| **M8**    | Integration testing      | 4 days   | E2E tests, performance testing                      |
| **M9**    | Optimization & release   | 4 days   | Optimization, docs, packaging                       |

**Total Duration:** Approximately 43 days (6-7 weeks)

---

## ✅ Checkpoints & Acceptance Criteria

### Code Quality Checkpoints

Each commit must pass:

```bash
# 1. Type check
pnpm type-check

# 2. Linting
pnpm lint

# 3. Unit tests
pnpm test:unit

# 4. Test coverage (≥80%)
pnpm test:coverage
```

### Milestone Acceptance Criteria

#### M0: Project Initialization

**Acceptance Criteria:**

- [ ] TypeScript compiles without errors
- [ ] Vite build successful
- [ ] Vitest runs properly
- [ ] ESLint/Prettier configured correctly
- [ ] Git Hooks working

**Verification Commands:**

```bash
pnpm build
pnpm test
pnpm lint
git commit -m "test: verify hooks"
```

#### M1: Core Type System

**Acceptance Criteria:**

- [ ] All core types defined (`types/*.ts`)
- [ ] Types exported correctly, no circular dependencies
- [ ] Utility functions 100% test coverage
- [ ] Complete JSDoc documentation

**Test Points:**

```typescript
// types/api.ts should include
export interface AzureOpenAIConfig { ... }
export interface OllamaConfig { ... }
export interface ChatMessage { ... }
export interface ChatResponse { ... }

// Testing
import { describe, it, expect } from 'vitest';
import type { AzureOpenAIConfig } from '@/types/api';

describe('Type System', () => {
  it('should validate Azure config', () => {
    const config: AzureOpenAIConfig = { ... };
    expect(validateConfig(config)).toBe(true);
  });
});
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Test Workflow (`.github/workflows/test.yml`)

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

#### 2. Build Workflow (`.github/workflows/build.yml`)

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build extension
        run: pnpm build

      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: extension-build
          path: dist/
```

---

## 📝 Commit Standards

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type       | Description     | Example                                         |
| ---------- | --------------- | ----------------------------------------------- |
| `feat`     | New feature     | `feat(config): add Azure OpenAI config manager` |
| `fix`      | Bug fix         | `fix(ai): handle timeout error properly`        |
| `test`     | Add tests       | `test(storage): add encryption tests`           |
| `refactor` | Refactoring     | `refactor(adapter): simplify error handling`    |
| `docs`     | Documentation   | `docs(readme): update installation guide`       |
| `style`    | Code formatting | `style: format with prettier`                   |
| `perf`     | Performance     | `perf(html): optimize large document parsing`   |
| `build`    | Build system    | `build: update vite config`                     |
| `ci`       | CI config       | `ci: add test workflow`                         |
| `chore`    | Other           | `chore: update dependencies`                    |

### Commit Examples

```bash
# Feature development
git commit -m "feat(config): implement API config manager

- Add ApiConfigManager class
- Support Azure OpenAI and Ollama configs
- Implement config validation
- Add encryption for sensitive data

Closes #123"

# Test addition
git commit -m "test(config): add config manager tests

- Test config save/load
- Test encryption
- Test validation
- Test error handling

Coverage: 95%"
```

---

## 📊 Test Coverage Targets

| Module                       | Target Coverage | Priority |
| ---------------------------- | --------------- | -------- |
| **Type Definitions**         | N/A             | -        |
| **Utility Functions**        | 100%            | High     |
| **Configuration Management** | ≥ 90%           | High     |
| **AI Services**              | ≥ 85%           | High     |
| **Data Processing**          | ≥ 85%           | Medium   |
| **UI Components**            | ≥ 70%           | Medium   |
| **Content Scripts**          | ≥ 75%           | Medium   |
| **Background Script**        | ≥ 80%           | High     |
| **Overall**                  | ≥ 80%           | -        |

---

## 📚 Reference Resources

### TypeScript

- [TypeScript Official Docs](https://www.typescriptlang.org/docs/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### Testing

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [TDD Guide](https://testdriven.io/)

### Chrome Extensions

- [Chrome Extension Official Docs](https://developer.chrome.com/docs/extensions/)
- [@types/chrome](https://www.npmjs.com/package/@types/chrome)

### Code Quality

- [ESLint TypeScript](https://typescript-eslint.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Last Updated:** November 7, 2025  
**Document Version:** 2.0.0 (TypeScript Migration)
