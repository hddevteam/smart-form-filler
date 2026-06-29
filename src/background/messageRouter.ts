export type MessageHandler = (
  request: unknown,
  sender: chrome.runtime.MessageSender
) => Promise<unknown>;

export class MessageRouter {
  private handlers = new Map<string, MessageHandler>();

  register(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }

  async handle(request: unknown, sender: chrome.runtime.MessageSender) {
    const msgType = getMessageType(request);
    const handler = msgType ? this.handlers.get(msgType) : undefined;
    if (!handler) {
      throw new Error(`No handler for message type: ${msgType ?? 'unknown'}`);
    }
    return await handler(request, sender);
  }
}

function getMessageType(request: unknown): string | undefined {
  if (request && typeof request === 'object' && 'type' in request) {
    const t = (request as { type?: unknown }).type;
    return typeof t === 'string' ? t : undefined;
  }
  return undefined;
}
