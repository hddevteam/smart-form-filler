import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopyHandler } from '@/popup/modules/copyHandler';
import type { PopupElements } from '@/types/popup';

describe('CopyHandler', () => {
  let elements: PopupElements;
  let clipboardWrite: ReturnType<typeof vi.fn>;
  let showError: ReturnType<typeof vi.fn>;
  let showSuccess: ReturnType<typeof vi.fn>;

  const setupDOM = () => {
    document.body.innerHTML = `
      <section id="resultsSection">
        <div class="results-tabs">
          <button class="results-tab" data-tab="markdown" id="markdownTab">Markdown</button>
          <button class="results-tab" data-tab="html" id="htmlTab">HTML</button>
          <button class="results-tab" data-tab="metadata" id="metadataTab">Metadata</button>
        </div>
        <div id="markdownText"># Title\nContent</div>
        <div id="htmlText"><div>HTML</div></div>
        <div id="cleanedHtmlText"><div>Clean</div></div>
        <pre id="metadataData">{ "foo": "bar" }</pre>
        <button id="copyBtn">Copy</button>
      </section>
    `;

    const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
    const resultsSection = document.getElementById('resultsSection') as HTMLElement;
    const markdownText = document.getElementById('markdownText') as HTMLElement;
    const htmlText = document.getElementById('htmlText') as HTMLElement;
    const cleanedHtmlText = document.getElementById('cleanedHtmlText') as HTMLElement;
    const metadataData = document.getElementById('metadataData') as HTMLElement;

    elements = {
      copyBtn,
      resultsSection,
      markdownText,
      htmlText,
      cleanedHtmlText,
      metadataData,
    } as PopupElements;
  };

  beforeEach(() => {
    clipboardWrite = vi.fn().mockResolvedValue(undefined);
    showError = vi.fn();
    showSuccess = vi.fn();
    setupDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  const createHandler = (options: { tab: string; result?: any } = { tab: 'markdown' }) => {
    document
      .querySelectorAll('.results-tab')
      .forEach(tab => tab.classList.remove('results-tab--active'));
    const tabButton = document.querySelector(`[data-tab="${options.tab}"]`);
    tabButton?.classList.add('results-tab--active');

    return new CopyHandler({
      elements,
      resultsHandler: {
        getLastExtractionResult: () =>
          options.result ?? {
            markdown: { content: '# Title\nContent' },
            raw: { content: '<div>raw</div>' },
            cleaned: { content: '<section>clean</section>' },
          },
        showError,
        showSuccess,
      },
      clipboard: { writeText: clipboardWrite },
      rootDocument: document,
    });
  };

  it('copies markdown content when markdown tab active', async () => {
    const handler = createHandler({ tab: 'markdown' });
    await handler.handleCopy();

    expect(clipboardWrite).toHaveBeenCalledWith('# Title\nContent');
    expect(showSuccess).toHaveBeenCalled();
  });

  it('copies html content when html tab active', async () => {
    const handler = createHandler({ tab: 'html' });
    await handler.handleCopy();

    expect(clipboardWrite).toHaveBeenCalledWith('<div>raw</div>');
  });

  it('shows error when results section hidden', async () => {
    elements.resultsSection?.classList.add('hidden');
    const handler = createHandler();
    await handler.handleCopy();

    expect(showError).toHaveBeenCalledWith('No results to copy. Please extract data first.');
    expect(clipboardWrite).not.toHaveBeenCalled();
  });

  it('falls back to markdown content when no active tab', async () => {
    document
      .querySelectorAll('.results-tab')
      .forEach(tab => tab.classList.remove('results-tab--active'));
    const handler = createHandler();
    await handler.handleCopy();

    expect(clipboardWrite).toHaveBeenCalledWith('# Title\nContent');
  });

  it('notifies error when clipboard fails', async () => {
    clipboardWrite.mockRejectedValueOnce(new Error('denied'));
    const handler = createHandler();
    await handler.handleCopy();

    expect(showError).toHaveBeenCalledWith('Copy failed: denied');
  });
});
