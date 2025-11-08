import { describe, it, expect, vi, beforeEach } from 'vitest';
import ModelSelector from '@/popup/components/ModelSelector';

describe('ModelSelector autoload (Ollama)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '<div id="container"></div>';
  });

  it('shows loading then populates local group when deps.loadModels returns ollama models', async () => {
    const container = document.getElementById('container')!;
    const deps = {
      loadModels: vi.fn().mockResolvedValue([
        { id: 'ollama:llama3', name: 'llama3', source: 'ollama' },
        { id: 'ollama:qwen2', name: 'qwen2', source: 'ollama' },
      ]),
    };
    const selector = new ModelSelector(container, deps);
    await selector.render();
    const select = container.querySelector('select')!;
    expect(select.disabled).toBe(false);
    const groups = Array.from(select.querySelectorAll('optgroup')).map(g => g.label);
    expect(groups).toContain('Local Models (Ollama)');
    const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent);
    expect(options).toContain('llama3');
    expect(options).toContain('qwen2');
  });
});
