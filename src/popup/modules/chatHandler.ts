import type { ChatHandlerElements, ChatHandlerDeps, ChatDataSourceSelection } from '@/types/popup';

interface ExtractionHistoryItem {
  id: string;
  title: string;
  url?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatHandler {
  private readonly elements: ChatHandlerElements;
  private readonly deps: ChatHandlerDeps;
  private extractionHistory: ExtractionHistoryItem[] = [];
  private readonly selectedSourceIds = new Set<string>();
  private chatHistory: ChatMessage[] = [];
  private isLoading = false;

  constructor(elements: ChatHandlerElements, deps: ChatHandlerDeps) {
    this.elements = elements;
    this.deps = deps;

    this.elements.chatInput.addEventListener('input', () => this.updateSendButtonState());
  }

  setExtractionHistory(items: ExtractionHistoryItem[]): void {
    this.extractionHistory = [...items];
    this.renderDataSourceList();
  }

  updateDataSourceList(): void {
    this.renderDataSourceList();
  }

  onDataSourceChanged(_config: unknown): void {
    this.updateSendButtonState();
  }

  updateSendButtonState(): void {
    const hasModel = !!this.deps.getSelectedModel();
    const hasMessage = this.elements.chatInput.value.trim().length > 0;
    const shouldEnable = hasModel && hasMessage && !this.isLoading;
    this.elements.sendChatBtn.disabled = !shouldEnable;

    if (this.elements.chatStatus) {
      if (!hasModel) {
        this.elements.chatStatus.textContent = 'Select a model to chat.';
      } else if (!hasMessage) {
        this.elements.chatStatus.textContent = 'Enter a message to send.';
      } else if (this.isLoading) {
        this.elements.chatStatus.textContent = 'Sending...';
      } else {
        this.elements.chatStatus.textContent = '';
      }
    }
  }

  setLoading(value: boolean): void {
    this.isLoading = value;
    this.updateSendButtonState();
  }

  async sendMessage(): Promise<void> {
    if (this.isLoading) return;

    const message = this.elements.chatInput.value.trim();
    if (!message) return;

    const model = this.deps.getSelectedModel();
    if (!model) {
      this.showError('❌ Service unavailable. Please select a model.');
      return;
    }

    const historyForPayload = this.chatHistory.slice(-10);
    this.chatHistory.push({ role: 'user', content: message });
    this.addMessage('user', message);

    this.elements.chatInput.value = '';
    this.updateSendButtonState();

    this.deps.onSendStart?.();
    this.setLoading(true);

    const assistantMessage = this.addMessage('assistant', '...');

    try {
      const payload = {
        message,
        model,
        dataSources: this.getChatDataSources()?.sources ?? [],
        chatHistory: historyForPayload,
      };

      const response = await this.deps.apiClient.makeRequest('/extension/chat-with-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result?.success) {
        const content = typeof result.response === 'string' ? result.response : '';
        this.setMessageContent(assistantMessage, content || '');
        this.chatHistory.push({ role: 'assistant', content });
      } else {
        const errorMessage = (result && result.error) || '❌ Failed to get response from AI.';
        this.setMessageContent(assistantMessage, errorMessage);
      }
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.setMessageContent(assistantMessage, `❌ ${messageText}`);
    } finally {
      this.setLoading(false);
      this.deps.onSendComplete?.();
    }
  }

  addMessage(role: 'user' | 'assistant', content: string): HTMLElement {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message chat-message--${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'chat-message__text';
    bubble.textContent = content;
    messageEl.appendChild(bubble);

    this.elements.chatMessages.appendChild(messageEl);
    return messageEl;
  }

  showError(message: string): void {
    this.addMessage('assistant', message);
  }

  private renderDataSourceList(): void {
    const list = this.elements.dataSourceList;
    if (!list) return;

    list.innerHTML = '';

    if (this.extractionHistory.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-data-source-empty';
      empty.textContent = 'No data sources available yet.';
      list.appendChild(empty);
      return;
    }

    this.extractionHistory.forEach(item => {
      const wrapper = document.createElement('label');
      wrapper.className = 'chat-data-source-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = item.id;
      checkbox.checked = this.selectedSourceIds.has(item.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) this.selectedSourceIds.add(item.id);
        else this.selectedSourceIds.delete(item.id);
      });

      const info = document.createElement('span');
      info.className = 'chat-data-source-item__info';
      info.textContent = item.title || 'Untitled source';

      wrapper.appendChild(checkbox);
      wrapper.appendChild(info);
      list.appendChild(wrapper);
    });
  }

  private setMessageContent(messageEl: HTMLElement, content: string): void {
    const text = messageEl.querySelector('.chat-message__text');
    if (text) {
      text.textContent = content;
    } else {
      messageEl.textContent = content;
    }
  }

  private getChatDataSources(): ChatDataSourceSelection | null | undefined {
    return this.deps.getChatDataSources?.();
  }
}

export default ChatHandler;
