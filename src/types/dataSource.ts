/**
 * Data Source Types
 */

export type DataSourceType = 'markdown' | 'cleaned' | 'raw';

export type DataSourceItemRef = string | { id: string; [key: string]: unknown };

export interface DataSourceConfigObject {
  type: DataSourceType;
  selectedItems: DataSourceItemRef[];
  isConfigured: boolean;
}

export interface AvailableDataSource {
  id: string;
  title: string;
  url: string;
  type: string; // keep as string to be compatible with legacy values
  markdown?: string;
  cleaned?: string;
  raw?: string;
  timestamp?: number;
}

export interface CombinedDataSources {
  type: DataSourceType;
  sources: Array<{
    title: string;
    url: string;
    content: string;
    timestamp?: number;
  }>;
  combinedText: string;
}

export interface ExtractionHistoryItem {
  title?: string;
  url?: string;
  timestamp?: number;
  dataSources?: {
    markdown?: { content?: string };
    cleaned?: { content?: string };
    raw?: { content?: string };
  };
}
