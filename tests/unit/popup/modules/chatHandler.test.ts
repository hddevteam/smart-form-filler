import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatHandler } from '@/popup/modules/chatHandler';

describe('ChatHandler', () => {
  const createElements = () => {
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chatMessages';
    const chatInput = document.createElement('textarea');
    chatInput.id = 'chatInput';
    const sendChatBtn = document.createElement('button');
    sendChatBtn.id = 'sendChatBtn';
    sendChatBtn.disabled = true;
    const dataSourceList = document.createElement('div');
    dataSourceList.id = 'chatDataSourceList';
    const chatStatus = document.createElement('div');
    chatStatus.id = 'chatStatus';

    document.body.appendChild(chatMessages);
    document.body.appendChild(chatInput);
    document.body.appendChild(sendChatBtn);
    document.body.appendChild(dataSourceList);
    document.body.appendChild(chatStatus);

    return {
      chatMessages,
      chatInput,
      sendChatBtn,
      dataSourceList,
      chatStatus,
    } satisfies Parameters<typeof ChatHandler>[0];
  };

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('enables send button when model and message provided', () => {
    const elements = createElements();
    const apiClient = { makeRequest: vi.fn() };
    const handler = new ChatHandler(elements, {
      apiClient,
      getSelectedModel: () => 'gpt-4o',
    });

    expect(elements.sendChatBtn.disabled).toBe(true);
    elements.chatInput.value = 'Hello there';
    handler.updateSendButtonState();
    expect(elements.sendChatBtn.disabled).toBe(false);

    handler.setLoading(true);
    handler.updateSendButtonState();
    expect(elements.sendChatBtn.disabled).toBe(true);
  });

  it('renders extraction history into selectable list', () => {
    const elements = createElements();
    const handler = new ChatHandler(elements, {
      apiClient: { makeRequest: vi.fn() },
      getSelectedModel: () => null,
    });

    handler.setExtractionHistory([
      { id: 'item-1', title: 'Sample Page', url: 'https://example.com/page' },
    ]);

    const checkbox = elements.dataSourceList.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox?.value).toBe('item-1');
  });

  it('sends message and appends assistant response when request succeeds', async () => {
    const elements = createElements();
    const makeRequest = vi.fn((_endpoint: string, init?: RequestInit) =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, response: 'Hello from AI' }),
        body: init?.body,
      } as unknown as Response)
    );
    const handler = new ChatHandler(elements, {
      apiClient: { makeRequest },
      getSelectedModel: () => 'gpt-4o',
      getChatDataSources: () => ({
        type: 'markdown',
        sources: [
          { id: 'item-1', title: 'Sample', url: 'https://example.com', content: '# Sample' },
        ],
      }),
    });

    elements.chatInput.value = 'Hi AI';
    await handler.sendMessage();

    expect(makeRequest).toHaveBeenCalledTimes(1);
    const payload = JSON.parse((makeRequest.mock.calls[0]?.[1]?.body as string) ?? '{}');
    expect(payload).toMatchObject({
      message: 'Hi AI',
      model: 'gpt-4o',
    });
    expect(Array.isArray(payload.dataSources)).toBe(true);

    const messages = elements.chatMessages.querySelectorAll('.chat-message');
    expect(messages.length).toBe(2);
    expect(messages[0]?.textContent).toContain('Hi AI');
    expect(messages[1]?.textContent).toContain('Hello from AI');
    expect(elements.sendChatBtn.disabled).toBe(true);
  });

  it('shows error message when request fails', async () => {
    const elements = createElements();
    const handler = new ChatHandler(elements, {
      apiClient: {
        makeRequest: vi.fn(() =>
          Promise.resolve({
            json: () => Promise.resolve({ success: false, error: 'Service unavailable' }),
          } as unknown as Response)
        ),
      },
      getSelectedModel: () => 'gpt-4o',
    });

    elements.chatInput.value = 'Test message';
    await handler.sendMessage();

    const messages = elements.chatMessages.querySelectorAll('.chat-message');
    expect(messages.length).toBe(2);
    expect(messages[1]?.textContent).toContain('Service unavailable');
  });
});
