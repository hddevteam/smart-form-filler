/**
 * AI service core types for frontend MV3 extension.
 * All code and comments must be in English.
 */

export type Role = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface Choice {
  message: ChatMessage;
}

export interface ChatResponse {
  id?: string;
  model: string;
  choices: Choice[];
  created?: number;
}

export interface RequestParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  // Reasoning and provider-specific params
  reasoning?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Adapter {
  getHeaders(apiKey?: string): Record<string, string>;
  processRequestBody(messages: ChatMessage[], params: RequestParams, model?: string): unknown;
  responseToChatResponse(raw: unknown): ChatResponse;
}

export class AIRequestError extends Error {
  status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AIRequestError';
    this.status = status ?? undefined;
  }
}
