import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { MainTabController } from '@/popup/modules/mainTabController';

describe('MainTabController', () => {
  let extractionTabBtn: HTMLButtonElement;
  let chatTabBtn: HTMLButtonElement;
  let formTabBtn: HTMLButtonElement;
  let extractionContent: HTMLElement;
  let chatContent: HTMLElement;
  let formContent: HTMLElement;
  let statusLabel: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="tab-row">
        <button id="tab-extraction" class="main-tab main-tab--active" data-tab="extraction">Extract</button>
        <button id="tab-chat" class="main-tab" data-tab="chat">Chat</button>
        <button id="tab-form" class="main-tab" data-tab="formfiller">Form</button>
      </div>
      <section id="extractionTab" class="main-tab-content main-tab-content--active"></section>
      <section id="chatTab" class="main-tab-content"></section>
      <section id="formFillerTab" class="main-tab-content"></section>
      <footer id="selectedMode"></footer>
    `;

    extractionTabBtn = document.getElementById('tab-extraction') as HTMLButtonElement;
    chatTabBtn = document.getElementById('tab-chat') as HTMLButtonElement;
    formTabBtn = document.getElementById('tab-form') as HTMLButtonElement;
    extractionContent = document.getElementById('extractionTab') as HTMLElement;
    chatContent = document.getElementById('chatTab') as HTMLElement;
    formContent = document.getElementById('formFillerTab') as HTMLElement;
    statusLabel = document.getElementById('selectedMode') as HTMLElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('initialises active tab from markup and updates status label', () => {
    const controller = new MainTabController({
      tabButtons: [extractionTabBtn, chatTabBtn, formTabBtn],
      tabContents: {
        extraction: extractionContent,
        chat: chatContent,
        formfiller: formContent,
      },
      statusLabel,
    });

    controller.init();

    expect(controller.getActiveTab()).toBe('extraction');
    expect(extractionTabBtn.classList.contains('main-tab--active')).toBe(true);
    expect(extractionContent.classList.contains('main-tab-content--active')).toBe(true);
    expect(statusLabel.textContent).toContain('Data Extraction');
  });

  it('switches to requested tab and dispatches detail event', () => {
    const onChange = vi.fn();
    const controller = new MainTabController({
      tabButtons: [extractionTabBtn, chatTabBtn, formTabBtn],
      tabContents: {
        extraction: extractionContent,
        chat: chatContent,
        formfiller: formContent,
      },
      statusLabel,
      onTabChanged: onChange,
    });
    controller.init();

    const eventSpy = vi.fn();
    document.addEventListener('popup:main-tab-changed', eventSpy as EventListener);

    controller.switchTab('chat');

    expect(controller.getActiveTab()).toBe('chat');
    expect(chatTabBtn.classList.contains('main-tab--active')).toBe(true);
    expect(chatContent.classList.contains('main-tab-content--active')).toBe(true);
    expect(extractionContent.classList.contains('main-tab-content--active')).toBe(false);
    expect(statusLabel.textContent).toContain('Chat with Data');
    expect(onChange).toHaveBeenCalledWith('chat');
    expect(eventSpy).toHaveBeenCalledTimes(1);
    const rawEvent = eventSpy.mock.calls[0]?.[0] as Event | undefined;
    expect(rawEvent).toBeInstanceOf(CustomEvent);
    const event = rawEvent as CustomEvent | undefined;
    expect(event?.detail).toEqual({ tab: 'chat' });

    document.removeEventListener('popup:main-tab-changed', eventSpy as EventListener);
  });

  it('binds click handlers to tab buttons', () => {
    const controller = new MainTabController({
      tabButtons: [extractionTabBtn, chatTabBtn, formTabBtn],
      tabContents: {
        extraction: extractionContent,
        chat: chatContent,
        formfiller: formContent,
      },
      statusLabel,
    });
    controller.init();

    chatTabBtn.click();
    expect(controller.getActiveTab()).toBe('chat');

    formTabBtn.click();
    expect(controller.getActiveTab()).toBe('formfiller');
    expect(statusLabel.textContent).toContain('Form Filler');
  });
});
