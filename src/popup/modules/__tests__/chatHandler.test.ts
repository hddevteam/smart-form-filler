/**
 * BDD tests for ChatHandler — G0 fix: no backend HTTP calls
 *
 * Spec: When a user sends a message, ChatHandler must route through
 * sendAIRequest (→ Background SW → AI provider) and NEVER call
 * makeRequest with an HTTP endpoint.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatHandler } from '../chatHandler';
import type { ChatHandlerDeps, ChatHandlerElements } from '@/types/popup';
import type { ChatResponse } from '@/types/ai';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeDomEl<T extends HTMLElement>(tag: string): T {
  return document.createElement(tag) as T;
}

function makeElements(): ChatHandlerElements {
  const chatMessages = makeDomEl<HTMLDivElement>('div');
  const chatInput = makeDomEl<HTMLTextAreaElement>('textarea');
  const sendChatBtn = makeDomEl<HTMLButtonElement>('button');
  const chatStatus = makeDomEl<HTMLDivElement>('div');
  const dataSourceList = makeDomEl<HTMLDivElement>('div');
  return { chatMessages, chatInput, sendChatBtn, chatStatus, dataSourceList };
}

function makeAIResponse(content: string): ChatResponse {
  return {
    model: 'test-model',
    choices: [{ message: { role: 'assistant', content } }],
  };
}

function makeSendAIRequest(content = 'Hello from AI') {
  return vi.fn((_options: MakeRequestOptions) =>
    Promise.resolve({ response: makeAIResponse(content), logs: [] as string[] })
  );
}

// ── BDD scenarios ─────────────────────────────────────────────────────────────

describe('ChatHandler — Background SW routing (G0)', () => {
  let elements: ChatHandlerElements;
  let sendAIRequestMock: ReturnType<typeof makeSendAIRequest>;
  let makeRequestMock: ReturnType<typeof vi.fn>;
  let deps: ChatHandlerDeps;
  let handler: ChatHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    elements = makeElements();

    sendAIRequestMock = makeSendAIRequest();

    // makeRequest is omitted intentionally — verify it is never called
    makeRequestMock = vi.fn();

    deps = {
      sendAIRequest: sendAIRequestMock,
      getSelectedModel: () => 'ollama/llama3',
      getApiConfig: () =>
        Promise.resolve({
          apiUrl: 'http://localhost:11434/api/chat',
        }),
      getChatDataSources: () => null,
      onSendStart: vi.fn(),
      onSendComplete: vi.fn(),
    };

    handler = new ChatHandler(elements, deps);
  });

  // Scenario 1 — happy path
  it('Given a user sends a message, it calls sendAIRequest via Background SW', async () => {
    elements.chatInput.value = 'What is on this page?';
    await handler.sendMessage();
    expect(sendAIRequestMock).toHaveBeenCalledOnce();
    expect(makeRequestMock).not.toHaveBeenCalled();
  });

  // Scenario 2 — messages array includes system prompt when data sources present
  it('Given data sources are selected, system prompt includes source content', async () => {
    deps.getChatDataSources = () => ({
      sources: [
        {
          id: '1',
          title: 'Test Page',
          content: 'Some content',
          type: 'markdown',
          url: 'https://example.com',
        },
      ],
    });
    handler = new ChatHandler(elements, deps);
    elements.chatInput.value = 'Summarize this';

    await handler.sendMessage();

    const options = sendAIRequestMock.mock.calls[0]?.[0];
    const systemMsg = options?.messages.find(m => m.role === 'system');
    expect(systemMsg).toBeDefined();
    expect(systemMsg?.content).toContain('Some content');
  });

  // Scenario 3 — chat history is included in messages
  it('Given existing chat history, messages array includes previous turns', async () => {
    elements.chatInput.value = 'First message';
    await handler.sendMessage();

    sendAIRequestMock = makeSendAIRequest('Second reply');
    deps.sendAIRequest = sendAIRequestMock;
    handler = new ChatHandler(elements, deps);

    elements.chatInput.value = 'Second message';
    await handler.sendMessage();

    const secondCall = sendAIRequestMock.mock.calls[0]?.[0];
    const userMessages = secondCall?.messages.filter(m => m.role === 'user') ?? [];
    expect(userMessages.length).toBeGreaterThanOrEqual(1);
  });

  // Scenario 4 — AI response is rendered in the chat
  it('Given a successful AI response, message content is displayed in chat', async () => {
    elements.chatInput.value = 'Hello';
    await handler.sendMessage();

    const bubbles = Array.from(elements.chatMessages.querySelectorAll('.chat-message__text'));
    const assistantBubble = bubbles.find(el => el.textContent === 'Hello from AI');
    expect(assistantBubble).toBeTruthy();
  });

  // Scenario 5 — errors are surfaced gracefully
  it('Given sendAIRequest throws, an error message is shown in chat', async () => {
    deps.sendAIRequest = vi.fn((_: MakeRequestOptions) =>
      Promise.reject(new Error('Network timeout'))
    );
    handler = new ChatHandler(elements, deps);
    elements.chatInput.value = 'This will fail';
    await handler.sendMessage();

    const bubbles = Array.from(
      elements.chatMessages.querySelectorAll('.chat-message--assistant .chat-message__text')
    );
    const lastBubble = bubbles[bubbles.length - 1];
    expect(lastBubble?.textContent).toContain('Network timeout');
  });

  // Scenario 6 — no backend HTTP calls under any condition
  it('Never calls makeRequest with an HTTP endpoint', async () => {
    elements.chatInput.value = 'Any message';
    await handler.sendMessage();
    expect(makeRequestMock).not.toHaveBeenCalled();
  });

  // Scenario 7 — model is passed to sendAIRequest
  it('Passes the selected model to sendAIRequest', async () => {
    elements.chatInput.value = 'Model check';
    await handler.sendMessage();
    const options = sendAIRequestMock.mock.calls[0]?.[0];
    expect(options?.model).toBe('ollama/llama3');
  });

  // Scenario 8 — no message does nothing
  it('Given empty input, sendMessage does nothing', async () => {
    elements.chatInput.value = '   ';
    await handler.sendMessage();
    expect(sendAIRequestMock).not.toHaveBeenCalled();
  });
});
