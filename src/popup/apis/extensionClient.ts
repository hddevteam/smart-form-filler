import type { ModelItem } from '@/popup/apis/backend';

export interface ExtensionClientLike {
  getAvailableModels(): Promise<ModelItem[]>;
  refreshOllamaModels(): Promise<void>;
  // Content script actions
  detectForms(): Promise<unknown>;
  analyzeContent(): Promise<unknown>;
  fillForms(mappings: unknown): Promise<unknown>;
}

// Simple client that calls background/page via chrome.runtime messages
export class ExtensionClient implements ExtensionClientLike {
  async getAvailableModels(): Promise<ModelItem[]> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action: 'getAvailableModels' }, (resp: unknown) => {
          const payload = (resp as { success?: boolean; models?: ModelItem[] }) ?? {};
          const data = Array.isArray(payload.models) ? payload.models : [];
          resolve(data);
        });
      } catch {
        resolve([]);
      }
    });
  }

  async refreshOllamaModels(): Promise<void> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action: 'refreshOllamaModels' }, () => resolve());
      } catch {
        resolve();
      }
    });
  }

  async detectForms(): Promise<unknown> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action: 'detectForms' }, (resp: unknown) => resolve(resp));
      } catch {
        resolve({ success: false, error: 'runtime error' });
      }
    });
  }

  async analyzeContent(): Promise<unknown> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action: 'extractContentWithIframes' }, (resp: unknown) =>
          resolve(resp)
        );
      } catch {
        resolve({ success: false, error: 'runtime error' });
      }
    });
  }

  async fillForms(mappings: unknown): Promise<unknown> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action: 'fillForms', mappings }, (resp: unknown) =>
          resolve(resp)
        );
      } catch {
        resolve({ success: false, error: 'runtime error' });
      }
    });
  }
}
export default ExtensionClient;
