import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AITestButton from '@/popup/components/AITestButton';

describe('AITestButton', () => {
  let container: HTMLElement;
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    (
      navigator as Navigator & { clipboard?: { writeText?: (text: string) => Promise<void> } }
    ).clipboard = {
      writeText: writeTextMock,
    };
  });

  afterEach(() => {
    delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
  });

  it('renders and calls client.sendAIRequest, showing content', async () => {
    const client = {
      sendAIRequest: vi.fn().mockResolvedValue({
        response: {
          model: 'x',
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        },
        logs: ['mock-log'],
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
    const logEl = container.querySelector('.ai-test-log') as HTMLElement;
    expect(logEl.textContent ?? '').toContain('mock-log');
    const copyBtn = container.querySelector<HTMLButtonElement>('.ai-test-copy-btn');
    expect(copyBtn).toBeTruthy();
    const logWrapper = container.querySelector<HTMLElement>('.ai-test-log-container');
    expect(logWrapper).toBeTruthy();
  });

  it('copies logs to clipboard when copy button clicked', async () => {
    const client = {
      sendAIRequest: vi.fn().mockResolvedValue({
        response: {
          model: 'x',
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
        },
        logs: ['line one', 'line two'],
      }),
    } as unknown as import('@/popup/apis/extensionClient').ExtensionClientLike;

    const btn = new AITestButton(container, {
      client,
      getOptions: () => ({ apiUrl: 'http://x', model: 'm', messages: [] }) as any,
    });
    btn.render();

    container.querySelector<HTMLButtonElement>('#ai-test-btn')?.click();
    await Promise.resolve();

    const copyBtn = container.querySelector<HTMLButtonElement>('.ai-test-copy-btn');
    expect(copyBtn).toBeTruthy();
    copyBtn?.click();

    expect(writeTextMock).toHaveBeenCalled();
    const copied = writeTextMock.mock.calls[0]?.[0] ?? '';
    expect(copied).toContain('line one');
    expect(copied).toContain('line two');
  });
});
