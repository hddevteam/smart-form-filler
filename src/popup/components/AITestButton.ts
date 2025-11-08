import { Logger } from '@/utils/logger';
import type { MakeRequestOptions } from '@/background/services/ai/aiService';
import type { ExtensionClientLike } from '@/popup/apis/extensionClient';

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

  constructor(container: HTMLElement, deps: AITestDeps) {
    this.container = container;
    this.deps = deps;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="ai-test">
        <button class="btn btn--secondary" id="ai-test-btn">Test AI Request</button>
        <div class="ai-test-status" role="status" aria-live="polite"></div>
      </div>
    `;

    const btn = this.container.querySelector<HTMLButtonElement>('#ai-test-btn');
    btn?.addEventListener('click', () => {
      void this.handleTestClick();
    });
  }

  private setStatus(message: string): void {
    const el = this.container.querySelector<HTMLElement>('.ai-test-status');
    if (!el) return;
    el.textContent = message;
  }

  private async handleTestClick(): Promise<void> {
    try {
      this.setStatus('Testing...');
      const options = this.deps.getOptions();
      const resp = await this.deps.client.sendAIRequest(options);
      const content =
        resp.choices && resp.choices[0] ? resp.choices[0].message.content : '[No content]';
      this.setStatus(`✅ ${content}`);
    } catch (error) {
      const msg = (error as { message?: string })?.message ?? 'Unknown error';
      this.logger.error('AI test failed', error);
      this.setStatus(`❌ ${msg}`);
    }
  }
}

export default AITestButton;
