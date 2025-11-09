import { describe, it, expect, beforeEach, vi } from 'vitest';
import ResultsHandler from '@/popup/modules/resultsHandler';
import type { PopupElements } from '@/types/popup';

const createElements = (): PopupElements => {
  const historyContainer = document.createElement('div');
  const currentResultsDetail = document.createElement('div');
  currentResultsDetail.classList.add('hidden');
  const resultsSection = document.createElement('section');
  resultsSection.classList.add('hidden');
  const errorState = document.createElement('div');
  errorState.classList.add('hidden');
  const errorMessage = document.createElement('div');
  const markdownText = document.createElement('pre');
  const htmlText = document.createElement('pre');
  const cleanedHtmlText = document.createElement('pre');
  const metadataData = document.createElement('pre');
  const metadataPanel = document.createElement('div');
  const markdownPanel = document.createElement('div');
  const htmlPanel = document.createElement('div');
  const cleanedHtmlPanel = document.createElement('div');
  const resultsMeta = document.createElement('div');

  const tab = () => {
    const btn = document.createElement('button');
    btn.dataset.tab = 'markdown';
    return btn;
  };
  const markdownTab = tab();
  markdownTab.dataset.tab = 'markdown';
  const htmlTab = tab();
  htmlTab.dataset.tab = 'html';
  const cleanedTab = tab();
  cleanedTab.dataset.tab = 'cleaned-html';
  const metadataTab = tab();
  metadataTab.dataset.tab = 'metadata';

  return {
    historyContainer,
    currentResultsDetail,
    resultsSection,
    errorState,
    errorMessage,
    markdownText,
    htmlText,
    cleanedHtmlText,
    metadataData,
    markdownPanel,
    htmlPanel,
    cleanedHtmlPanel,
    metadataPanel,
    resultsTabs: [markdownTab, htmlTab, cleanedTab, metadataTab],
    resultsMeta,
  } as unknown as PopupElements;
};

const sampleResponse = {
  success: true,
  currentPageUrl: 'https://example.com/page',
  title: 'Sample Page',
  dataSources: {
    markdown: { content: '# Heading\nBody copy' },
    raw: { content: '<h1>Heading</h1>' },
  },
};

describe('ResultsHandler', () => {
  let elements: PopupElements;
  let handler: ResultsHandler;

  beforeEach(() => {
    document.body.innerHTML = '';
    elements = createElements();
    document.body.append(
      elements.historyContainer!,
      elements.currentResultsDetail!,
      elements.resultsSection!,
      elements.errorState!,
      elements.errorMessage!,
      elements.markdownText!,
      elements.htmlText!,
      elements.cleanedHtmlText!,
      elements.metadataData!,
      elements.metadataPanel!,
      elements.markdownPanel!,
      elements.htmlPanel!,
      elements.cleanedHtmlPanel!,
      elements.resultsMeta!
    );
    handler = new ResultsHandler(elements);
  });

  it('stores extraction results and renders history/detail views', () => {
    handler.showExtractionResults(sampleResponse);

    expect(handler.extractionHistory).toHaveLength(1);
    expect(elements.historyContainer!.children.length).toBe(1);
    expect(elements.resultsSection!.classList.contains('hidden')).toBe(false);

    handler.viewHistoryItem(0);
    expect(elements.currentResultsDetail!.classList.contains('hidden')).toBe(false);
    expect(elements.markdownText!.textContent).toContain('Heading');
  });

  it('handles history action buttons (view/delete/select)', () => {
    handler.showExtractionResults(sampleResponse);

    const item = elements.historyContainer!.querySelector('.history-item') as HTMLElement;
    const viewBtn = item.querySelector('[data-action="view"]') as HTMLButtonElement;
    const deleteBtn = item.querySelector('[data-action="delete"]') as HTMLButtonElement;
    const selectBtn = item.querySelector('[data-action="select"]') as HTMLButtonElement;

    const showErrorSpy = vi.spyOn(
      handler as unknown as { showError: (msg: string) => void },
      'showError'
    );

    viewBtn.click();
    expect(elements.currentResultsDetail!.classList.contains('hidden')).toBe(false);

    selectBtn.click();
    expect(showErrorSpy).not.toHaveBeenCalled();

    deleteBtn.click();
    expect(handler.extractionHistory).toHaveLength(0);
    expect(elements.historyContainer!.innerHTML).toContain('history-empty');
  });

  it('shows and hides error state correctly', () => {
    handler.showError('Something went wrong');
    expect(elements.errorState!.classList.contains('hidden')).toBe(false);
    expect(elements.resultsSection!.classList.contains('hidden')).toBe(true);
    expect(elements.errorMessage!.textContent).toContain('Something went wrong');
  });

  it('combines data source content with headings', () => {
    const combined = handler.combineDataSourceContent([
      { markdown: '# DS1\nFoo' },
      { text: 'Plain text' },
    ]);
    expect(combined).toContain('## Data Source 1');
    expect(combined).toContain('Plain text');
  });
});
