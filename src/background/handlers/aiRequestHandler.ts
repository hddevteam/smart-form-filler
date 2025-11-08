import type { AIRequestMessage } from '@/types/messages';
import { MessageRouter } from '@/background/messageRouter';
import { AIService } from '@/background/services/ai/aiService';

/**
 * Register AI_REQUEST handler which delegates to AIService.
 */
export function registerAIRequestHandler(router: MessageRouter, aiService: AIService) {
  router.register('AI_REQUEST', async request => {
    const msg = request as AIRequestMessage;
    return aiService.makeRequest(msg.options);
  });
}
