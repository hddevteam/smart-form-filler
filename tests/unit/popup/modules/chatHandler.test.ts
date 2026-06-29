import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatHandler } from '@/popup/modules/chatHandler';
import type { ChatResponse } from '@/types/ai';

function makeAIResponse(content: string): ChatResponse {
  return { model: 'test', choices: [{ message: { role: 'assistant', content } }] };
}

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
    const handler = new ChatHandler(elements, {
      sendAIRequest: vi.fn().mockResolvedValue({ response: makeAIResponse(''), logs: [] }),
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
      sendAIRequest: vi.fn().mockResolvedValue({ response: makeAIResponse(''), logs: [] }),
      getSelectedModel: () => null,
    });

    handler.setExtractionHistory([
      { id: 'item-1', title: 'Sample Page', url: 'https://example.com/page' },
    ]);

    const checkbox = elements.dataSourceList.querySelector('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox?.value).toBe('item-1');
  });

  it('sends message via sendAIRequest and appends assistant response', async () => {
    const elements = createElements();
    const sendAIRequest = vi.fn().mockResolvedValue({
      response: makeAIResponse('Hello from AI'),
      logs: [],
    });
    const handler = new ChatHandler(elements, {
      sendAIRequest,
      getSelectedModel: () => 'gpt-4o',
      getChatDataSources: () => ({
        sources: [
          { id: 'item-1', title: 'Sample', url: 'https://example.com', content: '# Sample' },
        ],
      }),
    });

    elements.chatInput.value = 'Hi AI';
    await handler.sendMessage();

    expect(sendAIRequest).toHaveBeenCalledOnce();
    const options = sendAIRequest.mock.calls[0][0];
    expect(options.model).toBe('gpt-4o');
    expect(Array.isArray(options.messages)).toBe(true);

    const messages = elements.chatMessages.querySelectorAll('.chat-message');
    expect(messages.length).toBe(2);
    expect(messages[0]?.textContent).toContain('Hi AI');
    expect(messages[1]?.textContent).toContain('Hello from AI');
    expect(elements.sendChatBtn.disabled).toBe(true);
  });

  it('shows error message when sendAIRequest fails', async () => {
    const elements = createElements();
    const handler = new ChatHandler(elements, {
      sendAIRequest: vi.fn().mockRejectedValue(new Error('Service unavailable')),
      getSelectedModel: () => 'gpt-4o',
    });

    elements.chatInput.value = 'Test message';
    await handler.sendMessage();

    const messages = elements.chatMessages.querySelectorAll('.chat-message');
    expect(messages.length).toBe(2);
    expect(messages[1]?.textContent).toContain('Service unavailable');
  });
});
