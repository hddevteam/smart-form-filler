# AI Service Migration Guide

> **Quick Reference**: Migrate `backend/services/gptService/` to `src/background/services/ai/` (TypeScript)

## File Mapping

| Backend                            | Frontend                      | Key Functions                                                             |
| ---------------------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| `apiService.js`                    | `aiService.ts`                | `makeRequest()`, `processMessagesForModel()`, `processReasoningSummary()` |
| `config.js`                        | `modelConfig.ts`              | `MODEL_FEATURES`, `getApiConfig()`, `supportsFeature()`                   |
| `modelAdapters/BaseAdapter.js`     | `adapters/BaseAdapter.ts`     | `getHeaders()`, `processRequestBody()`                                    |
| `modelAdapters/AdapterFactory.js`  | `adapters/AdapterFactory.ts`  | `getAdapter(model, config)`                                               |
| `modelAdapters/OllamaAdapter.js`   | `adapters/OllamaAdapter.ts`   | Ollama format handling                                                    |
| `modelAdapters/OSeriesAdapter.js`  | `adapters/OSeriesAdapter.ts`  | `max_completion_tokens`                                                   |
| `modelAdapters/DeepSeekAdapter.js` | `adapters/DeepSeekAdapter.ts` | DeepSeek params                                                           |

## Key Changes

| What         | Backend (Node.js)  | Frontend (Browser)             |
| ------------ | ------------------ | ------------------------------ |
| **HTTP**     | `axios`            | `fetch` API                    |
| **Config**   | `process.env`      | `chrome.storage.local`         |
| **Messages** | Express middleware | `chrome.runtime.onMessage`     |
| **CORS**     | No restrictions    | `host_permissions` in manifest |

## Migration Steps

### 1. Adapters (Base → Factory → Providers)

```typescript
// BaseAdapter.ts - Abstract class
export abstract class BaseAdapter {
  getHeaders(apiKey: string | null): Record<string, string>;
  processRequestBody(
    messages: ChatMessage[],
    params: Record<string, unknown>
  ): Record<string, unknown>;
  processResponse?(data: unknown): ChatResponse; // Optional
}

// AdapterFactory.ts - Factory pattern
export class AdapterFactory {
  static getAdapter(model: string, config: ModelConfig): BaseAdapter {
    if (model.startsWith('ollama:')) return new OllamaAdapter(config);
    if (['o1', 'o3', 'o4-mini'].includes(model)) return new OSeriesAdapter(config);
    if (model === 'deepseek-r1') return new DeepSeekAdapter(config);
    return new BaseAdapter(config);
  }
}
```

**Migrate from backend**:

- Copy adapter logic from `backend/services/gptService/modelAdapters/`
- Convert to TypeScript with proper types
- Keep same request/response processing logic

### 2. ModelConfig (modelConfig.ts)

```typescript
export class ModelConfig {
  private static readonly MODEL_FEATURES: Record<string, ModelFeatures> = {
    'gpt-4o': { supportsFunctionCalls: true, supportsSystemMessages: true, ... },
    'o3-mini': { supportsDeveloperMessages: true, requiresMaxCompletionTokens: true, ... },
    // ... copy all from backend config.js
  };

  async getApiConfig(model: string): Promise<ApiConfig> {
    // Read from chrome.storage.local instead of process.env
    const configs = await chrome.storage.local.get('apiConfigs');
    return configs[model];
  }

  supportsFeature(model: string, feature: keyof ModelFeatures): boolean {
    // Same logic as backend
    return ModelConfig.MODEL_FEATURES[model]?.[feature] || false;
  }
}
```

**Migrate from backend**:

- Copy `MODEL_FEATURES` object from `backend/services/gptService/config.js`
- Replace `process.env` with `chrome.storage.local` reads
- Keep `supportsFeature()` logic identical

### 3. AIService (aiService.ts)

```typescript
export class AIService {
  async makeRequest(options: {
    apiKey: string;
    apiUrl: string;
    model: string;
    messages: ChatMessage[];
    params: Record<string, unknown>;
    includeFunctionCalls?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
    // ... other options
  }): Promise<ChatResponse> {
    // 1. Get adapter
    const adapter = AdapterFactory.getAdapter(options.model, this.config);

    // 2. Process messages (system → developer for o-series)
    const processedMessages = this.processMessagesForModel(options.messages, options.model);

    // 3. Add reasoning params if supported
    if (
      options.reasoningEffort &&
      this.config.supportsFeature(options.model, 'supportsReasoningEffort')
    ) {
      options.params.reasoning_effort = options.reasoningEffort;
    }

    // 4. Build request with adapter
    const requestData = adapter.processRequestBody(processedMessages, options.params);

    // 5. Add tools if function calling enabled
    if (
      options.includeFunctionCalls &&
      this.config.supportsFeature(options.model, 'supportsFunctionCalls')
    ) {
      requestData.tools = this.getDefaultTools();
    }

    // 6. Make HTTP request (fetch instead of axios)
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: adapter.getHeaders(options.apiKey),
      body: JSON.stringify(requestData),
    });

    let responseData = await response.json();

    // 7. Process response with adapter (Ollama)
    if (options.isOllama && adapter.processResponse) {
      responseData = adapter.processResponse(responseData);
    }

    // 8. Process reasoning summary
    return this.processReasoningSummary(responseData);
  }

  private processMessagesForModel(messages: ChatMessage[], model: string): ChatMessage[] {
    // Copy logic from backend apiService.js
    // Convert system → developer for o-series models
  }

  private processReasoningSummary(response: ChatResponse): ChatResponse {
    // Copy logic from backend apiService.js
    // Convert reasoning summary to <think> blocks
  }
}
```

**Migrate from backend**:

- Copy `makeRequest()` flow from `backend/services/gptService/apiService.js`
- Replace `axios` with `fetch` API
- Keep all processing logic (messages, reasoning) identical
- Preserve error handling patterns

### 4. Background Integration

```typescript
// src/background/index.ts
import { AIService } from './services/ai/aiService';
import { ModelConfig } from './services/ai/modelConfig';

const modelConfig = new ModelConfig(storageManager);
const aiService = new AIService(modelConfig);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AI_REQUEST') {
    aiService
      .makeRequest(request.options)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open
  }
});
```

### 5. Manifest Permissions

```json
{
  "host_permissions": ["https://*.openai.azure.com/*", "http://localhost:11434/*"]
}
```

## Testing Strategy

```typescript
// tests/unit/background/services/ai/aiService.test.ts
describe('AIService', () => {
  it('should process messages for o-series models', () => {
    // Test system → developer conversion
  });

  it('should make API request with fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Response' } }] })
    });

    const result = await aiService.makeRequest({...});
    expect(result.choices[0].message.content).toBe('Response');
  });

  it('should handle reasoning summary', () => {
    // Test <think> block conversion
  });
});
```

## Migration Checklist

- [ ] Create `src/background/services/ai/` directory structure
- [ ] Migrate `BaseAdapter` → `BaseAdapter.ts` with TypeScript types
- [ ] Migrate `AdapterFactory` → `AdapterFactory.ts`
- [ ] Migrate provider adapters (Ollama, OSeries, DeepSeek)
- [ ] Migrate `config.js` → `modelConfig.ts` (replace process.env with chrome.storage)
- [ ] Migrate `apiService.js` → `aiService.ts` (replace axios with fetch)
- [ ] Write unit tests (≥90% coverage)
- [ ] Update `manifest.json` with `host_permissions`
- [ ] Integrate into background script message handlers
- [ ] Test end-to-end from popup → background → AI provider

## Reference Files

- Backend: `backend/services/gptService/apiService.js` (main logic)
- Backend: `backend/services/gptService/config.js` (model features)
- Backend: `backend/services/gptService/modelAdapters/` (adapter patterns)

---

**Migration Timeline**: Part of M3 - AI Service Layer milestone (7 days)

**Last Updated**: 2025-11-08
