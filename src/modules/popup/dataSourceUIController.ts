import { DataSourceEventEmitter } from '@/modules/dataSource/dataSourceEventEmitter';
import type { PopupElements } from '@/types/popup';
import type { AvailableDataSource } from '@/types/dataSource';
import type { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';

export class DataSourceUIController {
  private elements: PopupElements;
  private eventEmitter: DataSourceEventEmitter;
  private currentModalContext: 'chat' | 'formFiller' | null = null;

  constructor(elements: PopupElements, eventEmitter: DataSourceEventEmitter) {
    this.elements = elements;
    this.eventEmitter = eventEmitter;
  }

  init(): void {
    this.setupEventListeners();
    // eslint-disable-next-line no-console
    console.log('[DataSourceUIController] Initialized');
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

      const formFillerDataSourceBtn = document.getElementById('openFormFillerDataSourceModalBtn');
      if (formFillerDataSourceBtn) {
        formFillerDataSourceBtn.addEventListener('click', () =>
          this.openModalForContext('formFiller')
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceUIController] Error setting up event listeners:', error);
    }
  }

  openModalForContext(context: 'chat' | 'formFiller'): void {
    if (!this.elements.dataSourceModal) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceUIController] Modal element not found');
      return;
    }
    this.currentModalContext = context;
    this.elements.dataSourceModal.classList.remove('hidden');
    this.elements.dataSourceModal.style.display = 'flex';
    this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.MODAL_OPENED, { context });
    // eslint-disable-next-line no-console
    console.log(`[DataSourceUIController] Modal opened for context: ${context}`);
  }

  closeModal(): void {
    if (this.elements.dataSourceModal) {
      this.elements.dataSourceModal.classList.add('hidden');
      this.elements.dataSourceModal.style.display = 'none';
    }
    const previous = this.currentModalContext;
    this.currentModalContext = null;
    this.eventEmitter.emit(DataSourceEventEmitter.EVENTS.MODAL_CLOSED, { context: previous });
    // eslint-disable-next-line no-console
    console.log('[DataSourceUIController] Modal closed');
  }

  updateDataSourceList(
    availableDataSources: AvailableDataSource[],
    currentConfig: DataSourceConfig
  ): void {
    try {
      const list = document.getElementById('dataSourceList');
      if (!list) {
        // eslint-disable-next-line no-console
        console.error('[DataSourceUIController] dataSourceList element not found');
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
          const content = (source as any)[currentConfig.type] || (source as any).markdown || '';
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
      // eslint-disable-next-line no-console
      console.log('[DataSourceUIController] Data source list updated');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceUIController] Error updating data source list:', error);
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
    const sourceId = item.dataset.sourceId!; // non-null: element created with data-source-id
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
    const selected = document.querySelectorAll<HTMLInputElement>('#dataSourceList input[type="checkbox"]:checked');
    const selectedItemIds = Array.from(selected).map(cb => cb.value);
    this.eventEmitter.emit('applyConfiguration', {
      type: selectedType,
      selectedItemIds,
      context: this.currentModalContext,
    });
  }

  populateModal(
    config: DataSourceConfig,
    availableDataSources: AvailableDataSource[]
  ): void {
    try {
      const typeRadios = document.querySelectorAll<HTMLInputElement>('input[name="dataSourceType"]');
      typeRadios.forEach(r => {
        r.checked = r.value === (config.type as string);
      });
      this.updateDataSourceList(availableDataSources, config);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceUIController] Error populating modal:', error);
    }
  }

  updateChatUI(config: DataSourceConfig): void {
    try {
      const dataSourceSummaryText = document.getElementById('dataSourceSummaryText');
      if (dataSourceSummaryText) {
        if (config.isValid()) {
          const count = config.getCount();
          const typeText = this.getTypeDisplayName(config.type as string);
          dataSourceSummaryText.textContent = `Selected: ${count} source${count !== 1 ? 's' : ''}, ${typeText}`;
        } else {
          dataSourceSummaryText.textContent = 'Selected: 0 sources, No type selected';
        }
      }
      const chatStatus = document.getElementById('chatDataSourceStatus');
      if (chatStatus) {
        if (config.isValid()) {
          const count = config.getCount();
          chatStatus.textContent = `${count} data source${count !== 1 ? 's' : ''} selected`;
          chatStatus.className = 'data-source-status data-source-status--configured';
        } else {
          chatStatus.textContent = 'No data sources configured';
          chatStatus.className = 'data-source-status';
        }
      }
      const chatConfigBtn = document.getElementById('openDataSourceModalBtn');
      if (chatConfigBtn) {
        const buttonText = chatConfigBtn.querySelector('.btn__text');
        if (buttonText) buttonText.textContent = config.isValid() ? 'Reconfigure Sources' : 'Configure Sources';
      }
      // eslint-disable-next-line no-console
      console.log('[DataSourceUIController] Chat UI updated:', {
        isValid: config.isValid(),
        count: config.getCount(),
        type: config.type,
        elementFound: !!dataSourceSummaryText,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceUIController] Error updating chat UI:', error);
    }
  }

  updateFormFillerUI(config: DataSourceConfig, availableDataSources: AvailableDataSource[]): void {
    try {
      const formFillerSummaryElement = document.getElementById(
        'formFillerDataSourceSummary'
      );
      const formFillerSummaryText = document.getElementById(
        'formFillerDataSourceSummaryText'
      );
      const formFillerConfigButton = document.getElementById(
        'openFormFillerDataSourceModalBtn'
      );
      const validSelected = config.selectedItems.filter(selectedItem => {
        const selectedId = typeof selectedItem === 'object' ? selectedItem.id : selectedItem;
        return availableDataSources.some(source => source.id === selectedId);
      });
      const hasValid = config.isValid() && validSelected.length > 0;
      if (hasValid) {
        if (formFillerSummaryElement) formFillerSummaryElement.classList.remove('hidden');
        if (formFillerSummaryText) {
          const count = validSelected.length;
          const countText = `${count} source${count !== 1 ? 's' : ''}`;
          const typeText = this.getTypeDisplayName(config.type as string);
          formFillerSummaryText.textContent = `Selected: ${countText}, ${typeText}`;
        }
        if (formFillerConfigButton) {
          const buttonText = formFillerConfigButton.querySelector('.btn__text');
          if (buttonText) buttonText.textContent = 'Reconfigure Sources';
        }
      } else {
        if (formFillerSummaryElement) formFillerSummaryElement.classList.add('hidden');
        if (formFillerConfigButton) {
          const buttonText = formFillerConfigButton.querySelector('.btn__text');
          if (buttonText) buttonText.textContent = 'Configure Sources';
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[DataSourceUIController] Error updating form filler UI:', error);
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
