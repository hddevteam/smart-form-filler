import { describe, it, expect, vi, beforeEach } from 'vitest';
import AITestButton from '@/popup/components/AITestButton';

describe('AITestButton', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders and calls client.sendAIRequest, showing content', async () => {
    const client = {
      sendAIRequest: vi.fn().mockResolvedValue({
        model: 'x',
        choices: [{ message: { role: 'assistant', content: 'ok' } }],
      }),
    } as unknown as import('@/popup/apis/extensionClient').ExtensionClientLike;

    const btn = new AITestButton(container, {
      client,
      getOptions: () => ({ apiUrl: 'http://x', model: 'm', messages: [] }) as any,
    });
    btn.render();

    const click = container.querySelector<HTMLButtonElement>('#ai-test-btn');
    expect(click).toBeTruthy();
    click?.click();

    // allow microtask
    await Promise.resolve();
    const status = container.querySelector('.ai-test-status') as HTMLElement;
    expect(status.textContent).toContain('ok');
    expect(client.sendAIRequest).toHaveBeenCalled();
  });
});
