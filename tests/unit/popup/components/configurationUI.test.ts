import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigurationUI } from '@/popup/components/ConfigurationUI';

describe('ConfigurationUI', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('renders form and prefills when loadConfig provided', async () => {
    const deps = {
      saveConfig: vi.fn().mockResolvedValue(undefined),
      loadConfig: vi.fn().mockResolvedValue({
        provider: 'azure',
        name: 'My Azure',
        endpoint: 'https://example.azure.com',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      }),
    };
    const ui = new ConfigurationUI(container, deps);
    await ui.render();

    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    const formEl = form as HTMLFormElement;
    expect((formEl.querySelector('[name="provider"]') as HTMLSelectElement).value).toBe('azure');
    expect((formEl.querySelector('[name="name"]') as HTMLInputElement).value).toBe('My Azure');
  });

  it('validates required fields and shows error', async () => {
    const deps = { saveConfig: vi.fn().mockResolvedValue(undefined) };
    const ui = new ConfigurationUI(container, deps);
    await ui.render();

    // Clear required fields
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    const formEl = form as HTMLFormElement;
    (formEl.querySelector('[name="name"]') as HTMLInputElement).value = '';
    (formEl.querySelector('[name="endpoint"]') as HTMLInputElement).value = '';

    formEl.dispatchEvent(new Event('submit'));

    const status = container.querySelector('.config-status');
    expect(status).toBeTruthy();
    const statusEl = status as HTMLElement;
    const text = (statusEl.textContent || '').toLowerCase();
    expect(text.includes('required')).toBe(true);
    expect(statusEl.className).toContain('error');
  });

  it('saves configuration on submit and shows success', async () => {
    const deps = { saveConfig: vi.fn().mockResolvedValue(undefined) };
    const ui = new ConfigurationUI(container, deps);
    await ui.render();

    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    const formEl = form as HTMLFormElement;
    (formEl.querySelector('[name="provider"]') as HTMLSelectElement).value = 'ollama';
    (formEl.querySelector('[name="name"]') as HTMLInputElement).value = 'Local';
    const endpointInput = formEl.querySelector('[name="endpoint"]') as HTMLInputElement;
    endpointInput.value = 'http://localhost:11434';

    formEl.dispatchEvent(new Event('submit'));
    // Wait for async submit handler to complete
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.saveConfig).toHaveBeenCalled();
    const status = container.querySelector('.config-status');
    expect(status).toBeTruthy();
    const statusEl = status as HTMLElement;
    expect(statusEl.className).toContain('success');
  });
});
