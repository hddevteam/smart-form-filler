import type { ModelItem } from '@/popup/apis/backend';
import { fetchOllamaModels } from '@/extension/modelDiscovery';

export interface ExtensionClientLike {
  getAvailableModels(): Promise<ModelItem[]>;
  refreshOllamaModels(): Promise<void>;
  // Content script actions
  detectForms(): Promise<unknown>;
  analyzeContent(): Promise<unknown>;
  fillForms(mappings: unknown): Promise<unknown>;
  sendAIRequest(
    options: import('@/background/services/ai/aiService').MakeRequestOptions
  ): Promise<import('@/types/ai').ChatResponse>;
}

// Simple client that calls background/page via chrome.runtime messages
export class ExtensionClient implements ExtensionClientLike {
  async getAvailableModels(): Promise<ModelItem[]> {
    return new Promise(resolve => {
      let settled = false;
      const tid = setTimeout(() => {
        if (!settled) {
          settled = true;
          // eslint-disable-next-line no-console
          console.warn('[ExtensionClient] getAvailableModels timed out, returning empty');
          // Fallback: try local Ollama discovery directly from side panel
          void fetchOllamaModels()
            .then(list => {
              console.debug(
                '[ExtensionClient] Fallback (timeout) local models count:',
                list.length
              );
              resolve(list as unknown as ModelItem[]);
            })
            .catch(() => resolve([]));
        }
      }, 5000);
      try {
        // eslint-disable-next-line no-console
        console.debug('[ExtensionClient] Sending getAvailableModels');
        chrome.runtime.sendMessage({ action: 'getAvailableModels' }, (resp: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(tid);
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            // eslint-disable-next-line no-console
            console.warn('[ExtensionClient] getAvailableModels lastError:', lastError.message);
            // Fallback on message error
            void fetchOllamaModels()
              .then(list => {
                console.debug(
                  '[ExtensionClient] Fallback (lastError) local models count:',
                  list.length
                );
                resolve(list as unknown as ModelItem[]);
              })
              .catch(() => resolve([]));
            return;
          }
          const payload = (resp as { success?: boolean; models?: ModelItem[] }) ?? {};
          const data = Array.isArray(payload.models) ? payload.models : [];
          // eslint-disable-next-line no-console
          console.debug('[ExtensionClient] getAvailableModels received count:', data.length);
          // If empty, attempt a soft fallback once
          if (data.length === 0) {
            void fetchOllamaModels()
              .then(list => {
                // eslint-disable-next-line no-console
                console.debug(
                  '[ExtensionClient] Fallback (empty) local models count:',
                  list.length
                );
                resolve(list as unknown as ModelItem[]);
              })
              .catch(() => resolve([]));
          } else {
            resolve(data);
          }
        });
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(tid);
          // eslint-disable-next-line no-console
          console.error('[ExtensionClient] getAvailableModels threw, trying local fallback');
          void fetchOllamaModels()
            .then(list => resolve(list as unknown as ModelItem[]))
            .catch(() => resolve([]));
        }
      }
    });
  }

  async refreshOllamaModels(): Promise<void> {
    return new Promise(resolve => {
      let settled = false;
      const tid = setTimeout(() => {
        if (!settled) {
          settled = true;
          // eslint-disable-next-line no-console
          console.warn('[ExtensionClient] refreshOllamaModels timed out');
          resolve();
        }
      }, 3000);
      try {
        // eslint-disable-next-line no-console
        console.debug('[ExtensionClient] Sending refreshOllamaModels');
        chrome.runtime.sendMessage({ action: 'refreshOllamaModels' }, () => {
          if (settled) return;
          settled = true;
          clearTimeout(tid);
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            // eslint-disable-next-line no-console
            console.warn('[ExtensionClient] refreshOllamaModels lastError:', lastError.message);
          }
          // eslint-disable-next-line no-console
          console.debug('[ExtensionClient] refreshOllamaModels ack received');
          resolve();
        });
      } catch {
        if (!settled) {
          settled = true;
          clearTimeout(tid);
          // eslint-disable-next-line no-console
          console.error('[ExtensionClient] refreshOllamaModels threw');
          resolve();
        }
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

  async sendAIRequest(
    options: import('@/background/services/ai/aiService').MakeRequestOptions
  ): Promise<import('@/types/ai').ChatResponse> {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'AI_REQUEST', options }, (resp: unknown) => {
          const payload =
            (resp as { success?: boolean; data?: import('@/types/ai').ChatResponse }) ?? {};
          if (payload && typeof payload === 'object' && 'success' in payload) {
            resolve(
              payload.success && payload.data
                ? payload.data
                : ({ model: 'error', choices: [] } as unknown as import('@/types/ai').ChatResponse)
            );
          } else {
            resolve(resp as import('@/types/ai').ChatResponse);
          }
        });
      } catch {
        resolve({ model: 'error', choices: [] } as unknown as import('@/types/ai').ChatResponse);
      }
    });
  }
}
export default ExtensionClient;
