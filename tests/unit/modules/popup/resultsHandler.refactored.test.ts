import { describe, it, expect, beforeEach } from 'vitest';

class StubUIController {
  called = { updateMainChatButtonState: [] as boolean[] };
  updateMainChatButtonState(val: boolean) {
    this.called.updateMainChatButtonState.push(val);
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, id?: string) {
  const e = document.createElement(tag);
  if (id) e.id = id;
  return e;
}

function setupDom() {
  const container = el('div');
  const errorState = el('div');
  const errorMessage = el('div');
  const resultsSection = el('div');
  const historyContainer = el('div');
  const currentResultsDetail = el('div');
  const markdownTab = el('button');
  const htmlTab = el('button');
  const cleanedHtmlTab = el('button');
  const markdownText = el('pre');
  const htmlText = el('pre');
  const cleanedHtmlText = el('pre');
  const metadataData = el('pre');
  const markdownPanel = el('div');
  const htmlPanel = el('div');
  const cleanedHtmlPanel = el('div');
  const metadataPanel = el('div');
  const resultsTabs = [el('div'), el('div'), el('div'), el('div')];
  resultsTabs[0]!.dataset.tab = 'markdown';
  resultsTabs[1]!.dataset.tab = 'html';
  resultsTabs[2]!.dataset.tab = 'cleaned-html';
  resultsTabs[3]!.dataset.tab = 'metadata';
  container.append(
    errorState,
    errorMessage,
    resultsSection,
    historyContainer,
    currentResultsDetail,
    markdownTab,
    htmlTab,
    cleanedHtmlTab,
    markdownText,
    htmlText,
    cleanedHtmlText,
    metadataData,
    markdownPanel,
    htmlPanel,
    cleanedHtmlPanel,
    metadataPanel,
    ...resultsTabs
  );
  document.body.appendChild(container);
  return {
    errorState,
    errorMessage,
    resultsSection,
    historyContainer,
    currentResultsDetail,
    markdownTab,
    htmlTab,
    cleanedHtmlTab,
    markdownText,
    htmlText,
    cleanedHtmlText,
    metadataData,
    markdownPanel,
    htmlPanel,
    cleanedHtmlPanel,
    metadataPanel,
    resultsTabs,
  };
}

describe('ResultsHandler (TS port)', () => {
  let elements: any;
  let ui: any;
  let ResultsHandler: any;

  beforeEach(async () => {
    document.body.innerHTML = '';
    elements = setupDom();
    ui = new StubUIController();
    // Dynamically import after DOM ready: we'll create file in src/popup/modules
    ResultsHandler = (await import('@/popup/modules/resultsHandler')).ResultsHandler;
  });

  it('showError should toggle states', () => {
    const rh = new ResultsHandler(elements, ui);
    elements.resultsSection.classList.remove('hidden');
    elements.errorState.classList.add('hidden');

    rh.showError('Oops');
    expect(elements.errorMessage.textContent).toBe('Oops');
    expect(elements.errorState.classList.contains('hidden')).toBe(false);
    expect(elements.resultsSection.classList.contains('hidden')).toBe(true);
  });

  it('showExtractionResults should add to history and show section', () => {
    const rh = new ResultsHandler(elements, ui);
    rh.showExtractionResults({
      success: true,
      dataSources: { markdown: { content: '# Title' } },
      stats: { originalSize: 10, markdownSize: 5 },
      currentPageUrl: 'https://example.com/path',
      title: 'Example',
    });
    expect(rh.extractionHistory.length).toBe(1);
    expect(elements.resultsSection.classList.contains('hidden')).toBe(false);
    expect(ui.called.updateMainChatButtonState.at(-1)).toBe(true);
  });

  it('switchResultTab should activate proper panel', () => {
    const rh = new ResultsHandler(elements, ui);
    rh.switchResultTab('html');
    expect(elements.htmlPanel.classList.contains('results-panel--active')).toBe(true);
    expect(elements.markdownPanel.classList.contains('results-panel--active')).toBe(false);
  });

  it('combineDataSourceContent should prefer markdown>cleaned>raw', () => {
    const rh = new ResultsHandler(elements, ui);
    expect(
      rh.combineDataSourceContent({
        markdown: { content: 'M' },
        cleaned: { content: 'C' },
        raw: { content: 'R' },
      })
    ).toBe('M');
    expect(rh.combineDataSourceContent({ cleaned: { content: 'C' }, raw: { content: 'R' } })).toBe(
      'C'
    );
    expect(rh.combineDataSourceContent({ raw: { content: 'R' } })).toBe('R');
    expect(rh.combineDataSourceContent(null as unknown as any)).toBe('');
  });

  it('showSummaryResults should hide extraction tabs and set metadata', () => {
    const rh = new ResultsHandler(elements, ui);
    rh.showSummaryResults({
      success: true,
      result: 'ok',
      selectedDataSource: 'markdown',
      recommendations: ['a'],
      currentPageUrl: 'u',
      purpose: 'p',
      model: 'm',
    });
    expect(elements.markdownTab.classList.contains('hidden')).toBe(true);
    expect(elements.htmlTab.classList.contains('hidden')).toBe(true);
    expect(elements.cleanedHtmlTab.classList.contains('hidden')).toBe(true);
    expect(elements.metadataData.textContent).toContain('"purpose": "p"');
    expect(elements.resultsSection.classList.contains('hidden')).toBe(false);
    expect(elements.errorState.classList.contains('hidden')).toBe(true);
  });
});
