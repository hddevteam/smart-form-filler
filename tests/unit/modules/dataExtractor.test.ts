import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataExtractor as NamedExtractor, SimpleTab } from '@/modules/dataExtractor';

// Minimal chrome typings for tests
// Inject a minimal chrome shim for tests
(globalThis as any).chrome = {
  runtime: {
    lastError: { message: 'init' } as { message: string } | undefined,
  },
  tabs: {
    sendMessage: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

const asChrome = (globalThis as any).chrome as {
  runtime: { lastError?: { message: string } };
  tabs: { sendMessage: ReturnType<typeof vi.fn> };
  scripting: { executeScript: ReturnType<typeof vi.fn> };
};

describe('DataExtractor (TS)', () => {
  let extractor: NamedExtractor;
  const tab: SimpleTab = { id: 1 };

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new NamedExtractor();
    // Clear lastError precisely under exactOptionalPropertyTypes
    delete (asChrome.runtime as any).lastError;
  });

  it('getPageContent uses content-script response when available', async () => {
    asChrome.tabs.sendMessage.mockImplementation(
      (_id: number, _msg: unknown, cb: (r?: unknown) => void) => {
        cb({ success: true, data: { mainPage: { html: '<html>OK</html>' } } });
      }
    );

    const html = await extractor.getPageContent(tab);
    expect(html).toContain('OK');
    expect(asChrome.tabs.sendMessage).toHaveBeenCalled();
  });

  it('getPageContent falls back to direct when content empty', async () => {
    asChrome.tabs.sendMessage.mockImplementation(
      (_id: number, _msg: unknown, cb: (r?: unknown) => void) => {
        cb({ success: true, data: { mainPage: { html: '   ' } } });
      }
    );
    asChrome.scripting.executeScript.mockResolvedValueOnce([
      { result: { html: '<html>X</html>' } },
    ]);

    const html = await extractor.getPageContent(tab);
    expect(html).toContain('X');
    expect(asChrome.scripting.executeScript).toHaveBeenCalled();
  });

  it('getPageContentDirect validates html and returns it', async () => {
    asChrome.scripting.executeScript.mockResolvedValueOnce([
      { result: { html: '<html><body>Y</body></html>', bodyLength: 1 } },
    ]);

    const html = await extractor.getPageContentDirect(tab);
    expect(html).toContain('Y');
  });

  it('extractIframeContents returns empty when not ready', async () => {
    // Force waitForContentScript to false
    const spy = vi.spyOn(extractor as any, 'waitForContentScript').mockResolvedValue(false);
    const result = await extractor.extractIframeContents(tab);
    expect(result).toEqual([]);
    spy.mockRestore();
  });

  it('extractIframeContents maps frames when available', async () => {
    vi.spyOn(extractor as any, 'waitForContentScript').mockResolvedValue(true);
    asChrome.tabs.sendMessage.mockImplementation(
      (_id: number, _msg: unknown, cb: (r?: unknown) => void) => {
        cb({
          success: true,
          data: {
            iframes: [
              {
                indexPath: '0/1',
                src: 'https://a',
                depth: 1,
                accessible: true,
                content: { html: '<html>IF</html>', title: 't', url: 'u', domain: 'd' },
              },
              { indexPath: '0/2', src: 'https://b', depth: 2, accessible: false },
            ],
          },
        });
      }
    );

    const frames = await extractor.extractIframeContents(tab);
    expect(frames.length).toBe(2);
    if (frames[0] && frames[1]) {
      expect(frames[0].content).toContain('IF');
      expect(frames[1].metadata.accessible).toBe(false);
    }
  });

  it('waitForContentScript reinjects then resolves true on success', async () => {
    const order: string[] = [];
    asChrome.tabs.sendMessage
      .mockImplementationOnce((_id: number, _m: unknown, cb: (r?: unknown) => void) => {
        order.push('ping-1');
        asChrome.runtime.lastError = { message: 'no receiver' };
        cb(undefined);
      })
      .mockImplementationOnce((_id: number, _m: unknown, cb: (r?: unknown) => void) => {
        order.push('ping-2');
        delete (asChrome.runtime as any).lastError;
        cb({ success: true });
      });

    const reinjectSpy = vi
      .spyOn(extractor as any, 'reinjectContentScript')
      .mockResolvedValue(undefined);

    const ok = await extractor.waitForContentScript(tab, 2, 1);
    expect(ok).toBe(true);
    expect(order).toEqual(['ping-1', 'ping-2']);
    expect(reinjectSpy).toHaveBeenCalled();
  });
});
