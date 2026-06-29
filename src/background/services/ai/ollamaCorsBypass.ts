import { Logger } from '@/utils/logger';

export const OLLAMA_CORS_RULE_ID = 1001;

const logger = Logger.forScope('OllamaCorsBypass');
const OLLAMA_REGEX = '^https?:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d{2,5})?\\/api\\/.*';

let registered = false;

export async function ensureOllamaCorsBypass(): Promise<void> {
  if (registered) {
    return;
  }

  registered = true;

  const dnr = chrome?.declarativeNetRequest;
  if (!dnr?.updateDynamicRules) {
    logger.debug('DeclarativeNetRequest API not available; skipping Ollama CORS bypass');
    registered = false;
    return;
  }

  const rule: chrome.declarativeNetRequest.Rule = {
    id: OLLAMA_CORS_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'origin', operation: 'remove' },
        { header: 'referer', operation: 'remove' },
      ],
      responseHeaders: [
        { header: 'access-control-allow-origin', operation: 'set', value: '*' },
        { header: 'access-control-allow-headers', operation: 'set', value: '*' },
        {
          header: 'access-control-allow-methods',
          operation: 'set',
          value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
        },
      ],
    },
    condition: {
      regexFilter: OLLAMA_REGEX,
    },
  };

  try {
    await dnr.updateDynamicRules({
      removeRuleIds: [OLLAMA_CORS_RULE_ID],
      addRules: [rule],
    });
    logger.info('Registered Ollama CORS bypass rule');
  } catch (error) {
    registered = false;
    logger.warn(`Failed to register Ollama CORS bypass rule: ${(error as Error).message}`);
  }
}
