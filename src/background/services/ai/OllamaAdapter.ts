// Ollama adapter formats requests/responses for local Ollama server.
import type { ChatMessage, RequestParams, ChatResponse, Role } from '@/types/ai';
import { BaseAdapter } from './BaseAdapter';

export class OllamaAdapter extends BaseAdapter {
  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  processRequestBody(messages: ChatMessage[], params: RequestParams): unknown {
    // Ollama expects { stream: false, messages, ...params }
    return {
      stream: false,
      messages,
      ...params,
    };
  }

  responseToChatResponse(raw: unknown): ChatResponse {
    const r = raw as { message?: { role?: string; content: string }; model?: string };
    const model = r?.model ?? 'ollama';
    const role: Role =
      r?.message?.role === 'user' ||
      r?.message?.role === 'system' ||
      r?.message?.role === 'assistant'
        ? (r.message?.role as Role)
        : 'assistant';
    const msg: ChatMessage = r?.message
      ? { role, content: r.message.content }
      : { role: 'assistant', content: '' };
    return { model, choices: [{ message: msg }] };
  }
}
