import type { ChatHandlerElements, ChatHandlerDeps, ChatDataSourceSelection } from '@/types/popup';
import type { ChatMessage } from '@/types/ai';

interface ExtractionHistoryItem {
  id: string;
  title: string;
  url?: string;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Provide accurate, helpful, and well-structured responses. Use markdown formatting when appropriate.';

function buildSystemPrompt(sources: ChatDataSourceSelection['sources']): string {
  if (!sources || sources.length === 0) return DEFAULT_SYSTEM_PROMPT;

  const contextParts = sources.map((src, i) => {
    return `Data Source ${i + 1} (${src.type ?? 'text'}):\nTitle: ${src.title}\nURL: ${src.url ?? 'N/A'}\nContent:\n${src.content}\n---`;
  });

  return `You are a helpful AI assistant that answers questions based on provided data sources.

You have access to the following data sources:
${contextParts.join('\n\n')}

Instructions:
- Answer questions based only on the information provided in the data sources above
- If information is not available in the data sources, clearly state that
- Cite which data source(s) you are referencing when possible
- Be concise but comprehensive
- Format your response clearly with appropriate markdown formatting`;
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
      // Resolve API config (url + key) for the selected model
      const apiConfig = this.deps.getApiConfig
        ? await this.deps.getApiConfig()
        : { apiUrl: 'http://localhost:11434/api/chat', apiKey: undefined };

      // Build messages: system prompt + history + current user message
      const dataSources = this.getChatDataSources()?.sources ?? [];
      const systemContent = buildSystemPrompt(dataSources);

      const messages: ChatMessage[] = [
        { role: 'system', content: systemContent },
        ...historyForPayload,
        { role: 'user', content: message },
      ];

      // Route through Background SW — never call the backend HTTP server
      const requestOptions = apiConfig.apiKey
        ? { apiUrl: apiConfig.apiUrl, apiKey: apiConfig.apiKey, model, messages }
        : { apiUrl: apiConfig.apiUrl, model, messages };
      const { response } = await this.deps.sendAIRequest(requestOptions);

      const content = response?.choices?.[0]?.message?.content ?? '';
      this.setMessageContent(assistantMessage, content || '(empty response)');
      this.chatHistory.push({ role: 'assistant', content });
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
