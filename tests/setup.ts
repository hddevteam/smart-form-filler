import { vi, beforeEach } from 'vitest';

// Mock Chrome Storage API
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
  sync: {
    get: vi.fn(),
    set: vi.fn(),
  },
};

// Mock Chrome Runtime API
const mockRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
};

// Mock Chrome Tabs API
const mockTabs = {
  query: vi.fn(),
  sendMessage: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

// Setup global chrome object
globalThis.chrome = {
  storage: mockStorage,
  runtime: mockRuntime,
  tabs: mockTabs,
} as any;

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Reset default mock implementations
  mockStorage.local.get.mockResolvedValue({});
  mockStorage.local.set.mockResolvedValue(undefined);
  mockStorage.local.remove.mockResolvedValue(undefined);
  mockStorage.local.clear.mockResolvedValue(undefined);
});
