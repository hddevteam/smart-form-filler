import type { PopupElements } from '@/types/popup';
import type { DataSources } from '@/popup/modules/resultsHandler';

export interface CopyHandlerDeps {
  elements: Pick<
    PopupElements,
    'resultsSection' | 'copyBtn' | 'markdownText' | 'htmlText' | 'cleanedHtmlText' | 'metadataData'
  >;
  resultsHandler: {
    getLastExtractionResult(): DataSources | null;
    showError(message: string): void;
    showSuccess(message: string): void;
  };
  clipboard?: {
    writeText(text: string): Promise<void>;
  };
  rootDocument?: Document;
}

const COPY_SUCCESS_MESSAGE = '📋 Content copied to clipboard';

export class CopyHandler {
  private readonly elements: CopyHandlerDeps['elements'];
  private readonly resultsHandler: CopyHandlerDeps['resultsHandler'];
  private readonly clipboard: Required<CopyHandlerDeps>['clipboard'];
  private readonly rootDocument: Document;
  private copyInProgress = false;

  constructor({ elements, resultsHandler, clipboard, rootDocument }: CopyHandlerDeps) {
    if (!elements.copyBtn) {
      throw new Error('copyBtn element is required for CopyHandler');
    }
    this.elements = elements;
    this.resultsHandler = resultsHandler;
    this.clipboard = clipboard ?? navigator.clipboard;
    this.rootDocument = rootDocument ?? document;
  }

  async handleCopy(): Promise<void> {
    if (this.copyInProgress) return;
    if (
      !this.elements.resultsSection ||
      this.elements.resultsSection.classList.contains('hidden')
    ) {
      this.resultsHandler.showError('No results to copy. Please extract data first.');
      return;
    }

    const button = this.elements.copyBtn;
    const originalText = button?.textContent ?? 'Copy';

    try {
      this.copyInProgress = true;
      if (button) {
        button.disabled = true;
        button.textContent = 'Copying...';
      }

      const text = this.getContentForActiveTab();
      if (!text.trim()) {
        this.resultsHandler.showError('No content to copy');
        return;
      }

      await this.clipboard.writeText(text);
      this.resultsHandler.showSuccess(COPY_SUCCESS_MESSAGE);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.resultsHandler.showError(`Copy failed: ${message}`);
    } finally {
      this.copyInProgress = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  private getContentForActiveTab(): string {
    const activeTab = this.rootDocument.querySelector('.results-tab--active');
    const tabName = activeTab instanceof HTMLElement ? activeTab.dataset.tab : undefined;

    switch (tabName) {
      case 'html':
        return this.getHtmlSource();
      case 'cleaned-html':
        return this.getCleanedHtml();
      case 'metadata':
        return this.getMetadata();
      case 'markdown':
      default:
        return this.getMarkdown();
    }
  }

  private getMarkdown(): string {
    const content = this.elements.markdownText?.textContent ?? '';
    if (!content.trim()) {
      throw new Error('Markdown content is empty. Please extract data first.');
    }
    return content;
  }

  private getHtmlSource(): string {
    const result = this.resultsHandler.getLastExtractionResult();
    if (result?.raw?.content?.trim()) return result.raw.content;

    const fallback = this.elements.htmlText?.textContent ?? '';
    if (!fallback.trim()) {
      throw new Error('HTML content is empty. Please extract data first.');
    }
    return fallback;
  }

  private getCleanedHtml(): string {
    const result = this.resultsHandler.getLastExtractionResult();
    if (result?.cleaned?.content?.trim()) return result.cleaned.content;

    const fallback = this.elements.cleanedHtmlText?.textContent ?? '';
    if (!fallback.trim()) {
      throw new Error('Cleaned HTML content is empty. Please extract data first.');
    }
    return fallback;
  }

  private getMetadata(): string {
    const text = this.elements.metadataData?.textContent ?? '';
    if (!text.trim()) {
      throw new Error('Metadata content is empty. Please extract data first.');
    }
    return text;
  }
}

export default CopyHandler;
