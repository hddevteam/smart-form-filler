import { Logger } from '@/utils/logger';

export type ProviderType = 'azure' | 'ollama';

export interface ApiConfig {
  provider: ProviderType;
  name: string;
  endpoint: string;
  apiKey?: string;
  model?: string;
}

type StoredConfigs = Record<string, ApiConfig>; // apiKey will be base64-encoded at rest

function hasBtoa(g: unknown): g is { btoa: (s: string) => string } {
  return typeof (g as { btoa?: unknown }).btoa === 'function';
}
function hasAtob(g: unknown): g is { atob: (s: string) => string } {
  return typeof (g as { atob?: unknown }).atob === 'function';
}
type BufferLike = { from: (input: string, enc: string) => { toString: (enc: string) => string } };
function hasBuffer(g: unknown): g is { Buffer: BufferLike } {
  const maybe = (g as { Buffer?: Partial<BufferLike> }).Buffer;
  return !!maybe && typeof (maybe as BufferLike).from === 'function';
}

const encodeBase64 = (input: string): string => {
  const g = globalThis as unknown;
  try {
    if (hasBtoa(g)) return g.btoa(input);
  } catch {
    // ignore
  }
  if (hasBuffer(g)) {
    return g.Buffer.from(input, 'utf-8').toString('base64');
  }
  return input;
};

const decodeBase64 = (input: string): string => {
  const g = globalThis as unknown;
  try {
    if (hasAtob(g)) return g.atob(input);
  } catch {
    // ignore
  }
  if (hasBuffer(g)) {
    return g.Buffer.from(input, 'base64').toString('utf-8');
  }
  return input;
};

function isStoredConfigs(obj: unknown): obj is StoredConfigs {
  return !!obj && typeof obj === 'object';
}

export class ApiConfigManager {
  private readonly STORAGE_KEY = 'apiConfigs';
  private logger = Logger.forScope('ApiConfigManager');
  private memory: StoredConfigs | null = null;

  async saveConfig(config: ApiConfig): Promise<void> {
    this.validate(config);
    const all = await this.readAll();
    const toStore: ApiConfig = {
      provider: config.provider,
      name: config.name,
      endpoint: config.endpoint,
      ...(config.model ? { model: config.model } : {}),
      ...(config.apiKey ? { apiKey: encodeBase64(config.apiKey) } : {}),
    };
    all[config.name] = toStore;
    this.memory = all;
    await chrome.storage.local.set({ [this.STORAGE_KEY]: all });
  }

  async getConfig(name: string): Promise<ApiConfig | undefined> {
    const all = await this.readAll();
    const found = all[name];
    if (!found) return undefined;
    const decoded: ApiConfig = {
      provider: found.provider,
      name: found.name,
      endpoint: found.endpoint,
      ...(found.model ? { model: found.model } : {}),
      ...(found.apiKey ? { apiKey: decodeBase64(found.apiKey) } : {}),
    };
    return decoded;
  }

  async deleteConfig(name: string): Promise<void> {
    const all = await this.readAll();
    delete all[name];
    this.memory = all;
    await chrome.storage.local.set({ [this.STORAGE_KEY]: all });
  }

  private async readAll(): Promise<StoredConfigs> {
    if (this.memory) return this.memory;
    try {
      const res = await chrome.storage.local.get(this.STORAGE_KEY);
      const value = (res as Record<string, unknown>)[this.STORAGE_KEY];
      if (isStoredConfigs(value)) {
        this.memory = value;
        return this.memory;
      }
      this.memory = {};
      return this.memory;
    } catch (error) {
      this.logger.error('Failed to read configs from storage', error);
      this.memory = {};
      return this.memory;
    }
  }

  private validate(config: ApiConfig): void {
    const providers: ProviderType[] = ['azure', 'ollama'];
    const errors: string[] = [];
    if (!providers.includes(config.provider)) errors.push('Invalid provider');
    if (!config.name || !config.name.trim()) errors.push('Name is required');
    if (!config.endpoint || !config.endpoint.trim()) errors.push('Endpoint is required');
    if (errors.length) throw new Error(`Invalid config: ${errors.join(', ')}`);
  }

  async listConfigs(): Promise<ApiConfig[]> {
    const all = await this.readAll();
    const values = Object.values(all).map(c => ({
      provider: c.provider,
      name: c.name,
      endpoint: c.endpoint,
      ...(c.model ? { model: c.model } : {}),
      ...(c.apiKey ? { apiKey: decodeBase64(c.apiKey) } : {}),
    }));
    // Sort by name for deterministic order
    values.sort((a, b) => a.name.localeCompare(b.name));
    return values;
  }
}

export default ApiConfigManager;
