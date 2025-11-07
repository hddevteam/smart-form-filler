import { Logger } from '@/utils/logger';

export interface ConnectionTestDeps {
  validate: (endpoint: string) => Promise<{ success: boolean; error?: string }>;
}

export class ConnectionTest {
  private container: HTMLElement;
  private deps: ConnectionTestDeps;
  private logger = Logger.forScope('ConnectionTest');

  constructor(container: HTMLElement, deps: ConnectionTestDeps) {
    this.container = container;
    this.deps = deps;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="connection-test">
        <input class="input" placeholder="Backend URL (e.g., http://localhost:3001)" />
        <button class="btn btn--secondary">Test Connection</button>
        <div class="connection-status" role="status" aria-live="polite"></div>
      </div>
    `;
    const input = this.container.querySelector<HTMLInputElement>('input');
    const btn = this.container.querySelector<HTMLButtonElement>('button');
    btn?.addEventListener('click', () => {
      const url = input?.value.trim() || '';
      void this.handleTest(url);
    });
  }

  private setStatus(message: string, kind: 'info' | 'success' | 'error'): void {
    const el = this.container.querySelector<HTMLElement>('.connection-status');
    if (!el) return;
    el.textContent = message;
    el.className = `connection-status ${kind}`;
  }

  private async handleTest(endpoint: string): Promise<void> {
    if (!endpoint) {
      this.setStatus('Please enter a backend URL', 'error');
      return;
    }
    try {
      this.setStatus('Testing...', 'info');
      const res = await this.deps.validate(endpoint);
      if (res.success) this.setStatus('✅ Connection successful', 'success');
      else this.setStatus(`❌ Connection failed: ${res.error ?? 'Unknown error'}`, 'error');
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.logger.error('Connection test failed', error);
      this.setStatus(`❌ Connection failed: ${msg}`, 'error');
    }
  }
}

export default ConnectionTest;
