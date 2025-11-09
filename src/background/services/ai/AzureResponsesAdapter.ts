// Azure Responses API adapter: formats requests for new Azure /openai/responses endpoint
import type { ChatMessage, RequestParams, ChatResponse, Role } from '@/types/ai';
import { BaseAdapter } from './BaseAdapter';

export class AzureResponsesAdapter extends BaseAdapter {
  getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      // Support both Azure API key and Bearer token authentication
      if (apiKey.startsWith('Bearer ') || apiKey.startsWith('bearer ')) {
        headers['Authorization'] = apiKey;
      } else {
        headers['api-key'] = apiKey;
      }
    }

    return headers;
  }

  processRequestBody(messages: ChatMessage[], params: RequestParams, model?: string): unknown {
    // Azure Responses API uses 'input' instead of 'messages'
    // See: https://platform.openai.com/docs/api-reference/responses/create
    const { temperature, top_p, max_tokens, ...rest } = params;
    const body: Record<string, unknown> = {
      input: messages, // Key difference: 'input' instead of 'messages'
      temperature,
      top_p,
      max_completion_tokens: max_tokens, // Also renamed from max_tokens
      ...rest,
    };

    // Model is required for Responses API
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
      output?: Array<
        | { role?: string; content?: string; type?: string }
        | {
            type?: string;
            role?: string;
            status?: string;
            content?: Array<{ type?: string; text?: string }>;
          }
      >;
    };

    const normalizeRole = (role?: string): Role => {
      return role === 'user' || role === 'system' || role === 'assistant'
        ? (role as Role)
        : 'assistant';
    };

    // Try 'choices' first (standard format), then 'output' (possible Responses API format)
    let choices: Array<{ message: ChatMessage }> = [];

    if (r?.choices && Array.isArray(r.choices)) {
      choices = (r.choices ?? []).map(c => ({
        message: {
          role: normalizeRole(c.message.role),
          content: c.message.content,
        },
      }));
    } else if (r?.output && Array.isArray(r.output)) {
      const messages = r.output
        .filter(item => {
          if (!item) return false;
          const asRecord = item as Record<string, unknown>;
          if (asRecord.type === 'message') return true;
          // Some responses may omit type but include text directly
          return 'content' in asRecord && typeof asRecord.content === 'string';
        })
        .map(item => {
          const entry = item as Record<string, unknown>;
          const role = normalizeRole(entry.role as string | undefined);

          if (Array.isArray(entry.content)) {
            const text = (entry.content as Array<unknown>)
              .map(chunk => {
                if (chunk && typeof chunk === 'object' && 'text' in chunk) {
                  const { text } = chunk as { text?: string };
                  return typeof text === 'string' ? text : '';
                }
                return '';
              })
              .filter(Boolean)
              .join(' ');
            return { role, content: text };
          }

          if (typeof entry.content === 'string') {
            return { role, content: entry.content };
          }

          return { role, content: '' };
        })
        .filter(msg => msg.content !== undefined);

      choices = messages.map(msg => ({ message: msg }));
    }

    const base: ChatResponse = {
      model: r?.model ?? 'azure-responses',
      choices,
    };
    return r?.id ? { ...base, id: r.id } : base;
  }
}
