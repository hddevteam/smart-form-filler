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
  | { action: 'getAvailableModels'; backendUrl: string }
  | { action: 'refreshOllamaModels'; backendUrl: string }
  | { action: 'testBackendConnection'; backendUrl: string };

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
      void handleGetAvailableModels(message.backendUrl, sendResponse);
      break;
    case 'refreshOllamaModels':
      void handleRefreshOllamaModels(message.backendUrl, sendResponse);
      break;
    case 'testBackendConnection':
      void handleTestBackendConnection(message.backendUrl, sendResponse);
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

async function handleGetAvailableModels(
  backendUrl: string,
  sendResponse: (response: {
    success: boolean;
    models?: Array<{ id: string; name?: string; description?: string; source?: string }>;
    error?: string;
  }) => void
): Promise<void> {
  try {
    const response = await fetch(`${backendUrl}/api/models/available`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      success?: boolean;
      models?: Array<{ id: string; name?: string; description?: string; source?: string }>;
    };
    sendResponse({
      success: true,
      models: data.models ?? [],
    });
  } catch (error) {
    logger.error('Get available models error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

async function handleRefreshOllamaModels(
  backendUrl: string,
  sendResponse: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    const response = await fetch(`${backendUrl}/api/models/refresh-ollama`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { success?: boolean };
    sendResponse({ success: data.success ?? true });
  } catch (error) {
    logger.error('Refresh Ollama models error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
  }
}

async function handleTestBackendConnection(
  backendUrl: string,
  sendResponse: (response: { success: boolean; error?: string }) => void
): Promise<void> {
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    sendResponse({ success: true });
  } catch (error) {
    logger.error('Test backend connection error:', error);
    sendResponse({
      success: false,
      error: (error as Error).message,
    });
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
