import type { ModelItem } from '@/popup/apis/backend';

export type ConnectionResult = { success: boolean; error?: string };

export interface ExtensionClientLike {
  setBackendUrl(url: string): void;
  testConnection(): Promise<ConnectionResult>;
  getAvailableModels(): Promise<ModelItem[]>;
  refreshOllamaModels(): Promise<void>;
  // Content script actions
  detectForms(): Promise<unknown>;
  analyzeContent(): Promise<unknown>;
  fillForms(mappings: unknown): Promise<unknown>;
}

// Simple client that calls background/page via chrome.runtime messages
export class ExtensionClient implements ExtensionClientLike {
  private backendUrl: string | null = null;

  setBackendUrl(url: string): void {
    this.backendUrl = url;
  }

  async testConnection(): Promise<ConnectionResult> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage(
          { action: 'testBackendConnection', baseUrl: this.backendUrl },
          (resp: unknown) => {
            const data = (resp as ConnectionResult) || { success: false, error: 'no response' };
            resolve(data);
          }
        );
      } catch {
        resolve({ success: false, error: 'runtime error' });
      }
    });
  }
  async getAvailableModels(): Promise<ModelItem[]> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ action: 'getAvailableModels' }, (resp: unknown) => {
          const data = Array.isArray(resp) ? (resp as ModelItem[]) : [];
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
