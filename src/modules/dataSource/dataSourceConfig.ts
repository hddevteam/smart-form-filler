import type { DataSourceType, DataSourceItemRef, DataSourceConfigObject } from '@/types/dataSource';

/**
 * Data Source Configuration
 */
export class DataSourceConfig {
  type: DataSourceType;
  selectedItems: DataSourceItemRef[];
  isConfigured: boolean;

  constructor(type: DataSourceType = 'markdown', selectedItems: DataSourceItemRef[] = []) {
    this.type = type;
    this.selectedItems = selectedItems;
    this.isConfigured = false;
  }

  static fromObject(obj?: Partial<DataSourceConfigObject>): DataSourceConfig {
    if (!obj) return new DataSourceConfig();
    const cfg = new DataSourceConfig(obj.type ?? 'markdown', obj.selectedItems ?? []);
    if (Object.prototype.hasOwnProperty.call(obj, 'isConfigured')) {
      cfg.isConfigured = !!obj.isConfigured;
    } else {
      cfg.isConfigured = cfg.selectedItems.length > 0;
    }
    return cfg;
  }

  toObject(): DataSourceConfigObject {
    return {
      type: this.type,
      selectedItems: this.selectedItems,
      isConfigured: this.isConfigured,
    };
  }

  clone(): DataSourceConfig {
    return DataSourceConfig.fromObject(this.toObject());
  }

  updateFrom(other: DataSourceConfig): void {
    this.type = other.type;
    this.selectedItems = [...other.selectedItems];
    this.isConfigured = other.isConfigured;
  }

  isValid(): boolean {
    return this.isConfigured && this.selectedItems.length > 0;
  }

  addItem(item: DataSourceItemRef): void {
    const itemToAdd: DataSourceItemRef = typeof item === 'object' ? item : { id: item };
    const alreadyExists = this.selectedItems.some(existing => {
      const existingId = typeof existing === 'object' ? existing.id : existing;
      const newId = typeof itemToAdd === 'object' ? itemToAdd.id : itemToAdd;
      return existingId === newId;
    });
    if (!alreadyExists) {
      this.selectedItems.push(itemToAdd);
      this.isConfigured = true;
    }
  }

  removeItem(itemId: string): void {
    this.selectedItems = this.selectedItems.filter(item => {
      const id = typeof item === 'object' ? item.id : item;
      return id !== itemId;
    });
    if (this.selectedItems.length === 0) this.isConfigured = false;
  }

  clear(): void {
    this.selectedItems = [];
    this.isConfigured = false;
  }

  getCount(): number {
    return this.selectedItems.length;
  }

  getItemIds(): string[] {
    return this.selectedItems.map(item => (typeof item === 'object' ? item.id : item));
  }
}
