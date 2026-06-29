// Model registry provides known models and capability flags.
export interface ModelInfo {
  name: string;
  provider: 'azure' | 'ollama';
  supportsSystemMessages: boolean;
  supportsFunctionCalls: boolean;
}

export const DEFAULT_MODELS: ModelInfo[] = [
  {
    name: 'gpt-4o-mini',
    provider: 'azure',
    supportsSystemMessages: true,
    supportsFunctionCalls: true,
  },
  {
    name: 'gpt-4o',
    provider: 'azure',
    supportsSystemMessages: true,
    supportsFunctionCalls: true,
  },
  {
    name: 'ollama:llama3.1',
    provider: 'ollama',
    supportsSystemMessages: true,
    supportsFunctionCalls: false,
  },
];

export function getAvailableModels(): ModelInfo[] {
  return DEFAULT_MODELS;
}
