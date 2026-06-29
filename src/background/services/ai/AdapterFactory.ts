// AdapterFactory selects provider adapter based on model or config.
import { OllamaAdapter } from './OllamaAdapter';
import { OSeriesAdapter } from './OSeriesAdapter';
import { AzureResponsesAdapter } from './AzureResponsesAdapter';
import type { Adapter } from '@/types/ai';

export class AdapterFactory {
  static getAdapter(model: string, apiUrl?: string): Adapter {
    // Heuristic: ollama models often have local names; azure/openai use deployments.
    if (model.startsWith('ollama:') || model.startsWith('local:')) {
      return new OllamaAdapter();
    }

    // Check if using Azure Responses API (new unified endpoint)
    if (apiUrl && apiUrl.includes('/openai/responses')) {
      return new AzureResponsesAdapter();
    }

    // Default to standard Azure/OpenAI Chat Completions API
    return new OSeriesAdapter();
  }
}
