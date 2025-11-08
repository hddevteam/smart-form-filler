// AdapterFactory selects provider adapter based on model or config.
import { OllamaAdapter } from './OllamaAdapter';
import { OSeriesAdapter } from './OSeriesAdapter';
import type { Adapter } from '@/types/ai';

export class AdapterFactory {
  static getAdapter(model: string): Adapter {
    // Heuristic: ollama models often have local names; azure/openai use deployments.
    if (model.startsWith('ollama:') || model.startsWith('local:')) {
      return new OllamaAdapter();
    }
    return new OSeriesAdapter();
  }
}
