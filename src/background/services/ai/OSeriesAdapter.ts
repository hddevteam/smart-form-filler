// OSeries/Azure OpenAI adapter: formats requests for Azure OpenAI chat completions.
import type { ChatMessage, RequestParams, ChatResponse, Role } from '@/types/ai';
import { BaseAdapter } from './BaseAdapter';

export class OSeriesAdapter extends BaseAdapter {
  getHeaders(apiKey?: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'api-key': apiKey ?? '',
    };
  }

  processRequestBody(messages: ChatMessage[], params: RequestParams): unknown {
    // Azure OpenAI uses { messages, temperature, top_p, max_tokens, ... }
    const { temperature, top_p, max_tokens, ...rest } = params;
    return {
      messages,
      temperature,
      top_p,
      max_tokens,
      ...rest,
    };
  }

  responseToChatResponse(raw: unknown): ChatResponse {
    const r = raw as {
      id?: string;
      model?: string;
      choices?: Array<{ message: { role?: string; content: string } }>;
    };

    const normalizeRole = (role?: string): Role => {
      return role === 'user' || role === 'system' || role === 'assistant'
        ? (role as Role)
        : 'assistant';
    };

    const choices = (r?.choices ?? []).map(c => ({
      message: {
        role: normalizeRole(c.message.role),
        content: c.message.content,
      },
    }));

    const base: ChatResponse = {
      model: r?.model ?? 'azure-openai',
      choices,
    };
    return r?.id ? { ...base, id: r.id } : base;
  }
}
