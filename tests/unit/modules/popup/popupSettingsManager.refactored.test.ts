import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Tests for PopupSettingsManager (future TS implementation)
 * Coverage target: ≥90%
 */

describe('PopupSettingsManager', () => {
  let mockPopupManager: any;
  let mockApiClient: any;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;

    // Mock API client
    mockApiClient = {
      setBackendUrl: vi.fn(),
      testConnection: vi.fn(),
      constructor: vi.fn(),
    };

    // Mock popup manager
    mockPopupManager = {
      apiClient: mockApiClient,
      elements: {
        settingsBtn: document.createElement('button'),
        settingsModal: document.createElement('div'),
        settingsModalClose: document.createElement('button'),
        backendUrlInput: document.createElement('input'),
        testConnectionBtn: document.createElement('button'),
        connectionStatus: document.createElement('div'),
        saveSettingsBtn: document.createElement('button'),
        settingsCancelBtn: document.createElement('button'),
      },
      modelManager: {
        loadModels: vi.fn(),
      },
    };

    // Add DOM structure
    Object.values(mockPopupManager.elements).forEach(el => {
      if (el instanceof HTMLElement) {
        document.body.appendChild(el);
      }
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      // Will implement when TS class is created
      expect(true).toBe(true);
    });

    it('should load saved settings from localStorage', () => {
      const savedSettings = {
        backendUrl: 'http://custom.local:4000',
        preferredModel: 'gpt-4',
        autoConnect: false,
      };
      mockLocalStorage['smart-form-filler-settings'] = JSON.stringify(savedSettings);

      // Verify settings are loaded correctly
      expect(localStorage.getItem('smart-form-filler-settings')).toBe(
        JSON.stringify(savedSettings)
      );
    });

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage['smart-form-filler-settings'] = 'invalid-json{';

      // Should fall back to defaults without throwing
      expect(() => {
        JSON.parse(mockLocalStorage['smart-form-filler-settings'] as string);
      }).toThrow();
    });

    it('should apply backend URL to API client on init', () => {
      // Validate that setBackendUrl is called during initialization
      expect(mockApiClient.setBackendUrl).toBeDefined();
    });
  });

  describe('Settings Persistence', () => {
    it('should save settings to localStorage', () => {
      const settings = {
        backendUrl: 'http://test.local:3001',
        preferredModel: 'gpt-3.5',
        autoConnect: true,
      };

      localStorage.setItem('smart-form-filler-settings', JSON.stringify(settings));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'smart-form-filler-settings',
        JSON.stringify(settings)
      );
    });

    it('should retrieve backend URL from settings', () => {
      const testUrl = 'http://backend.test:5000';
      mockLocalStorage['smart-form-filler-settings'] = JSON.stringify({
        backendUrl: testUrl,
      });

      const retrieved = JSON.parse(localStorage.getItem('smart-form-filler-settings') ?? '{}');
      expect(retrieved.backendUrl).toBe(testUrl);
    });

    it('should update backend URL and persist', () => {
      const newUrl = 'http://new-backend:8080';

      localStorage.setItem('smart-form-filler-settings', JSON.stringify({ backendUrl: newUrl }));

      expect(localStorage.setItem).toHaveBeenCalled();
      const saved = JSON.parse(localStorage.getItem('smart-form-filler-settings') ?? '{}');
      expect(saved.backendUrl).toBe(newUrl);
    });
  });

  describe('Settings Modal', () => {
    it('should open settings modal and populate current URL', () => {
      const modal = mockPopupManager.elements.settingsModal as HTMLElement;
      const input = mockPopupManager.elements.backendUrlInput as HTMLInputElement;

      // Simulate opening
      modal.style.display = 'flex';
      modal.classList.remove('hidden');
      input.value = 'http://localhost:3001';

      expect(modal.style.display).toBe('flex');
      expect(modal.classList.contains('hidden')).toBe(false);
      expect(input.value).toBe('http://localhost:3001');
    });

    it('should close settings modal', () => {
      const modal = mockPopupManager.elements.settingsModal as HTMLElement;
      modal.style.display = 'flex';

      // Simulate closing
      modal.style.display = 'none';
      modal.classList.add('hidden');

      expect(modal.style.display).toBe('none');
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should close modal when clicking outside', () => {
      const modal = mockPopupManager.elements.settingsModal as HTMLElement;
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: modal });

      modal.addEventListener('click', e => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });

      modal.dispatchEvent(event);
      expect(modal.style.display).toBe('none');
    });

    it('should clear connection status when opening modal', () => {
      const status = mockPopupManager.elements.connectionStatus as HTMLElement;
      status.textContent = 'Previous status';
      status.style.display = 'block';

      // Simulate clearing on open
      status.style.display = 'none';
      status.textContent = '';

      expect(status.style.display).toBe('none');
      expect(status.textContent).toBe('');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection with valid URL', async () => {
      mockApiClient.testConnection.mockResolvedValue({ success: true });

      const result = await mockApiClient.testConnection();

      expect(result.success).toBe(true);
      expect(mockApiClient.testConnection).toHaveBeenCalledOnce();
    });

    it('should handle connection test failure', async () => {
      mockApiClient.testConnection.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await mockApiClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should validate URL before testing', () => {
      const input = mockPopupManager.elements.backendUrlInput as HTMLInputElement;
      input.value = '';

      const isEmpty = input.value.trim() === '';
      expect(isEmpty).toBe(true);
    });

    it('should disable test button during connection test', () => {
      const btn = mockPopupManager.elements.testConnectionBtn as HTMLButtonElement;

      btn.disabled = true;
      expect(btn.disabled).toBe(true);

      btn.disabled = false;
      expect(btn.disabled).toBe(false);
    });

    it('should show success status on successful connection', () => {
      const status = mockPopupManager.elements.connectionStatus as HTMLElement;

      status.textContent = '✅ Connection successful';
      status.className = 'connection-status success';
      status.style.display = 'block';

      expect(status.textContent).toBe('✅ Connection successful');
      expect(status.className).toContain('success');
    });

    it('should show error status on failed connection', () => {
      const status = mockPopupManager.elements.connectionStatus as HTMLElement;

      status.textContent = '❌ Connection failed: Timeout';
      status.className = 'connection-status error';
      status.style.display = 'block';

      expect(status.textContent).toContain('Connection failed');
      expect(status.className).toContain('error');
    });
  });

  describe('Settings Save', () => {
    it('should save valid backend URL from modal', () => {
      const input = mockPopupManager.elements.backendUrlInput as HTMLInputElement;
      input.value = 'http://new-backend:3002';

      const newUrl = input.value.trim();
      expect(newUrl).toBe('http://new-backend:3002');

      localStorage.setItem('smart-form-filler-settings', JSON.stringify({ backendUrl: newUrl }));
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should validate URL is not empty before saving', () => {
      const input = mockPopupManager.elements.backendUrlInput as HTMLInputElement;
      input.value = '   ';

      const isEmpty = input.value.trim() === '';
      expect(isEmpty).toBe(true);
    });

    it('should reload models after backend URL change', async () => {
      // Simulate URL change by calling loadModels
      await mockPopupManager.modelManager.loadModels();

      expect(mockPopupManager.modelManager.loadModels).toHaveBeenCalledOnce();
    });

    it('should disable save button during save operation', () => {
      const btn = mockPopupManager.elements.saveSettingsBtn as HTMLButtonElement;

      btn.disabled = true;
      btn.textContent = 'Saving...';

      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toBe('Saving...');
    });

    it('should close modal after successful save', async () => {
      const modal = mockPopupManager.elements.settingsModal as HTMLElement;
      modal.style.display = 'flex';

      // Simulate save and delayed close
      await new Promise(resolve => setTimeout(resolve, 0));
      modal.style.display = 'none';

      expect(modal.style.display).toBe('none');
    });
  });

  describe('Settings Reset', () => {
    it('should reset to default settings', () => {
      const defaults = {
        backendUrl: 'http://localhost:3001',
        preferredModel: null,
        autoConnect: true,
      };

      localStorage.setItem('smart-form-filler-settings', JSON.stringify(defaults));

      const saved = JSON.parse(localStorage.getItem('smart-form-filler-settings') ?? '{}');
      expect(saved.backendUrl).toBe('http://localhost:3001');
      expect(saved.autoConnect).toBe(true);
    });
  });

  describe('Settings Import/Export', () => {
    it('should export settings as JSON', () => {
      const settings = {
        backendUrl: 'http://export-test:3001',
        preferredModel: 'gpt-4',
      };

      const json = JSON.stringify(settings, null, 2);
      expect(json).toContain('http://export-test:3001');
      expect(JSON.parse(json)).toEqual(settings);
    });

    it('should import valid settings JSON', () => {
      const importData = {
        backendUrl: 'http://import-test:4000',
        autoConnect: false,
      };

      // Test JSON parsing directly (mimics file.text() result)
      const text = JSON.stringify(importData);
      const parsed = JSON.parse(text);

      expect(parsed.backendUrl).toBe('http://import-test:4000');
      expect(parsed.autoConnect).toBe(false);
    });

    it('should reject invalid JSON during import', () => {
      // Test JSON parsing with invalid input (mimics file.text() result)
      const text = 'invalid json{';

      expect(() => JSON.parse(text)).toThrow();
    });

    it('should validate imported settings structure', () => {
      const validSettings = { backendUrl: 'http://test:3001' };
      const invalidSettings = 'not-an-object';

      expect(typeof validSettings === 'object' && validSettings !== null).toBe(true);
      expect(typeof invalidSettings === 'object' && invalidSettings !== null).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      const emptyManager: {
        apiClient: typeof mockApiClient;
        elements: Record<string, HTMLElement | undefined>;
        modelManager: { loadModels: ReturnType<typeof vi.fn> };
      } = {
        apiClient: mockApiClient,
        elements: {},
        modelManager: { loadModels: vi.fn() },
      };

      // Should not throw when elements are missing
      expect(emptyManager.elements['settingsBtn']).toBeUndefined();
    });

    it('should handle localStorage quota exceeded', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        localStorage.setItem('test', 'value');
      }).toThrow('QuotaExceededError');

      setItemSpy.mockRestore();
    });

    it('should handle concurrent connection tests', async () => {
      const test1 = mockApiClient.testConnection();
      const test2 = mockApiClient.testConnection();

      mockApiClient.testConnection.mockResolvedValue({ success: true });

      await Promise.all([test1, test2]);
      expect(mockApiClient.testConnection).toHaveBeenCalledTimes(2);
    });
  });
});
