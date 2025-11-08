import type { MakeRequestOptions } from '@/background/services/ai/aiService';

/**
 * Background message types routed by MessageRouter.
 */
export interface AIRequestMessage {
  type: 'AI_REQUEST';
  options: MakeRequestOptions;
}

export interface PingMessage {
  type: 'PING';
}

export type BackgroundMessage = AIRequestMessage | PingMessage;
