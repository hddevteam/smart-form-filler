import { Logger } from '@/utils/logger';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';
import type { ExtensionClientLike } from '@/popup/apis/extensionClient';
import './aiTestButton.css';

export interface AITestDeps {
  client: ExtensionClientLike;
  getOptions: () => MakeRequestOptions;
}

/**
 * Simple AI test button that sends an AI_REQUEST via ExtensionClient
 * and displays the assistant message content.
 */
export class AITestButton {
  private container: HTMLElement;
  private deps: AITestDeps;
  private logger = Logger.forScope('AITestButton');
  private lastStatus = '';

  constructor(container: HTMLElement, deps: AITestDeps) {
    this.container = container;
    this.deps = deps;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="ai-test">
        <button class="btn btn--secondary" id="ai-test-btn">Test AI Request</button>
        <div class="ai-test-status" role="status" aria-live="polite"></div>
        <div class="ai-test-log-container">
          <pre class="ai-test-log" aria-label="AI Request Log"></pre>
          <button type="button" class="ai-test-copy-btn" aria-label="Copy AI logs">Copy</button>
        </div>
      </div>
    `;

    const btn = this.container.querySelector<HTMLButtonElement>('#ai-test-btn');
    btn?.addEventListener('click', () => {
      void this.handleTestClick();
    });

    const copyBtn = this.container.querySelector<HTMLButtonElement>('.ai-test-copy-btn');
    copyBtn?.addEventListener('click', () => {
      void this.copyLogs();
    });
  }

  private setStatus(message: string): void {
    const el = this.container.querySelector<HTMLElement>('.ai-test-status');
    if (!el) return;
    this.lastStatus = message;
    el.textContent = message;
  }

  private flashStatus(message: string, duration = 1500): void {
    const previous = this.lastStatus;
    this.setStatus(message);
    window.setTimeout(() => {
      if (this.lastStatus === message) {
        this.setStatus(previous);
      }
    }, duration);
  }

  private appendLog(line: string): void {
    const log = this.container.querySelector<HTMLPreElement>('.ai-test-log');
    if (!log) return;
    const now = new Date().toLocaleTimeString();
    log.textContent = `${log.textContent ? log.textContent + '\n' : ''}[${now}] ${line}`;
    log.scrollTop = log.scrollHeight;
  }

  private async copyLogs(): Promise<void> {
    const log = this.container.querySelector<HTMLPreElement>('.ai-test-log');
    if (!log) return;
    const text = log.textContent?.trim() ?? '';
    if (!text) {
      this.flashStatus('No logs to copy');
      return;
    }

    const clipboard = navigator?.clipboard;
    if (!clipboard || typeof clipboard.writeText !== 'function') {
      this.logger.warn('Clipboard API unavailable for copying logs');
      this.flashStatus('Clipboard unavailable');
      return;
    }

    try {
      await clipboard.writeText(text);
      this.flashStatus('Logs copied to clipboard');
    } catch (error) {
      this.logger.warn('Failed to copy logs', error);
      this.flashStatus('Copy failed');
    }
  }

  private async handleTestClick(): Promise<void> {
    // Clear previous logs
    const logEl = this.container.querySelector<HTMLPreElement>('.ai-test-log');
    if (logEl) logEl.textContent = '';

    try {
      this.setStatus('Testing...');
      const options = this.deps.getOptions();
      this.appendLog('=== AI Request Started ===');
      this.appendLog(`Selected Model: ${options.model}`);
      this.appendLog(`API URL: ${options.apiUrl}`);
      this.appendLog(''); // Empty line for readability

      const { response, logs } = await this.deps.client.sendAIRequest(options);

      if (logs.length > 0) {
        this.appendLog('--- Background Logs ---');
        logs.forEach(line => this.appendLog(line));
        this.appendLog('');
      }

      const content =
        response.choices && response.choices[0]
          ? response.choices[0].message.content
          : '[No content]';

      this.appendLog('');
      this.appendLog('=== Response Received ===');
      this.appendLog(`Model: ${response.model}`);
      this.appendLog(`Content: ${content}`);
      this.setStatus(`✅ ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.logger.error('AI test failed', error);
      const logs = (error as { logs?: string[] })?.logs ?? [];
      if (logs.length > 0) {
        this.appendLog('--- Background Logs ---');
        logs.forEach(line => this.appendLog(line));
        this.appendLog('');
      }
      this.appendLog('');
      this.appendLog('=== ❌ Request Failed ===');
      this.appendLog(msg);
      this.setStatus(`❌ ${msg}`);
    }
  }
}

export default AITestButton;
