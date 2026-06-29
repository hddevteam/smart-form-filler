// AIService handles chat requests in the background script using fetch.
import { AdapterFactory } from './AdapterFactory';
import { ensureOllamaCorsBypass, OLLAMA_CORS_RULE_ID } from './ollamaCorsBypass';
import type { ChatMessage, ChatResponse, RequestParams } from '@/types/ai';
import { AIRequestError } from '@/types/ai';

export interface MakeRequestOptions {
  apiKey?: string;
  apiUrl: string;
  model: string;
  messages: ChatMessage[];
  params?: RequestParams;
  onLog?: (message: string) => void;
}

export class AIService {
  constructor(private readonly ensureCorsBypass: () => Promise<void> = ensureOllamaCorsBypass) {}

  async makeRequest(options: MakeRequestOptions): Promise<ChatResponse> {
    const log = (msg: string) => {
      options.onLog?.(msg);
    };
    const { apiKey, apiUrl, model, messages, params = {} } = options;
    const adapter = AdapterFactory.getAdapter(model, apiUrl);
    const requestData = adapter.processRequestBody(messages, params, model);

    if (this.requiresOllamaCorsBypass(apiUrl, model)) {
      log('[AIService] Ensuring Ollama CORS bypass rules');
      await this.ensureCorsBypass();
      await this.logBypassState(log);
      log('[AIService] Ollama CORS bypass ready');
    }

    log(`[AIService] Adapter: ${adapter.constructor.name}`);
    log(`[AIService] API URL: ${apiUrl}`);
    log(`[AIService] Model: ${model}`);
    log(`[AIService] Headers: ${JSON.stringify(adapter.getHeaders(apiKey), null, 2)}`);
    log(`[AIService] Request body: ${JSON.stringify(requestData, null, 2)}`);

    let attempt = 0;
    let lastError: unknown;
    while (attempt < 3) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: adapter.getHeaders(apiKey),
          body: JSON.stringify(requestData),
        });
        log(`[AIService] Response status: ${res.status}`);
        if (!res.ok) {
          const text = await res.text();
          log(`[AIService] Error response: ${text}`);
          throw new AIRequestError(text || `HTTP ${res.status}`, res.status);
        }
        const raw: unknown = await res.json();
        log(`[AIService] Raw response: ${JSON.stringify(raw, null, 2)}`);
        // raw is unknown; adapter handles normalization
        return adapter.responseToChatResponse(raw);
      } catch (err) {
        log(`[AIService] Attempt ${attempt + 1} failed: ${(err as Error).message}`);
        lastError = err;
        attempt += 1;
        // simple exponential backoff: 200ms, 400ms
        if (attempt < 3) await new Promise(r => setTimeout(r, 200 * attempt));
      }
    }
    const e = lastError as Error | undefined;
    throw new AIRequestError(e?.message || 'Request failed after retries');
  }

  private requiresOllamaCorsBypass(apiUrl: string, model: string): boolean {
    if (model.startsWith('ollama:') || model.startsWith('local:')) {
      return true;
    }
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(apiUrl);
  }

  private async logBypassState(log: (message: string) => void): Promise<void> {
    const dnr = (globalThis.chrome as typeof chrome | undefined)?.declarativeNetRequest;
    if (!dnr?.getDynamicRules) return;
    try {
      const rules = await dnr.getDynamicRules({ ruleIds: [OLLAMA_CORS_RULE_ID] });
      const active = rules.some(rule => rule.id === OLLAMA_CORS_RULE_ID);
      log(`[AIService] Ollama bypass rule active: ${active}`);
    } catch (error) {
      log(`[AIService] Failed to inspect bypass rule: ${(error as Error).message}`);
    }
  }
}
