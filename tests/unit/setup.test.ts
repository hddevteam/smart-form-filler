import { describe, it, expect } from 'vitest';

describe('Test Setup Verification', () => {
  it('should run tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should have access to chrome mock', () => {
    expect(chrome).toBeDefined();
    expect(chrome.storage).toBeDefined();
    expect(chrome.runtime).toBeDefined();
  });

  it('should mock chrome.storage.local.get', async () => {
    const testData = { key: 'value' };
    chrome.storage.local.get = vi.fn().mockResolvedValue(testData);

    const result = await chrome.storage.local.get('key');

    expect(result).toEqual(testData);
    expect(chrome.storage.local.get).toHaveBeenCalledWith('key');
  });
});
