import { DataSourceEventEmitter } from '@/modules/dataSource/dataSourceEventEmitter';
import { Logger } from '@/utils/logger';
import type { PopupElements } from '@/types/popup';
import type { AvailableDataSource } from '@/types/dataSource';
import type { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';

export class DataSourceUIController {
  private elements: PopupElements;
  private eventEmitter: DataSourceEventEmitter;
  private currentModalContext: 'chat' | 'formFiller' | null = null;
  private logger = Logger.forScope('DataSourceUIController');

  constructor(elements: PopupElements, eventEmitter: DataSourceEventEmitter) {
    this.elements = elements;
    this.eventEmitter = eventEmitter;
  }

  init(): void {
    this.setupEventListeners();
    this.logger.info('Initialized');
  }

  private setupEventListeners(): void {
    try {
      if (this.elements.dataSourceModalClose) {
        this.elements.dataSourceModalClose.addEventListener('click', () => this.closeModal());
      }
      if (this.elements.dataSourceCancelBtn) {
        this.elements.dataSourceCancelBtn.addEventListener('click', () => this.closeModal());
      }
      if (this.elements.dataSourceApplyBtn) {
        this.elements.dataSourceApplyBtn.addEventListener('click', () =>
          this.handleApplyConfiguration()
        );
      }

      const typeRadios = document.querySelectorAll('input[name="dataSourceType"]');
      typeRadios.forEach(radio => {
        radio.addEventListener('change', e => {
          const target = e.target as HTMLInputElement;
          if (target && target.checked) this.handleDataSourceTypeChange(target.value);
        });
      });

      if (this.elements.dataSourceModal) {
        this.elements.dataSourceModal.addEventListener('click', e => {
          if (e.target === this.elements.dataSourceModal) this.closeModal();
        });
      }

      const chatDataSourceBtn = document.getElementById('chatDataSourceBtn');
      chatDataSourceBtn?.addEventListener('click', () => this.openModalForContext('chat'));

      const simpleModeDataSourceBtn = document.getElementById('simpleModeDataSourceBtn');
      simpleModeDataSourceBtn?.addEventListener('click', () =>
        this.openModalForContext('formFiller')
      );

      const advancedModeDataSourceBtn = document.getElementById('advancedDataSourceBtn');
      advancedModeDataSourceBtn?.addEventListener('click', () =>
        this.openModalForContext('formFiller')
      );

      const legacyFormBtn = document.getElementById('openFormFillerDataSourceModalBtn');
      legacyFormBtn?.addEventListener('click', () => this.openModalForContext('formFiller'));
    } catch (error) {
      this.logger.error('Error setting up event listeners:', error);
    }
  }

  openModalForContext(context: 'chat' | 'formFiller'): void {
    if (!this.elements.dataSourceModal) {
      this.logger.error('Modal element not found');
      return;
    }
    this.currentModalContext = context;
    this.elements.dataSourceModal.classList.remove('hidden');
    this.elements.dataSourceModal.style.display = 'flex';
    this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.MODAL_OPENED, { context });
    this.logger.info(`Modal opened for context: ${context}`);
  }

  closeModal(): void {
    if (this.elements.dataSourceModal) {
      this.elements.dataSourceModal.classList.add('hidden');
      this.elements.dataSourceModal.style.display = 'none';
    }
    const previous = this.currentModalContext;
    this.currentModalContext = null;
    this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.MODAL_CLOSED, { context: previous });
    this.logger.info('Modal closed');
  }

  updateDataSourceList(
    availableDataSources: AvailableDataSource[],
    currentConfig: DataSourceConfig
  ): void {
    try {
      const list = document.getElementById('dataSourceList');
      if (!list) {
        this.logger.error('dataSourceList element not found');
        return;
      }
      if (!availableDataSources.length) {
        this.showEmptyDataSourceList(list);
        return;
      }
      const html = availableDataSources
        .map(source => {
          const isSelected = currentConfig.selectedItems.some(
            item => (typeof item === 'object' ? item.id : item) === source.id
          );
          const contentByType: Record<string, string> = {
            markdown: source.markdown || '',
            cleaned: source.cleaned || '',
            raw: source.raw || '',
          };
          const content = contentByType[currentConfig.type as string] || source.markdown || '';
          return `
            <div class="data-source-item ${isSelected ? 'data-source-item--selected' : ''}" data-source-id="${source.id}">
              <input type="checkbox" class="data-source-item__checkbox" value="${source.id}" ${isSelected ? 'checked' : ''}>
              <div class="data-source-item__content">
                <div class="data-source-item__title">${this.escapeHtml(source.title)}</div>
                <div class="data-source-item__url">${this.escapeHtml(source.url)}</div>
                <div class="data-source-item__meta">
                  <span class="data-source-item__time">${this.formatTimestamp(source.timestamp)}</span>
                  <span class="data-source-item__size">${content.length} chars</span>
                </div>
              </div>
            </div>
          `;
        })
        .join('');
      list.innerHTML = html;
      this.attachDataSourceListeners(list);
      this.logger.debug('Data source list updated');
    } catch (error) {
      this.logger.error('Error updating data source list:', error);
    }
  }

  private showEmptyDataSourceList(container: HTMLElement): void {
    container.innerHTML = `
      <div class="data-source-empty">
        <div class="data-source-empty__icon">📊</div>
        <div class="data-source-empty__text">No data sources available</div>
        <div class="data-source-empty__description">
          Switch to the Data Extraction tab and extract some content first.
        </div>
      </div>
    `;
  }

  private attachDataSourceListeners(container: HTMLElement): void {
    const checkboxes = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', e => {
        const item = (e.target as HTMLElement).closest('.data-source-item') as HTMLElement;
        if (item) this.handleDataSourceSelection(item);
      });
    });
    const items = container.querySelectorAll<HTMLElement>('.data-source-item');
    items.forEach(item => {
      item.addEventListener('click', e => {
        const target = e.target as HTMLInputElement;
        if (target && target.type !== 'checkbox') {
          const cb = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
          if (cb) cb.checked = !cb.checked;
          this.handleDataSourceSelection(item);
        }
      });
    });
  }

  private handleDataSourceSelection(item: HTMLElement): void {
    const sourceId = item.dataset.sourceId;
    if (!sourceId) {
      this.logger.warn('Missing sourceId in data-source-item');
      return;
    }
    const checkbox = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const isSelected = !!checkbox?.checked;
    if (isSelected) item.classList.add('data-source-item--selected');
    else item.classList.remove('data-source-item--selected');
    this.eventEmitter.emit('dataSourceSelectionChanged', {
      sourceId,
      isSelected,
      context: this.currentModalContext,
    });
  }

  private handleDataSourceTypeChange(type: string): void {
    this.eventEmitter.emit('dataSourceTypeChanged', {
      type,
      context: this.currentModalContext,
    });
  }

  private handleApplyConfiguration(): void {
    const typeRadios = document.querySelectorAll<HTMLInputElement>('input[name="dataSourceType"]');
    const selectedType = Array.from(typeRadios).find(r => r.checked)?.value || 'markdown';
    const selected = document.querySelectorAll<HTMLInputElement>(
      '#dataSourceList input[type="checkbox"]:checked'
    );
    const selectedItemIds = Array.from(selected).map(cb => cb.value);
    this.eventEmitter.emit('applyConfiguration', {
      type: selectedType,
      selectedItemIds,
      context: this.currentModalContext,
    });
  }

  populateModal(config: DataSourceConfig, availableDataSources: AvailableDataSource[]): void {
    try {
      const typeRadios = document.querySelectorAll<HTMLInputElement>(
        'input[name="dataSourceType"]'
      );
      typeRadios.forEach(r => {
        r.checked = r.value === (config.type as string);
      });
      this.updateDataSourceList(availableDataSources, config);
    } catch (error) {
      this.logger.error('Error populating modal:', error);
    }
  }

  updateChatUI(config: DataSourceConfig): void {
    try {
      const chatBtn = document.getElementById('chatDataSourceBtn');
      const chatText = document.getElementById('chatDataSourceText');
      const chatIcon = document.getElementById('chatDataSourceIcon');
      if (config.isValid()) {
        const count = config.getCount();
        const typeText = this.getTypeDisplayName(config.type as string);
        if (chatText) chatText.textContent = `${count} selected • ${typeText}`;
        if (chatIcon) chatIcon.textContent = '✅';
        chatBtn?.classList.add('simple-mode__data-source-btn--configured');
      } else {
        if (chatText) chatText.textContent = 'Configure sources';
        if (chatIcon) chatIcon.textContent = '⚙️';
        chatBtn?.classList.remove('simple-mode__data-source-btn--configured');
      }
      this.logger.debug('Chat UI updated:', {
        isValid: config.isValid(),
        count: config.getCount(),
        type: config.type,
        elementFound: !!chatText,
      });
    } catch (error) {
      this.logger.error('Error updating chat UI:', error);
    }
  }

  updateFormFillerUI(config: DataSourceConfig, availableDataSources: AvailableDataSource[]): void {
    try {
      const validSelected = config.selectedItems.filter(selectedItem => {
        const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
        return availableDataSources.some(source => source.id === selectedId);
      });
      const hasValid = config.isValid() && validSelected.length > 0;
      const count = validSelected.length;
      const typeText = this.getTypeDisplayName(config.type as string);

      const simpleBtn = document.getElementById('simpleModeDataSourceBtn');
      const simpleText = document.getElementById('simpleModeDataSourceText');
      const simpleIcon = document.getElementById('simpleModeDataSourceIcon');
      const advancedBtn = document.getElementById('advancedDataSourceBtn');
      const advancedText = document.getElementById('advancedDataSourceText');
      const advancedIcon = document.getElementById('advancedDataSourceIcon');

      if (hasValid) {
        const summary = `${count} selected • ${typeText}`;
        if (simpleText) simpleText.textContent = summary;
        if (simpleIcon) simpleIcon.textContent = '✅';
        simpleBtn?.classList.add('simple-mode__data-source-btn--configured');

        if (advancedText) advancedText.textContent = summary;
        if (advancedIcon) advancedIcon.textContent = '✅';
        advancedBtn?.classList.add('simple-mode__data-source-btn--configured');
      } else {
        if (simpleText) simpleText.textContent = 'Configure sources';
        if (simpleIcon) simpleIcon.textContent = '⚙️';
        simpleBtn?.classList.remove('simple-mode__data-source-btn--configured');
        if (advancedText) advancedText.textContent = 'Configure sources';
        if (advancedIcon) advancedIcon.textContent = '⚙️';
        advancedBtn?.classList.remove('simple-mode__data-source-btn--configured');
      }
    } catch (error) {
      this.logger.error('Error updating form filler UI:', error);
    }
  }

  private getTypeDisplayName(type: string): string {
    const display: Record<string, string> = {
      markdown: 'Markdown',
      cleaned: 'Cleaned HTML',
      raw: 'Raw HTML',
    };
    return display[type] || type;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatTimestamp(timestamp?: number): string {
    try {
      if (!timestamp) return 'Unknown time';
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Invalid time';
    }
  }

  getCurrentModalContext(): 'chat' | 'formFiller' | null {
    return this.currentModalContext;
  }
}

export default DataSourceUIController;
