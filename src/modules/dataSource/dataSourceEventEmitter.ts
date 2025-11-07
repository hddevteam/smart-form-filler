/**
 * Data Source Event Emitter
 */
export class DataSourceEventEmitter {
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  static get EVENTS() {
    return {
      CHAT_CONFIG_CHANGED: 'chatConfigChanged',
      FORM_FILLER_CONFIG_CHANGED: 'formFillerConfigChanged',
      DATA_SOURCES_UPDATED: 'dataSourcesUpdated',
      CONFIGURATION_APPLIED: 'configurationApplied',
      MODAL_OPENED: 'modalOpened',
      MODAL_CLOSED: 'modalClosed',
    } as const;
  }

  on(eventType: string, listener: (data: unknown) => void): void {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, []);
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: string, listener: (data: unknown) => void): void {
    if (!this.listeners.has(eventType)) return;
    const arr = this.listeners.get(eventType)!;
    const idx = arr.indexOf(listener);
    if (idx > -1) arr.splice(idx, 1);
  }

  emit(eventType: string, data: unknown = null): void {
    const arr = this.listeners.get(eventType);
    if (arr) {
      for (const fn of arr) {
        try {
          fn(data);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(`[DataSourceEventEmitter] Error in listener for ${eventType}:`, err);
        }
      }
    }
    this.dispatchDOMEvent(eventType, data);
  }

  private dispatchDOMEvent(eventType: string, data: unknown): void {
    try {
      const event = new CustomEvent(eventType, { detail: data, bubbles: true });
      document.dispatchEvent(event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[DataSourceEventEmitter] Error dispatching DOM event for ${eventType}:`, err);
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) this.listeners.delete(eventType);
    else this.listeners.clear();
  }

  getListenerCount(eventType: string): number {
    return this.listeners.has(eventType) ? this.listeners.get(eventType)!.length : 0;
  }

  hasListeners(eventType: string): boolean {
    return this.getListenerCount(eventType) > 0;
  }
}
