// AIService handles chat requests in the background script using fetch.
import { AdapterFactory } from './AdapterFactory';
import type { ChatMessage, ChatResponse, RequestParams } from '@/types/ai';
import { AIRequestError } from '@/types/ai';

export interface MakeRequestOptions {
  apiKey?: string;
  apiUrl: string;
  model: string;
  messages: ChatMessage[];
  params?: RequestParams;
}

export class AIService {
  async makeRequest(options: MakeRequestOptions): Promise<ChatResponse> {
    const { apiKey, apiUrl, model, messages, params = {} } = options;
    const adapter = AdapterFactory.getAdapter(model);
    const requestData = adapter.processRequestBody(messages, params);

    let attempt = 0;
    let lastError: unknown;
    while (attempt < 3) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: adapter.getHeaders(apiKey),
          body: JSON.stringify(requestData),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new AIRequestError(text || `HTTP ${res.status}`, res.status);
        }
        const raw: unknown = await res.json();
        // raw is unknown; adapter handles normalization
        return adapter.responseToChatResponse(raw);
      } catch (err) {
        lastError = err;
        attempt += 1;
        // simple exponential backoff: 200ms, 400ms
        if (attempt < 3) await new Promise(r => setTimeout(r, 200 * attempt));
      }
    }
    const e = lastError as Error | undefined;
    throw new AIRequestError(e?.message || 'Request failed after retries');
  }
}
