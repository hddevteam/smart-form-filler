import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfigurationUI from '@/popup/components/ConfigurationUI';

function setup() {
  document.body.innerHTML = '<div id="c"></div>';
  const container = document.getElementById('c')!;
  const deps = {
    saveConfig: vi.fn().mockResolvedValue(undefined),
    listConfigs: vi.fn().mockResolvedValue([]),
    onProviderChange: vi.fn(),
  };
  return { container, deps } as const;
}

describe('ConfigurationUI - Ollama auto discovery UX', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('disables Save and shows info when selecting Ollama, and calls onProviderChange', async () => {
    const { container, deps } = setup();
    const ui = new ConfigurationUI(container, deps);
    await ui.render();

    const provider = container.querySelector('select[name="provider"]') as HTMLSelectElement;
    const saveBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(saveBtn.disabled).toBe(false);

    provider.value = 'ollama';
    provider.dispatchEvent(new Event('change'));

    expect(saveBtn.disabled).toBe(true);
    expect(deps.onProviderChange).toHaveBeenCalledWith('ollama');

    const status = container.querySelector('.config-status') as HTMLElement;
    expect(status.textContent || '').toContain('auto-discovered');
  });
});
