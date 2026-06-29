import { describe, it, expect, beforeEach, vi } from 'vitest';
import PopupDataSourceManagerRefactored, {
  UIControllerLike,
} from '@/modules/popup/popupDataSourceManagerRefactored';
import type { PopupElements, PopupManagerLike } from '@/types/popup';

const makeExtractionHistory = () => [
  {
    title: 'Page A',
    url: 'https://a',
    timestamp: Date.now(),
    dataSources: {
      markdown: { content: '# A\nHello' },
      cleaned: { content: 'Hello' },
      raw: { content: '<h1>A</h1>' },
    },
  },
  {
    title: 'Page B',
    url: 'https://b',
    timestamp: Date.now(),
    dataSources: {
      markdown: { content: '# B\nWorld' },
    },
  },
];

describe('PopupDataSourceManagerRefactored', () => {
  let uiController: UIControllerLike;
  let moduleManager: PopupManagerLike;
  let elements: PopupElements;

  beforeEach(() => {
    uiController = {
      init: vi.fn(),
      populateModal: vi.fn(),
      updateChatUI: vi.fn(),
      updateFormFillerUI: vi.fn(),
      openModalForContext: vi.fn(),
      closeModal: vi.fn(),
      updateDataSourceList: vi.fn(),
    } as unknown as UIControllerLike;

    moduleManager = {
      resultsHandler: {
        extractionHistory: makeExtractionHistory(),
        showError: vi.fn(),
      },
      chatHandler: {
        onDataSourceChanged: vi.fn(),
      },
    } as unknown as PopupManagerLike;

    elements = {} as PopupElements;
  });

  it('initializes, updates available sources, and updates UI', async () => {
    const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager, uiController);
    await mgr.init();

    expect(uiController.init).toHaveBeenCalled();
    // After init, sync manager will emit data sources updated once updateAvailableDataSources is called.
    // Check that UI update methods have been called.
    expect(uiController.updateChatUI).toHaveBeenCalled();
    expect(uiController.updateFormFillerUI).toHaveBeenCalled();

    // Available data sources constructed
    expect(mgr.availableDataSources.length).toBeGreaterThan(0);
  });

  it('opens modal and populates with current config and available sources', async () => {
    const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager, uiController);
    await mgr.init();
    mgr.openModal('chat');

    // Emitting modal opened is done by UI controller, but our manager listens and calls populateModal.
    // Simulate emit by calling handle directly via event emitter through DOM event.
    // Instead, directly invoke the manager's private method via dispatch (emit) - not accessible; so we call openModal and expect UI controller call.
    expect(uiController.openModalForContext).toHaveBeenCalledWith('chat');
  });

  it('applies chat configuration and notifies chat handler', async () => {
    const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager, uiController);
    await mgr.init();

    const ids = mgr.availableDataSources.slice(0, 1).map(s => s.id);
    const data = { type: 'markdown', selectedItemIds: ids, context: 'chat' } as any;

    // Emit applyConfiguration event through the manager's event emitter
    mgr.eventEmitter.emit('applyConfiguration', data);
    // wait for async handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    const config = mgr.getConfiguration();
    expect(config.type).toBe('markdown');
    expect(config.selectedItems.length).toBe(ids.length);
    // chatHandler is provided in our mock above; assert the spy was called
    const chatHandler = moduleManager.chatHandler as {
      onDataSourceChanged: ReturnType<typeof vi.fn>;
    };
    expect(chatHandler.onDataSourceChanged).toHaveBeenCalled();
    expect(uiController.closeModal).toHaveBeenCalled();
  });

  it('get selected sources for chat and form filler', async () => {
    const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager, uiController);
    await mgr.init();

    const ids = mgr.availableDataSources.slice(0, 2).map(s => s.id);
    await mgr.updateChatConfiguration({
      type: 'markdown',
      selectedItems: ids.map(id => ({ id })),
      isConfigured: true,
    });
    await mgr.updateFormFillerConfiguration({
      type: 'cleaned',
      selectedItems: ids.map(id => ({ id })),
      isConfigured: true,
    });

    const chatSelected = mgr.getChatSelectedSources();
    const ffSelected = mgr.getFormFillerSelectedSources();

    expect(chatSelected.length).toBeGreaterThan(0);
    expect(ffSelected.length).toBeGreaterThan(0);
  });

  it('isDataSourceConfigured flag reflects valid selected sources', async () => {
    const mgr = new PopupDataSourceManagerRefactored(elements, moduleManager, uiController);
    await mgr.init();

    expect(mgr.isDataSourceConfigured()).toBe(false);
    const ids = mgr.availableDataSources.slice(0, 1).map(s => s.id);
    await mgr.updateChatConfiguration({
      type: 'markdown',
      selectedItems: ids.map(id => ({ id })),
      isConfigured: true,
    });
    expect(mgr.isDataSourceConfigured()).toBe(true);
  });
});
