// Background service worker for Edge/Chrome Extension (Manifest V3)
// Ported to TypeScript with minimal logic changes

import { Logger } from '@/utils/logger';

const logger = Logger.forScope('Background');

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
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  logger.info('Extension started - side panel ready');
});

// Message types
type BgMessage =
  | { action: 'extractPageContent' }
  | { action: 'checkAuth' }
  | { action: 'getAvailableModels' }
  | { action: 'refreshOllamaModels' }
  | { action: 'detectForms' }
  | { action: 'extractContentWithIframes' }
  | { action: 'fillForms'; mappings: unknown };

// Handle messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message: BgMessage, _sender, sendResponse) => {
  logger.debug('Background received message:', message);

  switch (message.action) {
    case 'extractPageContent':
      void handlePageContentExtraction(sendResponse);
      break;
    case 'checkAuth':
      void handleAuthCheck(sendResponse);
      break;
    case 'getAvailableModels':
      void handleGetAvailableModels(sendResponse);
      break;
    case 'refreshOllamaModels':
      void handleRefreshOllamaModels(sendResponse);
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
    // Pure frontend: return empty list here or read from storage/model registry later
    sendResponse({ success: true, models: [] });
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
    // Pure frontend: nothing to refresh, return success
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
    chrome.tabs.sendMessage(tab.id, payload, (resp: unknown) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        logger.error('Failed to forward message to content script:', lastError.message);
        sendResponse({ success: false, error: lastError.message });
        return;
      }
      sendResponse(resp);
    });
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
