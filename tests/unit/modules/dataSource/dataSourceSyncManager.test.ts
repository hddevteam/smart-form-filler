import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataSourceSyncManager } from '@/modules/dataSource/dataSourceSyncManager';
import { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';
import { DataSourceEventEmitter } from '@/modules/dataSource/dataSourceEventEmitter';

describe('DataSourceSyncManager', () => {
  let emitter: DataSourceEventEmitter;
  let storage: any;

  beforeEach(() => {
    emitter = new DataSourceEventEmitter();
    storage = {
      loadConfigurations: vi.fn().mockResolvedValue({
        chatConfig: new DataSourceConfig(),
        formFillerConfig: new DataSourceConfig(),
      }),
      saveChatConfig: vi.fn().mockResolvedValue(undefined),
      saveFormFillerConfig: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('init loads configurations', async () => {
    const mgr = new DataSourceSyncManager(storage, emitter);
    await mgr.init();
    expect(storage.loadConfigurations).toHaveBeenCalled();
  });

  it('updateAvailableDataSources builds sources from history and emits event', () => {
    const mgr = new DataSourceSyncManager(storage, emitter);
    const spy = vi.spyOn(emitter, 'emit');
    mgr.updateAvailableDataSources([
      {
        title: 'T',
        url: 'U',
        dataSources: { markdown: { content: 'M' }, cleaned: { content: 'C' } },
      },
    ]);
    expect(mgr.getAvailableDataSources().length).toBe(1);
    expect(spy).toHaveBeenCalled();
  });

  it('getDataSourcesContent combines text based on type', () => {
    const mgr = new DataSourceSyncManager(storage, emitter);
    mgr.updateAvailableDataSources([
      { title: 'T', url: 'U', dataSources: { raw: { content: 'R' } } },
    ]);
    const cfg = new DataSourceConfig('raw', ['extraction-0-main']);
    cfg.isConfigured = true;
    const res = (mgr as any).getDataSourcesContent(cfg);
    expect(res?.type).toBe('raw');
    expect(res?.combinedText).toContain('## T');
    expect(res?.combinedText).toContain('R');
  });
});
