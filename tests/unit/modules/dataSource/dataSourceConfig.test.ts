import { describe, it, expect } from 'vitest';
import { DataSourceConfig } from '@/modules/dataSource/dataSourceConfig';

describe('DataSourceConfig', () => {
  it('should infer isConfigured from selectedItems when not provided', () => {
    const cfg = DataSourceConfig.fromObject({ type: 'markdown', selectedItems: ['a', 'b'] });
    expect(cfg.isConfigured).toBe(true);
  });

  it('should preserve explicit isConfigured', () => {
    const cfg = DataSourceConfig.fromObject({ type: 'raw', selectedItems: [], isConfigured: true });
    expect(cfg.isConfigured).toBe(true);
  });

  it('addItem should avoid duplicates and set configured', () => {
    const cfg = new DataSourceConfig('cleaned', []);
    cfg.addItem('x');
    cfg.addItem({ id: 'x' });
    expect(cfg.getCount()).toBe(1);
    expect(cfg.isConfigured).toBe(true);
    expect(cfg.getItemIds()).toEqual(['x']);
  });

  it('removeItem should update configured state', () => {
    const cfg = new DataSourceConfig('markdown', ['x']);
    cfg.removeItem('x');
    expect(cfg.getCount()).toBe(0);
    expect(cfg.isConfigured).toBe(false);
  });
});
