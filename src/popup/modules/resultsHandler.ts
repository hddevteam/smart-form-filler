/**
 * ResultsHandler (TypeScript) - Displays and manages extraction results and history
 */
import type { PopupElements, PopupManagerLike } from '@/types/popup';
import type { DataSourceConfigObject } from '@/types/dataSource';
import { Logger } from '@/utils/logger';

export interface ExtractionStats {
  originalSize?: number;
  markdownSize?: number;
}

export interface DataSources {
  markdown?: { content?: string };
  cleaned?: { content?: string };
  raw?: { content?: string };
}

export interface ExtractionResponse {
  success: boolean;
  message?: string;
  dataSources?: DataSources;
  stats?: ExtractionStats;
  currentPageUrl?: string;
  title?: string;
  purpose?: string;
  model?: string;
}

export class ResultsHandler {
  private elements: PopupElements;
  private uiController: { updateMainChatButtonState: (hasHistory: boolean) => void } | undefined;
  private popupManager: PopupManagerLike | undefined;
  private logger = Logger.forScope('ResultsHandler');

  lastExtractionResult: DataSources | null = null;
  extractionHistory: Array<{
    id: number;
    timestamp: Date;
    url: string;
    title: string;
    dataSources: DataSources;
    stats?: ExtractionStats;
  }> = [];
  currentViewIndex = -1;

  constructor(
    elements: PopupElements,
    uiController?: { updateMainChatButtonState: (hasHistory: boolean) => void },
    popupManager?: PopupManagerLike
  ) {
    this.elements = elements;
    this.uiController = uiController;
    this.popupManager = popupManager;
  }

  showExtractionResults(response: ExtractionResponse): void {
    if (!response.success) {
      this.showError(response.message || 'Extraction failed');
      return;
    }
    const dataSources = response.dataSources ?? { markdown: { content: '' } };
    const currentPageUrl = response.currentPageUrl || '';
    const title = response.title || this.extractPageTitle(currentPageUrl, dataSources);
    const item: {
      id: number;
      timestamp: Date;
      url: string;
      title: string;
      dataSources: DataSources;
      stats?: ExtractionStats;
    } = {
      id: Date.now(),
      timestamp: new Date(),
      url: currentPageUrl,
      title,
      dataSources,
    };
    if (response.stats) item.stats = response.stats;
    this.extractionHistory.unshift(item);
    this.lastExtractionResult = dataSources;
    this.notifyExtractionHistoryUpdated();
    this.refreshHistoryDisplay();
    this.updateMainChatButtonState();
    this.elements.resultsSection?.classList.remove('hidden');
  }

  extractPageTitle(url: string, dataSources: DataSources): string {
    try {
      const md = dataSources.markdown?.content;
      if (md) {
        const m = md.match(/^#\s+(.+)$/m);
        if (m?.[1]) {
          const titleMd = m[1];
          if (titleMd.trim()) return titleMd.trim();
        }
      }
      const raw = dataSources.raw?.content;
      if (raw) {
        const m = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
        const titleRaw = m?.[1];
        if (titleRaw && titleRaw.trim()) return titleRaw.trim();
      }
      const cleaned = dataSources.cleaned?.content;
      if (cleaned) {
        const m = cleaned.match(/<title[^>]*>([^<]+)<\/title>/i);
        const titleClean = m?.[1];
        if (titleClean && titleClean.trim()) return titleClean.trim();
      }
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      const pathname = urlObj.pathname;
      if (pathname && pathname !== '/') {
        const parts = pathname.split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        if (last) return `${hostname} - ${last.replace(/[-_]/g, ' ')}`;
      }
      return hostname;
    } catch {
      return url || 'Unknown Page';
    }
  }

  refreshHistoryDisplay(): void {
    const container = this.elements.historyContainer;
    if (!container) return;
    container.innerHTML = '';
    if (this.extractionHistory.length === 0) {
      this.showEmptyState();
      return;
    }
    this.extractionHistory.forEach((item, index) => {
      const el = this.createHistoryItemElement(item, index);
      container.appendChild(el);
    });
    this.showHistoryList();
  }

  createHistoryItemElement(
    item: {
      title: string;
      url: string;
      timestamp: Date;
      stats?: ExtractionStats;
    },
    index: number
  ): HTMLElement {
    const element = document.createElement('div');
    element.className = `history-item${index === 0 ? ' history-item--latest' : ''}`;
    element.dataset.index = String(index);
    const ts = this.formatTimestamp(item.timestamp);
    const statsText = this.formatStats(item.stats);
    element.innerHTML = `
      <div class="history-item__header">
        <h4 class="history-item__title">${this.escapeHtml(item.title)}</h4>
        <span class="history-item__timestamp">${ts}</span>
      </div>
      <a href="${item.url}" class="history-item__url" title="${this.escapeHtml(item.url)}" target="_blank">${this.escapeHtml(item.url)}</a>
      <div class="history-item__stats"><div class="history-item__stat"><span>📄</span><span>${statsText}</span></div></div>
      <div class="history-item__actions">
        <button class="history-item__action-btn" data-action="select" title="Select as Data Source">📌</button>
        <button class="history-item__action-btn" data-action="view" title="View Details">👁️</button>
        <button class="history-item__action-btn history-item__action-btn--delete" data-action="delete" title="Delete">🗑️</button>
      </div>`;
    element.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action === 'delete') {
        e.stopPropagation();
        this.deleteHistoryItem(index);
      } else if (action === 'view') {
        e.stopPropagation();
        this.viewHistoryItem(index);
      } else if (action === 'select') {
        e.stopPropagation();
        this.selectDataSource(index);
      } else if (!target.closest('.history-item__actions')) {
        e.stopPropagation();
        this.viewHistoryItem(index);
      }
    });
    return element;
  }

  formatTimestamp(timestamp: Date): string {
    const now = new Date();
    const diff = Number(now) - Number(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  }

  formatStats(stats?: ExtractionStats): string {
    if (!stats) return 'No stats';
    const originalKB = Math.round((stats.originalSize ?? 0) / 1024);
    const markdownKB = Math.round((stats.markdownSize ?? 0) / 1024);
    return `${originalKB}KB → ${markdownKB}KB`;
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showEmptyState(): void {
    if (!this.elements.historyContainer) return;
    this.elements.historyContainer.innerHTML = `
      <div class="history-empty">
        <div class="history-empty__icon">📊</div>
        <div class="history-empty__title">No Extractions Yet</div>
        <div class="history-empty__description">
          Navigate to any webpage and click "Extract Data Sources" to start building your extraction history.
        </div>
      </div>`;
  }

  viewHistoryItem(index: number): void {
    if (index < 0 || index >= this.extractionHistory.length) return;
    const item = this.extractionHistory[index];
    if (!item) return;
    this.currentViewIndex = index;
    this.lastExtractionResult = item.dataSources;
    this.showDetailView(item);
  }

  showDetailView(item: { url: string; timestamp: Date; dataSources: DataSources }): void {
    this.elements.markdownTab?.classList.remove('hidden');
    this.elements.htmlTab?.classList.remove('hidden');
    this.elements.cleanedHtmlTab?.classList.remove('hidden');
    const urlHeaderMarkdown = `<!-- Source Page: ${item.url} -->\n\n`;
    const urlHeaderHtml = `<!-- Source Page: ${item.url} -->\n`;
    if (this.elements.markdownText)
      this.elements.markdownText.textContent =
        urlHeaderMarkdown + (item.dataSources.markdown?.content || 'No markdown content available');
    if (this.elements.htmlText)
      this.elements.htmlText.textContent =
        urlHeaderHtml + (item.dataSources.raw?.content || 'No raw HTML content available');
    if (this.elements.cleanedHtmlText)
      this.elements.cleanedHtmlText.textContent =
        urlHeaderHtml + (item.dataSources.cleaned?.content || 'No cleaned HTML content available');
    if (this.elements.metadataData)
      this.elements.metadataData.textContent = JSON.stringify(
        { url: item.url, timestamp: item.timestamp.toISOString(), stats: undefined },
        null,
        2
      );
    this.elements.currentResultsDetail?.classList.remove('hidden');
    if (this.elements.historyContainer) this.elements.historyContainer.style.display = 'none';
    this.switchResultTab('markdown');
  }

  showHistoryList(): void {
    this.elements.currentResultsDetail?.classList.add('hidden');
    if (this.elements.historyContainer) this.elements.historyContainer.style.display = 'block';
    this.currentViewIndex = -1;
  }

  deleteHistoryItem(index: number): void {
    if (index < 0 || index >= this.extractionHistory.length) return;
    this.extractionHistory.splice(index, 1);
    this.notifyExtractionHistoryUpdated();
    this.updateMainChatButtonState();
    if (this.currentViewIndex === index) this.showHistoryList();
    else if (this.currentViewIndex > index) this.currentViewIndex--;
    this.refreshHistoryDisplay();
  }

  clearAllHistory(): void {
    this.extractionHistory = [];
    this.currentViewIndex = -1;
    this.lastExtractionResult = null;
    this.notifyExtractionHistoryUpdated();
    this.refreshHistoryDisplay();
    this.updateMainChatButtonState();
  }

  clearCurrentResult(): void {
    this.showHistoryList();
  }

  showSummaryResults(
    response: ExtractionResponse & { selectedDataSource?: string; recommendations?: unknown }
  ): void {
    if (!response.success) {
      this.showError(response.message || 'Summary failed');
      return;
    }
    this.elements.markdownTab?.classList.add('hidden');
    this.elements.htmlTab?.classList.add('hidden');
    this.elements.cleanedHtmlTab?.classList.add('hidden');
    if (this.elements.metadataData)
      this.elements.metadataData.textContent = JSON.stringify(
        {
          sourcePageUrl: response.currentPageUrl || '',
          purpose: response.purpose,
          dataSource: response.selectedDataSource,
          recommendations: response.recommendations,
        },
        null,
        2
      );
    if (this.elements.resultsMeta)
      this.elements.resultsMeta.textContent = `Purpose: ${response.purpose} | Data source: ${response.selectedDataSource} | Model: ${response.model}`;
    this.elements.resultsSection?.classList.remove('hidden');
    this.elements.errorState?.classList.add('hidden');
  }

  formatHTML(html: string): string {
    return html.length > 2000 ? `${html.substring(0, 2000)}...[truncated]` : html;
  }

  switchResultTab(tabName: 'markdown' | 'html' | 'cleaned-html' | 'metadata'): void {
    this.elements.resultsTabs?.forEach(tab => {
      const datasetTab = tab.dataset.tab;
      tab.classList.toggle('results-tab--active', datasetTab === tabName);
    });
    const panels = [
      this.elements.markdownPanel,
      this.elements.htmlPanel,
      this.elements.cleanedHtmlPanel,
      this.elements.metadataPanel,
    ];
    panels.forEach(panel => panel && panel.classList.remove('results-panel--active'));
    if (tabName === 'markdown' && this.elements.markdownPanel)
      this.elements.markdownPanel.classList.add('results-panel--active');
    else if (tabName === 'html' && this.elements.htmlPanel)
      this.elements.htmlPanel.classList.add('results-panel--active');
    else if (tabName === 'cleaned-html' && this.elements.cleanedHtmlPanel)
      this.elements.cleanedHtmlPanel.classList.add('results-panel--active');
    else if (tabName === 'metadata' && this.elements.metadataPanel)
      this.elements.metadataPanel.classList.add('results-panel--active');
  }

  showError(message: string): void {
    if (!this.elements.errorMessage || !this.elements.errorState || !this.elements.resultsSection)
      return;
    this.elements.errorMessage.textContent = message;
    this.elements.errorState.classList.remove('hidden');
    this.elements.resultsSection.classList.add('hidden');
  }

  showSuccess(message: string): void {
    this.logger.info(`Success: ${message}`);
    if (typeof document === 'undefined') return;

    const containerId = 'sff-toast-container';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '16px';
      container.style.right = '16px';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.background = 'rgba(34, 197, 94, 0.95)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 16px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '600';
    toast.style.boxShadow = '0 12px 24px rgba(34, 197, 94, 0.25)';
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    toast.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
    container.appendChild(toast);

    window.requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    window.setTimeout(() => {
      toast.style.transform = 'translateX(120%)';
      toast.style.opacity = '0';
      window.setTimeout(() => {
        toast.remove();
        if (container && container.children.length === 0) container.remove();
      }, 250);
    }, 3000);
  }

  getLastExtractionResult(): DataSources | null {
    return this.lastExtractionResult;
  }

  updateMainChatButtonState(): void {
    if (this.uiController?.updateMainChatButtonState) {
      this.uiController.updateMainChatButtonState(this.extractionHistory.length > 0);
    }
  }

  selectDataSource(index: number): void {
    if (index < 0 || index >= this.extractionHistory.length) {
      this.showError('Invalid data source selection');
      return;
    }
    const item = this.extractionHistory[index];
    const title = item.title ?? `Extraction ${index + 1}`;
    const content = this.combineDataSourceContent(item.dataSources);
    const selectionId = `extraction-${index}`;
    const config: Partial<DataSourceConfigObject> = {
      type: 'markdown',
      selectedItems: [
        {
          id: selectionId,
          title,
          url: item.url,
          content,
          timestamp: item.timestamp?.valueOf?.() ?? item.timestamp,
        },
      ],
      isConfigured: true,
    };

    const manager = this.popupManager?.dataSourceManager;
    if (manager) {
      void Promise.resolve(manager.updateChatConfiguration(config));
      void Promise.resolve(manager.updateFormFillerConfiguration(config));
    }

    this.dispatchDataSourceSelected(config);
    this.showSuccess(`✅ Selected "${title}" as Markdown data source`);
    this.highlightSelectedItem(index);
    this.switchToFormFillerTab();
  }

  highlightSelectedItem(index: number): void {
    if (typeof document === 'undefined') return;
    document
      .querySelectorAll('.history-item--selected')
      .forEach(el => el.classList.remove('history-item--selected'));
    const item = document.querySelector(`[data-index="${index}"]`);
    if (!item) return;
    this.ensureSelectionStyles();
    item.classList.add('history-item--selected');
    window.setTimeout(() => item.classList.remove('history-item--selected'), 3000);
  }

  private dispatchDataSourceSelected(config: Partial<DataSourceConfigObject>): void {
    if (typeof document === 'undefined') return;
    document.dispatchEvent(new CustomEvent('dataSourceSelected', { detail: config }));
  }

  private ensureSelectionStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('sff-selection-styles')) return;
    const style = document.createElement('style');
    style.id = 'sff-selection-styles';
    style.textContent = `
      .history-item--selected {
        border: 2px solid #22c55e !important;
        background: #f0fff4 !important;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
        transform: translateY(-2px);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .history-item--selected .history-item__action-btn[data-action="select"] {
        background: #22c55e !important;
        color: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }

  private switchToFormFillerTab(): void {
    if (typeof document === 'undefined') return;
    const trigger =
      (document.getElementById('formFillerTabTrigger') as HTMLButtonElement | null) ??
      document.querySelector('[data-tab="formfiller"]');
    trigger?.click?.();
  }

  combineDataSourceContent(
    dataSources: DataSources | Array<{ markdown?: string; text?: string }> | null
  ): string {
    if (!dataSources) return '';
    if (!Array.isArray(dataSources)) {
      if (dataSources.markdown?.content) return dataSources.markdown.content;
      if (dataSources.cleaned?.content) return dataSources.cleaned.content;
      if (dataSources.raw?.content) return dataSources.raw.content;
      return '';
    }
    const parts: string[] = [];
    dataSources.forEach((src, i) => {
      if (src.markdown) parts.push(`## Data Source ${i + 1}\n\n${src.markdown}`);
      else if (src.text) parts.push(`## Data Source ${i + 1}\n\n${src.text}`);
    });
    return parts.join('\n\n---\n\n');
  }

  async copyLastResult(): Promise<void> {
    const content = this.combineDataSourceContent(this.lastExtractionResult);
    if (!content) {
      this.showError('No extraction result available to copy');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      } else {
        throw new Error('Clipboard unavailable');
      }
      this.showSuccess('📋 Extraction copied to clipboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.showError(`Failed to copy results: ${message}`);
    }
  }

  notifyExtractionHistoryUpdated(): void {
    const event = new CustomEvent('extractionHistoryUpdated', {
      detail: { historyLength: this.extractionHistory.length, lastItem: this.extractionHistory[0] },
    });
    document.dispatchEvent(event);
    this.popupManager?.dataSourceManager?.updateAvailableDataSources?.();
  }
}

export default ResultsHandler;
