/**
 * DataExtractor (TypeScript)
 * Handles page HTML extraction and iframe contents via content scripts.
 * Ported from legacy JS with minimal behavior changes.
 */

import { Logger } from '@/utils/logger';

const logger = Logger.forScope('DataExtractor');

export interface SimpleTab {
  id: number;
}

export interface IframeContentItem {
  index: number | string;
  src: string;
  content: string;
  metadata: {
    indexPath?: string | number[];
    depth: number;
    accessible: boolean;
    originalAccessible?: boolean;
    title: string;
    url: string;
    domain: string;
    error?: string;
  };
}

export class DataExtractor {
  constructor() {
    logger.debug('DataExtractor initialized');
  }

  /**
   * Get page content with iframe support.
   * Returns ONLY the main page HTML (not merged with iframe content).
   */
  async getPageContent(tab: SimpleTab): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'extractContentWithIframes' },
          (response?: unknown) => {
            if (chrome.runtime.lastError) {
              logger.warn(
                'Content script not available, falling back to direct extraction:',
                chrome.runtime.lastError.message
              );
              this.getPageContentDirect(tab).then(resolve).catch(reject);
              return;
            }

            const res = response as
              | { success?: boolean; data?: { mainPage?: { html?: string } } }
              | undefined;

            if (res && res.success && res.data) {
              const mainPageHtml = res.data.mainPage?.html ?? '';
              if (!mainPageHtml || mainPageHtml.trim().length === 0) {
                logger.warn(
                  'Content script returned empty content, falling back to direct extraction'
                );
                this.getPageContentDirect(tab).then(resolve).catch(reject);
                return;
              }
              logger.info('Content script extraction successful:', mainPageHtml.length, 'chars');
              resolve(mainPageHtml);
              return;
            }

            logger.warn('Content script extraction failed, falling back to direct extraction');
            this.getPageContentDirect(tab).then(resolve).catch(reject);
          }
        );
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  /**
   * Direct page content extraction (fallback)
   */
  async getPageContentDirect(tab: SimpleTab): Promise<string> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          return {
            html: document.documentElement.outerHTML,
            title: document.title,
            url: window.location.href,
            bodyLength: document.body ? document.body.innerHTML.length : 0,
          };
        },
      });

      type ExecResult = {
        result: { html: string; title: string; url: string; bodyLength: number };
      }[];
      const injected = (results as unknown as ExecResult)[0]?.result;
      const html: string = typeof injected?.html === 'string' ? injected.html : '';

      if (!html || html.trim().length === 0) {
        throw new Error('Page returned empty HTML content');
      }

      if (!html.includes('<html') && !html.includes('<body')) {
        throw new Error('Page content does not appear to be valid HTML');
      }

      logger.info('Direct extraction successful:', html.length, 'chars');
      return html;
    } catch (error) {
      logger.error('Direct content extraction failed:', error);
      throw new Error('Failed to extract page content: ' + (error as Error).message);
    }
  }

  /**
   * Extract iframe contents for processing
   */
  async extractIframeContents(tab: SimpleTab): Promise<IframeContentItem[]> {
    try {
      logger.debug('Extracting iframe contents...');

      const isReady = await this.waitForContentScript(tab);
      if (!isReady) {
        logger.debug('Content script not ready, returning empty array');
        return [];
      }

      return await new Promise<IframeContentItem[]>(resolve => {
        chrome.tabs.sendMessage(
          tab.id,
          { action: 'extractContentWithIframes' },
          (response?: unknown) => {
            if (chrome.runtime.lastError) {
              logger.debug('No iframe extraction available, returning empty array');
              resolve([]);
              return;
            }

            const res = response as
              | {
                  success?: boolean;
                  data?: {
                    iframes?: Array<{
                      indexPath?: string | number[];
                      src?: string;
                      depth?: number;
                      accessible?: boolean;
                      error?: string;
                      content?: {
                        html?: string;
                        title?: string;
                        url?: string;
                        domain?: string;
                      };
                    }>;
                  };
                }
              | undefined;

            if (!res || !res.success || !res.data) {
              logger.debug('No iframe extraction available, returning empty array');
              resolve([]);
              return;
            }

            const iframeContents: IframeContentItem[] = [];
            const frames = res.data.iframes ?? [];
            frames.forEach((iframe, index) => {
              const hasContent = !!(
                iframe.content &&
                iframe.content.html &&
                iframe.content.html.length > 0
              );
              const item: IframeContentItem = {
                index: typeof iframe.indexPath === 'string' ? iframe.indexPath : index,
                src: iframe.src || `iframe-${index}`,
                content: hasContent ? (iframe.content?.html ?? '') : '',
                metadata: {
                  ...(iframe.indexPath !== undefined ? { indexPath: iframe.indexPath } : {}),
                  depth: iframe.depth ?? 0,
                  accessible: hasContent,
                  ...(iframe.accessible !== undefined
                    ? { originalAccessible: iframe.accessible }
                    : {}),
                  title: iframe.content?.title ?? '',
                  url: iframe.content?.url ?? '',
                  domain: iframe.content?.domain ?? '',
                },
              };
              if (!hasContent) {
                item.metadata.error = iframe.error || 'No content available';
              }
              iframeContents.push(item);
            });

            logger.debug('Extracted iframe contents count:', iframeContents.length);
            resolve(iframeContents);
          }
        );
      });
    } catch (error) {
      logger.error('Error extracting iframe contents:', error);
      return [];
    }
  }

  /**
   * Wait for content script to be ready with retry mechanism
   */
  async waitForContentScript(tab: SimpleTab, maxRetries = 3, retryDelay = 500): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isReady = await new Promise<boolean>(resolve => {
          chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response?: unknown) => {
            if (chrome.runtime.lastError) {
              resolve(false);
              return;
            }
            const res = response as { success?: boolean } | undefined;
            resolve(!!(res && res.success));
          });
        });

        if (isReady) return true;

        if (attempt === 1) {
          logger.debug('Content script not found, attempting re-injection...');
          await this.reinjectContentScript(tab);
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        logger.debug('Attempt failed:', attempt, error);
      }
    }
    return false;
  }

  /**
   * Re-inject content scripts into the page
   */
  async reinjectContentScript(tab: SimpleTab): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content-iframe.js'],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content-script.js'],
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content-analyzer.js'],
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      logger.error('Failed to re-inject content scripts:', error);
    }
  }
}

export default DataExtractor;
