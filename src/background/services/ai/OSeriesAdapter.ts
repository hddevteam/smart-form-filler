// OSeries/Azure OpenAI adapter: formats requests for Azure OpenAI chat completions.
import type { ChatMessage, RequestParams, ChatResponse, Role } from '@/types/ai';
import { BaseAdapter } from './BaseAdapter';

export class OSeriesAdapter extends BaseAdapter {
  getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      // Support both Azure API key and Bearer token authentication
      // If apiKey starts with 'Bearer ', use Authorization header
      // Otherwise use api-key header (traditional Azure OpenAI)
      if (apiKey.startsWith('Bearer ') || apiKey.startsWith('bearer ')) {
        headers['Authorization'] = apiKey;
      } else {
        headers['api-key'] = apiKey;
      }
    }

    return headers;
  }

  processRequestBody(messages: ChatMessage[], params: RequestParams, model?: string): unknown {
    // Azure OpenAI uses { messages, temperature, top_p, max_tokens, ... }
    // Include model for unified endpoints (will be ignored by deployment-specific endpoints)
    const { temperature, top_p, max_tokens, ...rest } = params;
    const body: Record<string, unknown> = {
      messages,
      temperature,
      top_p,
      max_tokens,
      ...rest,
    };
    // Add model if provided (supports unified endpoints like /openai/responses)
    if (model) {
      body.model = model;
    }
    return body;
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
