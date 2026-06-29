import { Logger } from '@/utils/logger';

export interface ConnectionValidationResult {
  success: boolean;
  error?: string;
  latencyMs?: number;
  statusCode?: number;
  hint?: string;
}

export interface ConnectionTestDeps {
  validate: (endpoint: string) => Promise<ConnectionValidationResult>;
}

type ConnectionState = 'idle' | 'testing' | 'success' | 'error';

type ConnectionStatusDetails = Pick<
  ConnectionValidationResult,
  'latencyMs' | 'statusCode' | 'hint'
>;

export class ConnectionTest {
  private container: HTMLElement;
  private deps: ConnectionTestDeps;
  private logger = Logger.forScope('ConnectionTest');

  private inputEl: HTMLInputElement | null = null;
  private buttonEl: HTMLButtonElement | null = null;
  private statusEl: HTMLElement | null = null;
  private detailsEl: HTMLElement | null = null;

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
        <div class="connection-status__details" hidden></div>
      </div>
    `;
    this.inputEl = this.container.querySelector<HTMLInputElement>('input');
    this.buttonEl = this.container.querySelector<HTMLButtonElement>('button');
    this.statusEl = this.container.querySelector<HTMLElement>('.connection-status');
    this.detailsEl = this.container.querySelector<HTMLElement>('.connection-status__details');

    if (this.statusEl) {
      this.statusEl.dataset.state = 'idle';
    }

    this.buttonEl?.addEventListener('click', () => {
      const url = this.inputEl?.value.trim() || '';
      void this.handleTest(url);
    });
  }

  private setStatus(
    message: string,
    kind: 'info' | 'success' | 'error',
    state: ConnectionState,
    details: ConnectionStatusDetails | null
  ): void {
    const el = this.statusEl ?? this.container.querySelector<HTMLElement>('.connection-status');
    if (!el) return;
    el.textContent = message;
    el.className = `connection-status ${kind}`;
    el.dataset.state = state;
    this.updateDetails(details);
  }

  private updateDetails(details: ConnectionStatusDetails | null): void {
    const detailsEl =
      this.detailsEl ?? this.container.querySelector<HTMLElement>('.connection-status__details');
    if (!detailsEl) return;

    if (!details) {
      detailsEl.hidden = true;
      detailsEl.replaceChildren();
      return;
    }

    const items: string[] = [];
    if (typeof details.latencyMs === 'number' && Number.isFinite(details.latencyMs)) {
      items.push(`Latency: ${Math.round(details.latencyMs)} ms`);
    }
    if (typeof details.statusCode === 'number') {
      items.push(`HTTP Status: ${details.statusCode}`);
    }
    if (details.hint) {
      items.push(`Hint: ${details.hint}`);
    }

    detailsEl.replaceChildren();
    if (items.length === 0) {
      detailsEl.hidden = true;
      return;
    }

    const list = document.createElement('ul');
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    }
    detailsEl.hidden = false;
    detailsEl.appendChild(list);
  }

  private toggleBusy(isBusy: boolean): void {
    const btn = this.buttonEl ?? this.container.querySelector<HTMLButtonElement>('button');
    if (!btn) return;
    btn.disabled = isBusy;
    if (isBusy) {
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.removeAttribute('aria-busy');
    }
  }

  private async handleTest(endpoint: string): Promise<void> {
    if (!endpoint) {
      this.setStatus('Please enter a backend URL', 'error', 'error', null);
      return;
    }

    this.toggleBusy(true);
    this.setStatus('Testing connection…', 'info', 'testing', null);
    try {
      const res = await this.deps.validate(endpoint);
      if (res.success) {
        const latencySuffix =
          typeof res.latencyMs === 'number' && Number.isFinite(res.latencyMs)
            ? ` — ${Math.round(res.latencyMs)} ms`
            : '';
        this.setStatus(`✅ Connection successful${latencySuffix}`, 'success', 'success', res);
      } else {
        const statusCodeSegment = res.statusCode ? ` (HTTP ${res.statusCode})` : '';
        const errorMessage = res.error ?? 'Unknown error';
        this.setStatus(
          `❌ Connection failed${statusCodeSegment}: ${errorMessage}`,
          'error',
          'error',
          res
        );
      }
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.logger.error('Connection test failed', error);
      this.setStatus(`❌ Connection failed: ${msg}`, 'error', 'error', null);
    } finally {
      this.toggleBusy(false);
    }
  }
}

export default ConnectionTest;
