import { describe, it, expect, vi } from 'vitest';
import ModelSelector from '@/popup/components/ModelSelector';
import ConfigurationUI from '@/popup/components/ConfigurationUI';
import ConnectionTest from '@/popup/components/ConnectionTest';

describe('UI Integration (popup components)', () => {
  it('ModelSelector falls back to apiClient when backend fails and populates groups', async () => {
    const root = document.createElement('div');
    const modelContainer = document.createElement('div');
    modelContainer.id = 'model-selector';
    const backendInput = document.createElement('input');
    backendInput.id = 'backend-url';
    backendInput.value = 'http://localhost:3001';
    root.appendChild(modelContainer);
    root.appendChild(backendInput);
    document.body.appendChild(root);

    const apiClient = {
      getAvailableModels: vi.fn().mockResolvedValue([
        { id: 'gpt-4o', name: 'GPT-4o', source: 'azure' },
        { id: 'llama3', name: 'Llama 3', source: 'ollama' },
      ]),
    };

    // deps that emulate index.ts wiring: try backend, then fallback to apiClient
    const deps = {
      loadModels: () => {
        // emulate backend failure
        return Promise.reject(new Error('backend unavailable'));
      },
    };

    const selector = new ModelSelector(modelContainer, deps);
    // Render with failing backend -> component shows disabled service state
    await selector.render();
    const selectEl = modelContainer.querySelector('select');
    expect(selectEl).toBeTruthy();
    if (!selectEl) throw new Error('select not found');
    expect(selectEl.disabled).toBe(true);
    expect(selectEl.textContent).toContain('Service unavailable');

    // Now emulate index.ts fallback by re-rendering with successful apiClient
    const depsFallback = {
      loadModels: async () => {
        const models = await apiClient.getAvailableModels();
        return models ?? [];
      },
    };
    const selector2 = new ModelSelector(modelContainer, depsFallback);
    await selector2.render();
    const optgroups = modelContainer.querySelectorAll('optgroup');
    const groups = Array.from(optgroups).map(g => g.label);
    expect(groups).toContain('Cloud Models');
    expect(groups).toContain('Local Models (Ollama)');
    const options = Array.from(modelContainer.querySelectorAll('option')).map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['GPT-4o', 'Llama 3']));
    const selectEl2 = modelContainer.querySelector('select');
    expect(selectEl2).toBeTruthy();
    if (!selectEl2) throw new Error('select not found (fallback)');
    expect(selectEl2.disabled).toBe(false);
  });

  it('ConfigurationUI prefill from loaded config, switch via Recent, and save updates status', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const saved: any[] = [];
    const deps = {
      saveConfig: vi.fn((cfg: any) => {
        saved.push(cfg);
        return Promise.resolve();
      }),
      loadConfig: vi.fn(() =>
        Promise.resolve({
          provider: 'azure',
          name: 'Default',
          endpoint: 'https://example.azure.com',
          apiKey: 'sk-test',
          model: 'gpt-4o',
        })
      ),
      listConfigs: vi.fn(() =>
        Promise.resolve([
          { provider: 'azure', name: 'Default', endpoint: 'https://example.azure.com' },
          { provider: 'ollama', name: 'Local', endpoint: 'http://localhost:11434' },
        ])
      ),
    };

    const ui = new ConfigurationUI(container, deps);
    await ui.render();
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    if (!form) throw new Error('form not found');
    const nameInput = form.querySelector<HTMLInputElement>('[name="name"]');
    const endpointInput = form.querySelector<HTMLInputElement>('[name="endpoint"]');
    expect(nameInput?.value).toBe('Default');
    expect(endpointInput?.value).toBe('https://example.azure.com');

    // Switch via Recent to Local
    const recentSel = container.querySelector('select[aria-label="Recent Configurations"]');
    expect(recentSel).toBeTruthy();
    const recentDropdown = recentSel as HTMLSelectElement | null;
    if (!recentDropdown) throw new Error('recent select not found');
    recentDropdown.value = 'Local';
    recentDropdown.dispatchEvent(new Event('change'));
    const providerSel = form.querySelector<HTMLSelectElement>('[name="provider"]');
    const endpointSel = form.querySelector<HTMLInputElement>('[name="endpoint"]');
    expect(providerSel?.value).toBe('ollama');
    expect(endpointSel?.value).toBe('http://localhost:11434');

    // Submit and verify success
    const nameInput2 = form.querySelector<HTMLInputElement>('[name="name"]');
    expect(nameInput2).toBeTruthy();
    if (!nameInput2) throw new Error('name input missing');
    nameInput2.value = 'Local Saved';
    form.dispatchEvent(new Event('submit'));
    await Promise.resolve();
    const status = container.querySelector('.config-status');
    expect(status?.textContent).toContain('Configuration saved');
    expect(saved.length).toBe(1);
    expect(saved[0].name).toBe('Local Saved');
  });

  it('ConnectionTest shows statuses for empty, success and failure', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const validate = vi.fn((endpoint: string) => {
      return Promise.resolve(
        endpoint.includes('ok') ? { success: true } : { success: false, error: 'bad gateway' }
      );
    });

    const ct = new ConnectionTest(container, { validate });
    ct.render();

    const inputEl = container.querySelector('input');
    const btnEl = container.querySelector('button');
    const statusEl = container.querySelector('.connection-status');
    expect(inputEl && btnEl && statusEl).toBeTruthy();
    if (!inputEl || !btnEl || !statusEl) throw new Error('connection test elements missing');

    // Empty
    inputEl.value = '';
    btnEl.click();
    await Promise.resolve();
    expect(statusEl.textContent).toContain('Please enter a backend URL');

    // Success
    inputEl.value = 'http://service/ok';
    btnEl.click();
    await Promise.resolve();
    expect(statusEl.textContent).toContain('Connection successful');

    // Failure
    inputEl.value = 'http://service/fail';
    btnEl.click();
    await Promise.resolve();
    expect(statusEl.textContent).toContain('Connection failed: bad gateway');
  });

  it('ConnectionTest toggles progress state and surfaces diagnostics metadata', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const validate = vi
      .fn<
        [string],
        Promise<{
          success: boolean;
          error?: string;
          latencyMs?: number;
          statusCode?: number;
          hint?: string;
        }>
      >()
      .mockResolvedValueOnce({ success: true, latencyMs: 78 })
      .mockResolvedValueOnce({
        success: false,
        error: 'TLS handshake failed',
        statusCode: 502,
        hint: 'Allow extension through proxy',
      });

    const ct = new ConnectionTest(container, { validate });
    ct.render();

    const inputEl = container.querySelector('input');
    const btnEl = container.querySelector('button');
    const statusEl = container.querySelector('.connection-status');
    const detailsEl = container.querySelector('.connection-status__details');
    expect(inputEl && btnEl && statusEl && detailsEl).toBeTruthy();
    if (!inputEl || !btnEl || !statusEl || !detailsEl)
      throw new Error('connection test wiring invalid');

    inputEl.value = 'http://service/ok';
    btnEl.click();
    expect(btnEl.disabled).toBe(true);
    expect(statusEl.dataset.state).toBe('testing');
    expect(statusEl.textContent).toContain('Testing connection');

    await Promise.resolve();
    await Promise.resolve();

    expect(btnEl.disabled).toBe(false);
    expect(statusEl.dataset.state).toBe('success');
    expect(statusEl.textContent).toContain('Connection successful');
    expect(statusEl.textContent).toContain('78 ms');
    expect(detailsEl.hidden).toBe(false);
    expect(detailsEl.textContent).toContain('Latency: 78 ms');

    inputEl.value = 'http://service/fail';
    btnEl.click();
    expect(btnEl.disabled).toBe(true);
    expect(statusEl.dataset.state).toBe('testing');

    await Promise.resolve();
    await Promise.resolve();

    expect(btnEl.disabled).toBe(false);
    expect(statusEl.dataset.state).toBe('error');
    expect(statusEl.textContent).toContain('TLS handshake failed');
    expect(statusEl.textContent).toContain('HTTP 502');
    expect(detailsEl.hidden).toBe(false);
    expect(detailsEl.textContent).toContain('Hint: Allow extension through proxy');
  });
});
