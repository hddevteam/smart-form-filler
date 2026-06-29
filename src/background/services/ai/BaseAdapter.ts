// BaseAdapter defines common helpers and a minimal interface for provider adapters.
// English only per repo rules.
import type { Adapter, ChatMessage, RequestParams, ChatResponse } from '@/types/ai';

export abstract class BaseAdapter implements Adapter {
  abstract getHeaders(apiKey?: string): Record<string, string>;
  abstract processRequestBody(
    messages: ChatMessage[],
    params: RequestParams,
    model?: string
  ): unknown;
  abstract responseToChatResponse(raw: unknown): ChatResponse;

  protected redact(key?: string): string {
    if (!key) return '';
    return key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : '***';
  }
}
