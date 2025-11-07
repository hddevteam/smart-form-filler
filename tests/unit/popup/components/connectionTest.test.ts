import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionTest } from '@/popup/components/ConnectionTest';

describe('ConnectionTest', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(container);
  });

  it('shows error when URL empty', async () => {
    const deps = { validate: vi.fn() };
    const ct = new ConnectionTest(container, deps);
    ct.render();
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    // No await path here; just yield to microtask queue once
    btn?.click();
    await Promise.resolve();
    const status = container.querySelector('.connection-status');
    expect(status).toBeTruthy();
    expect((status as HTMLElement).className).toContain('error');
  });

  it('shows success on valid connection', async () => {
    const deps = { validate: vi.fn().mockResolvedValue({ success: true }) };
    const ct = new ConnectionTest(container, deps);
    ct.render();
    const input = container.querySelector('input');
    expect(input).toBeTruthy();
    input.value = 'http://localhost:3001';
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    await Promise.resolve();
    btn?.click();

    // Wait microtask queue to flush async handler
    await Promise.resolve();
    await Promise.resolve();

    const status = container.querySelector('.connection-status');
    expect(status).toBeTruthy();
    expect((status as HTMLElement).className).toContain('success');
  });

  it('shows error on failed connection', async () => {
    const deps = { validate: vi.fn().mockResolvedValue({ success: false, error: 'down' }) };
    const ct = new ConnectionTest(container, deps);
    ct.render();
    const input = container.querySelector('input');
    expect(input).toBeTruthy();
    input.value = 'http://localhost:3001';
    const btn = container.querySelector('button');
    expect(btn).toBeTruthy();
    btn?.click();
    await Promise.resolve();
    await Promise.resolve();
    const status = container.querySelector('.connection-status');
    expect(status).toBeTruthy();
    expect((status as HTMLElement).className).toContain('error');
    const text = ((status as HTMLElement).textContent || '').toLowerCase();
    expect(text).toContain('failed');
  });
});
