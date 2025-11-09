import type { ModelItem } from '@/popup/apis/backend';
import { fetchOllamaModels } from '@/extension/modelDiscovery';

export interface ExtensionClientLike {
  getAvailableModels(): Promise<ModelItem[]>;
  refreshOllamaModels(): Promise<void>;
  // Content script actions
  detectForms(): Promise<unknown>;
  analyzeContent(): Promise<unknown>;
  fillForms(mappings: unknown): Promise<unknown>;
  sendAIRequest(options: import('@/background/services/ai/aiService').MakeRequestOptions): Promise<{
    response: import('@/types/ai').ChatResponse;
    logs: string[];
  }>;
}

// Simple client that calls background/page via chrome.runtime messages
export class ExtensionClient implements ExtensionClientLike {
  async getAvailableModels(): Promise<ModelItem[]> {
    return new Promise(resolve => {
      let settled = false;
      const tid = setTimeout(() => {
        if (!settled) {
          settled = true;
          // Remove verbose warn after stabilization
          // Fallback: try local Ollama discovery directly from side panel
          void fetchOllamaModels()
            .then(list => {
              // eslint-disable-next-line no-console
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
        // Remove verbose debug after stabilization
        chrome.runtime.sendMessage({ action: 'getAvailableModels' }, (resp: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(tid);
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            // Swallow lastError without noisy logging
            // Fallback on message error
            void fetchOllamaModels()
              .then(list => {
                // eslint-disable-next-line no-console
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
          // Silent after stabilization
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
          // Silent after stabilization
          resolve();
        }
      }, 3000);
      try {
        // Silent after stabilization
        chrome.runtime.sendMessage({ action: 'refreshOllamaModels' }, () => {
          if (settled) return;
          settled = true;
          clearTimeout(tid);
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            // Silent after stabilization
          }
          // Silent after stabilization
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
  ): Promise<{
    response: import('@/types/ai').ChatResponse;
    logs: string[];
  }> {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action: 'AI_REQUEST', options }, (resp: unknown) => {
          const payload =
            (resp as {
              success?: boolean;
              data?: import('@/types/ai').ChatResponse;
              error?: string;
              logs?: string[];
            }) ?? {};
          if (payload && typeof payload === 'object' && 'success' in payload) {
            if (payload.success && payload.data) {
              resolve({ response: payload.data, logs: payload.logs ?? [] });
            } else {
              const error = new Error(payload.error || 'AI request failed') as Error & {
                logs?: string[];
              };
              error.logs = payload.logs ?? [];
              reject(error);
            }
          } else {
            resolve({ response: resp as import('@/types/ai').ChatResponse, logs: [] });
          }
        });
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        reject(normalized);
      }
    });
  }
}
export default ExtensionClient;
