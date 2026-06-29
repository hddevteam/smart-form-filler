// Content script - Basic content extraction and form detection bridge (TypeScript)
// Ported to TypeScript with minimal logic changes

import { Logger } from '@/utils/logger';
import FormDetector from '@/content/formDetector';
import FormFiller from '@/content/formFiller';
import { ContentAnalyzer } from '@/content/contentAnalyzer';

const logger = Logger.forScope('ContentScript');

declare global {
  interface Window {
    FormDetector?: new () => { detectForms: () => unknown };
    FormFiller?: new () => { fillFormFields: (mappings: unknown) => unknown };
    contentScriptLoaded?: boolean;
  }
}

class BasicContentExtractor {
  constructor() {
    // Expose TS implementations to window for action handlers
    window.FormDetector = FormDetector as unknown as NonNullable<typeof window.FormDetector>;
    window.FormFiller = FormFiller as unknown as NonNullable<typeof window.FormFiller>;
    this.setupMessageListener();
  }

  setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request: unknown, _sender, sendResponse) => {
      const req = request as { action?: string; mappings?: unknown };
      if (req.action === 'ping') {
        sendResponse({
          success: true,
          message: 'pong',
          timestamp: new Date().toISOString(),
          location: window.location.href,
        });
        return true;
      }

      if (req.action === 'extractContent') {
        try {
          const content = this.extractPageContent();
          sendResponse({ success: true, content });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else if (req.action === 'extractContentWithIframes') {
        try {
          // Return ONLY the main page content. Iframes will be processed elsewhere.
          const mainPage = {
            html: document.documentElement.outerHTML,
            title: document.title,
            url: window.location.href,
          };
          const data = {
            mainPage,
            iframes: [] as unknown[],
          };
          sendResponse({ success: true, data });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else if (req.action === 'extractHTML') {
        try {
          const htmlContent = this.extractPageHTML();
          sendResponse({ success: true, content: htmlContent });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else if (req.action === 'analyzeContent') {
        try {
          const analyzer = new ContentAnalyzer();
          const analysis = analyzer.analyzePageStructure();
          sendResponse({ success: true, analysis });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else if (req.action === 'checkFormDetector') {
        const formDetectorAvailable = typeof window.FormDetector !== 'undefined';
        const formFillerAvailable = typeof window.FormFiller !== 'undefined';
        sendResponse({
          success: true,
          formDetectorAvailable,
          formFillerAvailable,
          timestamp: new Date().toISOString(),
        });
      } else if (req.action === 'detectForms') {
        logger.info("Received 'detectForms' request in content script");
        try {
          const formDetector = new FormDetector();
          const results = formDetector.getDetectionResult();
          sendResponse({ success: true, ...results });
        } catch (error) {
          logger.error('Form detection error:', error);
          sendResponse({ success: false, error: (error as Error).message });
        }
      } else if (req.action === 'fillForms') {
        try {
          if (typeof window.FormFiller === 'undefined') {
            throw new Error('FormFiller not loaded. Please refresh the page and try again.');
          }
          const formFiller = new window.FormFiller();
          const results = (
            formFiller as {
              fillFormFields: (m: unknown) => unknown;
            }
          ).fillFormFields(req.mappings);
          sendResponse({ success: true, ...(results as object) });
        } catch (error) {
          logger.error('Form filling error:', error);
          sendResponse({ success: false, error: (error as Error).message });
        }
      }
      return true;
    });
  }

  extractPageContent(): string {
    const sections: string[] = [];
    sections.push(this.extractBasicMetadata());
    sections.push(this.extractEnhancedContent());
    sections.push(this.extractStructuralInfo());
    return sections.join('\n\n');
  }

  extractBasicMetadata(): string {
    return `Page Title: ${document.title}\nPage URL: ${window.location.href}\nDomain: ${window.location.hostname}\nLanguage: ${document.documentElement.lang || this.detectLanguage()}\nMeta Description: ${this.getMetaContent('description')}\nMeta Keywords: ${this.getMetaContent('keywords')}\nPage Type: ${this.detectPageType()}`;
  }

  extractEnhancedContent(): string {
    const sections: string[] = [];

    const contentSelectors = [
      'main',
      'article',
      '.content',
      '.main-content',
      '#content',
      '#main',
      '.post',
      '.entry',
    ];
    let mainContent = '';
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && this.isValidContentElement(element)) {
        mainContent = this.cleanText(element.textContent ?? '');
        break;
      }
    }
    if (!mainContent) mainContent = this.extractMainContent();
    sections.push(`Main Content:\n${mainContent.substring(0, 2000)}`);

    const linksInfo = this.extractLinksWithTitles();
    if (linksInfo) sections.push(linksInfo);

    const headings = this.extractHeadings();
    if (headings) sections.push(headings);

    const lists = this.extractLists();
    if (lists) sections.push(lists);

    return sections.join('\n\n');
  }

  extractLinksWithTitles(): string | null {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .filter(link => {
        const href = (link as HTMLAnchorElement).href;
        return href && href.startsWith('http');
      })
      .slice(0, 20)
      .map(link => {
        const a = link as HTMLAnchorElement;
        const text = this.cleanText(a.textContent ?? '');
        const title = a.title || a.getAttribute('aria-label') || '';
        const href = a.href;
        if (text && text.length > 5) {
          return title ? `${text} (${title}) - ${href}` : `${text} - ${href}`;
        }
        return null;
      })
      .filter((v): v is string => v !== null);
    return links.length > 0 ? `Important Links:\n${links.join('\n')}` : null;
  }

  extractHeadings(): string | null {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(heading => {
        const level = heading.tagName.substring(1);
        const text = this.cleanText(heading.textContent ?? '');
        return text ? `${'  '.repeat(parseInt(level) - 1)}H${level}: ${text}` : null;
      })
      .filter((v): v is string => v !== null)
      .slice(0, 20);
    return headings.length > 0 ? `Page Structure:\n${headings.join('\n')}` : null;
  }

  extractLists(): string | null {
    const lists = Array.from(document.querySelectorAll('ul, ol'))
      .slice(0, 5)
      .map((list, index) => {
        const items = Array.from(list.children)
          .map(item => this.cleanText(item.textContent ?? ''))
          .filter(text => text && text.length > 3)
          .slice(0, 10);
        return items.length > 0
          ? `List ${index + 1}:\n${items.map(i => `  • ${i}`).join('\n')}`
          : null;
      })
      .filter((v): v is string => v !== null);
    return lists.length > 0 ? `Lists:\n${lists.join('\n\n')}` : null;
  }

  extractMainContent(): string {
    const contentElements = document.querySelectorAll('p, div, span');
    const textBlocks = Array.from(contentElements)
      .map(element => this.cleanText(element.textContent ?? ''))
      .filter(text => text && text.length > 50)
      .slice(0, 10);
    return textBlocks.join(' ');
  }

  extractStructuralInfo(): string {
    const stats = this.getContentStats();
    const pageType = this.detectPageType();
    const language = this.detectLanguage();
    return `Page Analysis:\nContent Statistics: ${stats}\nDetected Page Type: ${pageType}\nDetected Language: ${language}`;
  }

  detectPageType(): string {
    if (document.querySelector('article, .post, .blog-post')) return 'Article/Blog';
    if (document.querySelector('table, .table, .data-table')) return 'Data/Table';
    if (document.querySelector("form, .form, input[type='text']")) return 'Form/Input';
    if (document.querySelector('.product, .item, .listing')) return 'Product/Listing';
    return 'General';
  }

  getContentStats(): string {
    const paragraphs = document.querySelectorAll('p').length;
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const links = document.querySelectorAll('a[href]').length;
    const images = document.querySelectorAll('img').length;
    return `${paragraphs} paragraphs, ${headings} headings, ${links} links, ${images} images`;
  }

  detectLanguage(): string {
    const text = (document.body.textContent ?? '').toLowerCase().substring(0, 1000);
    if (text.includes(' the ') || text.includes(' and ') || text.includes(' of ')) return 'en';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    return document.documentElement.lang || 'unknown';
  }

  extractPageHTML(): {
    html: string;
    title: string;
    url: string;
    cleanHTML: string;
    structuredHTML: unknown;
    language: string;
  } {
    return {
      html: document.documentElement.outerHTML,
      title: document.title,
      url: window.location.href,
      cleanHTML: this.extractCleanHTML(),
      structuredHTML: this.extractStructuredHTML(),
      language:
        document.documentElement.lang ||
        document.querySelector("meta[http-equiv='content-language']")?.getAttribute('content') ||
        'en',
    };
  }

  extractCleanHTML(): string {
    const clonedDoc = document.cloneNode(true) as Document;
    const elementsToRemove = clonedDoc.querySelectorAll(
      'script, style, noscript, iframe, embed, object'
    );
    elementsToRemove.forEach(el => el.remove());

    const walker = clonedDoc.createTreeWalker(clonedDoc.body || clonedDoc, NodeFilter.SHOW_COMMENT);
    const comments: Node[] = [];
    let comment: Node | null;
    while ((comment = walker.nextNode())) comments.push(comment);
    comments.forEach(c => (c as Element).remove());

    const emptyElements = clonedDoc.querySelectorAll('*:empty:not(img):not(input):not(hr):not(br)');
    emptyElements.forEach(el => {
      if ((el.textContent ?? '').trim() === '') el.remove();
    });

    return clonedDoc.body ? clonedDoc.body.innerHTML : clonedDoc.documentElement.innerHTML;
  }

  extractStructuredHTML(): unknown {
    interface Structured {
      title: string;
      headings: Array<{ level: number; text: string; id: string | null }>;
      content: Array<{ index: number; text: string; html: string }>;
      links: Array<{ text: string; href: string; title: string | null }>;
      lists: Array<{ index: number; type: string; items: string[] }>;
      metadata: Record<string, unknown>;
    }
    const structured: Structured = {
      title: document.title,
      headings: [],
      content: [],
      links: [],
      lists: [],
      metadata: {},
    };

    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      structured.headings.push({
        level: parseInt(heading.tagName.substring(1)),
        text: this.cleanText(heading.textContent ?? ''),
        id: heading.id || null,
      });
    });

    document.querySelectorAll('p, div.content, article p').forEach((para, index) => {
      const text = this.cleanText(para.textContent ?? '');
      if (text && text.length > 30) {
        structured.content.push({ index, text, html: para.outerHTML });
      }
    });

    document.querySelectorAll('nav a, .menu a, .navigation a, main a').forEach(link => {
      if (link instanceof HTMLAnchorElement && link.href && link.href.startsWith('http')) {
        structured.links.push({
          text: this.cleanText(link.textContent ?? ''),
          href: link.href,
          title: link.title || null,
        });
      }
    });

    document.querySelectorAll('ul, ol').forEach((list, index) => {
      const items = Array.from(list.children)
        .map(item => this.cleanText(item.textContent ?? ''))
        .filter(text => text && text.length > 5);
      if (items.length > 0) {
        structured.lists.push({ index, type: list.tagName.toLowerCase(), items });
      }
    });

    structured.metadata = {
      url: window.location.href,
      domain: window.location.hostname,
      language: this.detectPageLanguage(),
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords'),
      author: this.getMetaContent('author'),
      publishedTime: this.getMetaContent('article:published_time'),
    };

    return structured;
  }

  getMetaContent(name: string): string {
    const meta = document.querySelector(
      `meta[name='${name}'], meta[property='${name}'], meta[property='og:${name}']`
    );
    return meta?.getAttribute('content') ?? '';
  }

  isValidContentElement(element: Element): boolean {
    const textLength = (element.textContent ?? '').trim().length;
    const tagName = element.tagName.toLowerCase();
    return (
      textLength > 100 &&
      !['nav', 'aside', 'footer', 'header'].includes(tagName) &&
      !element.classList.contains('sidebar') &&
      !element.classList.contains('navigation')
    );
  }

  cleanText(text: string): string {
    return text ? text.trim().replace(/\s+/g, ' ').replace(/\n+/g, ' ') : '';
  }

  detectPageLanguage(): string {
    const lang =
      document.documentElement.lang ||
      document.querySelector("meta[http-equiv='content-language']")?.getAttribute('content') ||
      '';
    return lang || 'unknown';
  }
}

// Initialize
new BasicContentExtractor();

// Debug bridge events
window.addEventListener('smartFormFillerDebugRequest', (event: Event) => {
  const custom = event as CustomEvent<{ messageId: string; type: string }>;
  const { messageId, type } = custom.detail;
  try {
    switch (type) {
      case 'getDebugInfo':
        void chrome.runtime.sendMessage({ action: 'getPopupDebugInfo' }, (response: unknown) => {
          const data: Record<string, unknown> =
            typeof response === 'object' && response !== null
              ? (response as Record<string, unknown>)
              : { error: 'No response from popup' };
          window.dispatchEvent(
            new CustomEvent('smartFormFillerDebugResponse', { detail: { messageId, data } })
          );
        });
        return;
      case 'openDataSourceModal':
        void chrome.runtime.sendMessage({ action: 'openDataSourceModal' });
        window.dispatchEvent(
          new CustomEvent('smartFormFillerDebugResponse', {
            detail: { messageId, data: { success: true, message: 'Modal open request sent' } },
          })
        );
        return;
      case 'getExtractionHistory':
        void chrome.runtime.sendMessage({ action: 'getExtractionHistory' }, (response: unknown) => {
          const data: Record<string, unknown> =
            typeof response === 'object' && response !== null
              ? (response as Record<string, unknown>)
              : { error: 'No response from popup' };
          window.dispatchEvent(
            new CustomEvent('smartFormFillerDebugResponse', { detail: { messageId, data } })
          );
        });
        return;
      case 'getDetailedHistory':
        void chrome.runtime.sendMessage({ action: 'getDetailedAnalysis' }, (response: unknown) => {
          const data: Record<string, unknown> =
            typeof response === 'object' && response !== null
              ? (response as Record<string, unknown>)
              : { error: 'No response from popup' };
          window.dispatchEvent(
            new CustomEvent('smartFormFillerDebugResponse', { detail: { messageId, data } })
          );
        });
        return;
      case 'forceUpdateDataSources':
        void chrome.runtime.sendMessage(
          { action: 'forceUpdateDataSources' },
          (response: unknown) => {
            const data: Record<string, unknown> =
              typeof response === 'object' && response !== null
                ? (response as Record<string, unknown>)
                : { error: 'No response from popup' };
            window.dispatchEvent(
              new CustomEvent('smartFormFillerDebugResponse', {
                detail: { messageId, data },
              })
            );
          }
        );
        return;
      default:
        window.dispatchEvent(
          new CustomEvent('smartFormFillerDebugResponse', {
            detail: { messageId, data: { error: 'Unknown debug request type' } },
          })
        );
        return;
    }
  } catch (error) {
    logger.error('[CONTENT_DEBUG] Error handling debug request:', error);
    window.dispatchEvent(
      new CustomEvent('smartFormFillerDebugResponse', {
        detail: { messageId, data: { error: (error as Error).message } },
      })
    );
  }
});

window.contentScriptLoaded = true;
logger.info('Basic content extractor loaded');

export {};
