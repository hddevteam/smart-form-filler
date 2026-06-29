import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataSourceStorage } from '@/modules/dataSource/dataSourceStorage';
import { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';

describe('DataSourceStorage', () => {
  const storage = new DataSourceStorage();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('load and save chat config', async () => {
    const cfg = new DataSourceConfig('markdown', ['id1']);
    cfg.isConfigured = true;
    (chrome.storage.local.set as any).mockResolvedValue(undefined);
    await storage.saveChatConfig(cfg);
    expect(chrome.storage.local.set).toHaveBeenCalled();

    (chrome.storage.local.get as any).mockResolvedValue({ dataSourceConfig: cfg.toObject() });
    const loaded = await storage.loadChatConfig();
    expect(loaded.getItemIds()).toEqual(['id1']);
    expect(loaded.type).toBe('markdown');
  });
});
