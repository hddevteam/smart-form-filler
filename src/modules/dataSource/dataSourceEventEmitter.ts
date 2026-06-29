/**
 * Data Source Event Emitter
 */
import { Logger } from '@/utils/logger';
export class DataSourceEventEmitter {
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();
  private logger = Logger.forScope('DataSourceEventEmitter');

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
    let arr = this.listeners.get(eventType);
    if (!arr) {
      arr = [];
      this.listeners.set(eventType, arr);
    }
    arr.push(listener);
  }

  off(eventType: string, listener: (data: unknown) => void): void {
    const arr = this.listeners.get(eventType);
    if (!arr) return;
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
          this.logger.error(`Error in listener for ${eventType}:`, err);
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
      this.logger.error(`Error dispatching DOM event for ${eventType}:`, err);
    }
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) this.listeners.delete(eventType);
    else this.listeners.clear();
  }

  getListenerCount(eventType: string): number {
    const arr = this.listeners.get(eventType);
    return arr ? arr.length : 0;
  }

  hasListeners(eventType: string): boolean {
    return this.getListenerCount(eventType) > 0;
  }
}
