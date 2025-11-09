import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataSourceEventEmitter } from '@/modules/dataSource/dataSourceEventEmitter';
import DataSourceUIController from '@/modules/popup/dataSourceUIController';
import { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';

function setupDOM() {
  document.body.innerHTML = `
    <div id="dataSourceModal" class="hidden" style="display:none">
      <button id="dataSourceModalClose">x</button>
      <div>
        <label><input type="radio" name="dataSourceType" value="markdown" checked> Markdown</label>
        <label><input type="radio" name="dataSourceType" value="cleaned"> Cleaned</label>
        <label><input type="radio" name="dataSourceType" value="raw"> Raw</label>
      </div>
      <div id="dataSourceList"></div>
      <button id="dataSourceApplyBtn">Apply</button>
      <button id="dataSourceCancelBtn">Cancel</button>
    </div>
    <button id="chatDataSourceBtn" class="simple-mode__data-source-btn">
      <span id="chatDataSourceIcon" class="simple-mode__data-source-icon">⚙️</span>
      <span id="chatDataSourceText" class="simple-mode__data-source-text">Configure sources</span>
    </button>
    <button id="simpleModeDataSourceBtn" class="simple-mode__data-source-btn">
      <span id="simpleModeDataSourceIcon" class="simple-mode__data-source-icon">⚙️</span>
      <span id="simpleModeDataSourceText" class="simple-mode__data-source-text">Configure sources</span>
    </button>
    <button id="advancedDataSourceBtn" class="simple-mode__data-source-btn">
      <span id="advancedDataSourceIcon" class="simple-mode__data-source-icon">⚙️</span>
      <span id="advancedDataSourceText" class="simple-mode__data-source-text">Configure sources</span>
    </button>
    <button id="openDataSourceModalBtn"><span class="btn__text"></span></button>
    <button id="openFormFillerDataSourceModalBtn"><span class="btn__text"></span></button>
  `;
}

const makeSources = () => [
  {
    id: 's1',
    title: 'T1',
    url: 'u1',
    type: 'main',
    markdown: 'm1',
    cleaned: 'c1',
    raw: 'r1',
    timestamp: Date.now(),
  },
  {
    id: 's2',
    title: 'T2',
    url: 'u2',
    type: 'main',
    markdown: 'm2',
    cleaned: '',
    raw: '',
    timestamp: Date.now(),
  },
];

describe('DataSourceUIController', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('opens and closes modal, emitting events', () => {
    const emitter = new DataSourceEventEmitter();
    const spy = vi.spyOn(emitter, 'emit');
    const elements = {
      dataSourceModal: document.getElementById('dataSourceModal') as HTMLElement,
      dataSourceModalClose: document.getElementById('dataSourceModalClose') as HTMLElement,
      dataSourceApplyBtn: document.getElementById('dataSourceApplyBtn') as HTMLButtonElement,
      dataSourceCancelBtn: document.getElementById('dataSourceCancelBtn') as HTMLButtonElement,
    };
    const ui = new DataSourceUIController(elements, emitter);
    ui.init();

    ui.openModalForContext('chat');
    const modal = elements.dataSourceModal;
    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(spy).toHaveBeenCalledWith('modalOpened', { context: 'chat' });

    ui.closeModal();
    expect(modal.classList.contains('hidden')).toBe(true);
    expect(spy).toHaveBeenCalledWith('modalClosed', { context: 'chat' });
  });

  it('emits applyConfiguration with selected type and items', () => {
    const emitter = new DataSourceEventEmitter();
    const spy = vi.spyOn(emitter, 'emit');
    const elements = {
      dataSourceModal: document.getElementById('dataSourceModal') as HTMLElement,
      dataSourceModalClose: document.getElementById('dataSourceModalClose') as HTMLElement,
      dataSourceApplyBtn: document.getElementById('dataSourceApplyBtn') as HTMLButtonElement,
      dataSourceCancelBtn: document.getElementById('dataSourceCancelBtn') as HTMLButtonElement,
    };
    const ui = new DataSourceUIController(elements, emitter);
    ui.init();
    ui.openModalForContext('chat');

    const list = document.getElementById('dataSourceList') as HTMLElement;
    list.innerHTML = `
      <div class="data-source-item" data-source-id="s1">
        <input type="checkbox" value="s1" checked>
      </div>
      <div class="data-source-item" data-source-id="s2">
        <input type="checkbox" value="s2">
      </div>
    `;

    (document.getElementById('dataSourceApplyBtn') as HTMLButtonElement).click();

    expect(spy).toHaveBeenCalledWith('applyConfiguration', {
      type: 'markdown',
      selectedItemIds: ['s1'],
      context: 'chat',
    });
  });

  it('renders data source list with selection and updates status UIs', () => {
    const emitter = new DataSourceEventEmitter();
    const elements = {
      dataSourceModal: document.getElementById('dataSourceModal') as HTMLElement,
      dataSourceApplyBtn: document.getElementById('dataSourceApplyBtn') as HTMLButtonElement,
      dataSourceCancelBtn: document.getElementById('dataSourceCancelBtn') as HTMLButtonElement,
      dataSourceModalClose: document.getElementById('dataSourceModalClose') as HTMLElement,
    };
    const ui = new DataSourceUIController(elements, emitter);
    ui.init();
    const sources = makeSources();
    const config = new DataSourceConfig('markdown', [{ id: 's1' }]);
    config.isConfigured = true;

    // Update list and verify
    ui.updateDataSourceList(sources as any, config);
    const items = document.querySelectorAll<HTMLElement>('.data-source-item');
    expect(items.length).toBe(2);
    const first = items.item(0);
    expect(first && first.classList.contains('data-source-item--selected')).toBe(true);

    // Update chat and form filler status
    ui.updateChatUI(config);
    const chatText = document.getElementById('chatDataSourceText') as HTMLElement;
    expect(chatText.textContent).toBe('1 selected • Markdown');
    const chatBtn = document.getElementById('chatDataSourceBtn');
    expect(chatBtn?.classList.contains('simple-mode__data-source-btn--configured')).toBe(true);
    const chatIcon = document.getElementById('chatDataSourceIcon');
    expect(chatIcon?.textContent).toBe('✅');

    ui.updateFormFillerUI(config, sources);
    const simpleText = document.getElementById('simpleModeDataSourceText');
    expect(simpleText?.textContent).toBe('1 selected • Markdown');
    const simpleIcon = document.getElementById('simpleModeDataSourceIcon');
    expect(simpleIcon?.textContent).toBe('✅');
    const simpleBtn = document.getElementById('simpleModeDataSourceBtn');
    expect(simpleBtn?.classList.contains('simple-mode__data-source-btn--configured')).toBe(true);
    const advancedText = document.getElementById('advancedDataSourceText');
    expect(advancedText?.textContent).toBe('1 selected • Markdown');
    const advancedIcon = document.getElementById('advancedDataSourceIcon');
    expect(advancedIcon?.textContent).toBe('✅');
  });
});
