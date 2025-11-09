import type { AIRequestMessage } from '@/types/messages';
import { MessageRouter } from '@/background/messageRouter';
import { AIService } from '@/background/services/ai/aiService';

/**
 * Register AI_REQUEST handler which delegates to AIService.
 */
export function registerAIRequestHandler(router: MessageRouter, aiService: AIService) {
  router.register('AI_REQUEST', async request => {
    const msg = request as AIRequestMessage;
    const logs: string[] = [];
    const originalOnLog = msg.options?.onLog;
    const optionsWithLogs: typeof msg.options = {
      ...msg.options,
      onLog: (entry: string) => {
        logs.push(entry);
        originalOnLog?.(entry);
      },
    };

    try {
      const data = await aiService.makeRequest(optionsWithLogs);
      return { success: true, data, logs };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message, logs };
    }
  });
}
