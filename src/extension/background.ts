// Background service worker for Edge/Chrome Extension (Manifest V3)
// Ported to TypeScript with minimal logic changes

import { Logger } from '@/utils/logger';
import { AIService } from '@/background/services/ai/aiService';
import { ensureOllamaCorsBypass } from '@/background/services/ai/ollamaCorsBypass';
import { getAvailableModelsAuto } from '@/extension/modelDiscovery';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';

const logger = Logger.forScope('Background');
const aiService = new AIService();

void ensureOllamaCorsBypass().catch(err => {
  logger.warn(`Failed to pre-register Ollama bypass rules: ${(err as Error).message}`);
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(tab => {
  if (!tab?.id) return;
  void chrome.sidePanel.open({ tabId: tab.id }).catch(err => {
    logger.error('Failed to open side panel', err);
  });
});

// Set up side panel for all tabs
chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed - side panel ready');

  // Set default settings
  void chrome.storage.sync.set({
    selectedModel: 'gpt-4',
    autoSummaryEnabled: false,
    summaryLength: 'medium',
  });
  // Warm up: ensure SW logs show activation
  logger.debug('[Background] onInstalled: warming up');
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension started - side panel ready');
  logger.debug('[Background] onStartup: ready');
});

// Message types
type BgMessage =
  | { action: 'extractPageContent' }
  | { action: 'checkAuth' }
  | { action: 'getAvailableModels' }
  | { action: 'refreshOllamaModels' }
  | { action: 'detectForms' }
  | { action: 'extractContentWithIframes' }
  | { action: 'fillForms'; mappings: unknown }
  | { action: 'AI_REQUEST'; options: MakeRequestOptions };

// Handle messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message: BgMessage, _sender, sendResponse) => {
  logger.debug('Background received message:', message);
  // Ensure asynchronous response is allowed
  let responded = false;

  switch (message.action) {
    case 'extractPageContent':
      void handlePageContentExtraction(sendResponse);
      break;
    case 'checkAuth':
      void handleAuthCheck(sendResponse);
      break;
    case 'getAvailableModels':
      logger.debug('[Background] getAvailableModels message received');
      void handleGetAvailableModels(resp => {
        if (!responded) {
          responded = true;
          sendResponse(resp);
        }
      });
      break;
    case 'refreshOllamaModels':
      logger.debug('[Background] refreshOllamaModels message received');
      void handleRefreshOllamaModels(resp => {
        if (!responded) {
          responded = true;
          sendResponse(resp);
        }
      });
      break;
    case 'detectForms':
      void forwardToActiveTab({ action: 'detectForms' }, sendResponse);
      break;
    case 'extractContentWithIframes':
      void forwardToActiveTab({ action: 'extractContentWithIframes' }, sendResponse);
      break;
    case 'fillForms':
      void forwardToActiveTab(
        { action: 'fillForms', mappings: (message as { mappings: unknown }).mappings },
        sendResponse
      );
      break;
    case 'AI_REQUEST': {
      const { options } = message as { options: MakeRequestOptions };
      logger.debug('[Background] AI_REQUEST received:', {
        apiUrl: options.apiUrl,
        model: options.model,
        messageCount: options.messages?.length,
      });
      // Collect logs to send back to frontend
      const logs: string[] = [];
      const wrappedOptions = {
        ...options,
        onLog: (msg: string) => {
          logs.push(msg);
          options.onLog?.(msg);
        },
      };
      aiService
        .makeRequest(wrappedOptions)
        .then(data => {
          logger.debug('[Background] AI_REQUEST success:', { model: data.model });
          sendResponse({ success: true, data, logs });
        })
        .catch(error => {
          logger.error('[Background] AI_REQUEST failed:', error);
          const errorMsg = (error as Error).message;
          logs.push(`[Background] Error: ${errorMsg}`);
          sendResponse({ success: false, error: errorMsg, logs });
        });
      break;
    }
    default:
      logger.warn('Unknown message action:', (message as { action: string })?.action);
  }

  return true; // Keep message channel open for async responses
});

async function handlePageContentExtraction(
  sendResponse: (response: { content?: unknown; error?: string }) => void
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      sendResponse({ error: 'No active tab found' });
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent,
    });

    if (results && results[0]) {
      sendResponse({ content: results[0].result });
    } else {
      sendResponse({ error: 'Failed to extract content' });
    }
  } catch (error) {
    logger.error('Content extraction error:', error);
    sendResponse({ error: (error as Error).message });
  }
}

function handleAuthCheck(
  sendResponse: (response: { isAuthenticated: boolean; mode?: string; error?: string }) => void
): void {
  try {
    sendResponse({ isAuthenticated: true, mode: 'development' });
  } catch (error) {
    logger.error('Auth check error:', error);
    sendResponse({ isAuthenticated: false, error: (error as Error).message });
  }
}

function handleGetAvailableModels(
  sendResponse: (response: {
    success: boolean;
    models?: Array<{ id: string; name?: string; description?: string; source?: string }>;
    error?: string;
  }) => void
): void {
  try {
    // Auto-discover local Ollama models (no need to save)
    void getAvailableModelsAuto()
      .then(models => sendResponse({ success: true, models }))
      .catch(error => {
        logger.warn('Auto model discovery failed:', (error as Error).message);
        sendResponse({ success: true, models: [] });
      });
  } catch (error) {
    logger.error('Get available models error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

function handleRefreshOllamaModels(
  sendResponse: (response: { success: boolean; error?: string }) => void
): void {
  try {
    // No persistent cache; refresh = re-discover is handled by getAvailableModels call chain on UI.
    sendResponse({ success: true });
  } catch (error) {
    logger.error('Refresh Ollama models error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

async function forwardToActiveTab(
  payload: { action: string; mappings?: unknown },
  sendResponse: (resp: unknown) => void
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      sendResponse({ success: false, error: 'No active tab found' });
      return;
    }

    const trySendMessage = async (): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id!, payload, (resp: unknown) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }
          resolve(resp);
        });
      });
    };

    try {
      const response = await trySendMessage();
      sendResponse(response);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const needsInjection = message.includes('Could not establish connection');

      if (!needsInjection) {
        logger.error('Failed to forward message to content script:', message);
        sendResponse({ success: false, error: message });
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['dist/content.js'],
        });
        const retryResponse = await trySendMessage();
        sendResponse(retryResponse);
        return;
      } catch (injectError) {
        const injectMessage =
          injectError instanceof Error ? injectError.message : String(injectError);
        logger.warn('Content script injection failed:', injectMessage);
        sendResponse({ success: false, error: injectMessage });
        return;
      }
    }
  } catch (error) {
    logger.error('Failed to forward message to content script:', error);
    sendResponse({ success: false, error: (error as Error).message });
  }
}

// Executed in the page context
function extractPageContent(): {
  title: string;
  url: string;
  content: string;
  length: number;
} {
  // Remove script and style elements
  const scripts = document.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());

  // Get main content areas
  const contentSelectors = ['main', 'article', '.content', '.post', '.entry', '#content', '#main'];

  let content = '';

  // Try to find main content area
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      content = element.textContent ?? '';
      break;
    }
  }

  // Fallback to body content
  if (!content) {
    content = document.body.textContent ?? '';
  }

  // Clean up the content
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  return {
    title: document.title,
    url: window.location.href,
    content,
    length: content.length,
  };
}

export {};
