// Background script entry point
import { Logger } from '@/utils/logger';
import { MessageRouter } from './messageRouter';
import { AIService } from './services/ai/aiService';
import { registerAIRequestHandler } from './handlers/aiRequestHandler';

const logger = Logger.forScope('Background');
const router = new MessageRouter();
const aiService = new AIService();

// Example handler registrations (expand as features land)
router.register('PING', async () => Promise.resolve({ ok: true }));
registerAIRequestHandler(router, aiService);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  router
    .handle(request, sender)
    .then(resp => sendResponse(resp))
    .catch((err: Error) => {
      logger.error(`Message handling failed: ${err.message}`);
      sendResponse({ error: err.message });
    });
  return true; // keep the channel open for async response
});

logger.info('Smart Form Filler - Background script initialized');

export {};
