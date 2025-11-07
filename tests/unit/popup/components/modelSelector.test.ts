import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModelSelector } from '@/popup/components/ModelSelector';

describe('ModelSelector', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('renders models grouped by source and enables select', async () => {
    const deps = {
      loadModels: vi.fn().mockResolvedValue([
        { id: 'gpt-4o', name: 'GPT-4o', source: 'azure' },
        { id: 'llama3', name: 'Llama 3', source: 'ollama' },
        { id: 'gpt-4o-mini', name: 'GPT-4o mini', source: 'azure' },
      ]),
    };
    const selector = new ModelSelector(container, deps);
    await selector.render();

    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(select?.disabled).toBe(false);

    const groups = Array.from((select as HTMLSelectElement).children) as HTMLOptGroupElement[];
    // Expect two groups: Cloud and Local
    expect(groups.length).toBe(2);
    expect(groups[0]?.label).toBe('Cloud Models');
    expect(groups[1]?.label).toBe('Local Models (Ollama)');

    const cloudOptions = Array.from(groups[0]?.querySelectorAll('option') ?? []).map(o => o.value);
    const localOptions = Array.from(groups[1]?.querySelectorAll('option') ?? []).map(o => o.value);
    expect(cloudOptions).toEqual(expect.arrayContaining(['gpt-4o', 'gpt-4o-mini']));
    expect(localOptions).toEqual(['llama3']);
  });

  it('disables select and shows fallback when load fails', async () => {
    const deps = { loadModels: vi.fn().mockRejectedValue(new Error('network')) };
    const selector = new ModelSelector(container, deps);
    await selector.render();

    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).disabled).toBe(true);
    expect((select as HTMLSelectElement).innerHTML.toLowerCase()).toContain('service unavailable');
  });
});
