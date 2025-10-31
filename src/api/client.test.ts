/**
 * Tests for API Client
 */

import { apiClient } from './client';
import { storageService } from '../services/StorageService';
import { ForecastRegion } from './types';

// Mock fetch
global.fetch = jest.fn();

// Mock storageService
jest.mock('../services/StorageService', () => ({
  storageService: {
    getAuthToken: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
    getCachedForecast: jest.fn(),
    setCachedForecast: jest.fn(),
  }
}));

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('authenticate', () => {
    it('should successfully authenticate with valid key', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK'
      });

      const result = await apiClient.authenticate('test-key-123');

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-key-123');
      expect(storageService.setAuthToken).toHaveBeenCalledWith('test-key-123');
    });

    it('should fail authentication with invalid key', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => 'INVALID'
      });

      const result = await apiClient.authenticate('invalid-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid authentication key');
      expect(storageService.setAuthToken).not.toHaveBeenCalled();
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await apiClient.authenticate('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500: Internal Server Error');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.authenticate('test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getForecastLocations', () => {
    const mockForecastData: ForecastRegion[] = [
      {
        region_id: '1',
        region_name: 'Test Region',
        windgram_list: []
      }
    ];

    it('should return cached data immediately if available', async () => {
      (storageService.getCachedForecast as jest.Mock).mockReturnValueOnce(mockForecastData);
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastData
      });

      const onUpdate = jest.fn();
      const result = await apiClient.getForecastLocations(onUpdate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockForecastData);
      expect(storageService.getCachedForecast).toHaveBeenCalled();
    });

    it('should fetch fresh data when no cache exists', async () => {
      (storageService.getCachedForecast as jest.Mock).mockReturnValueOnce(null);
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecastData
      });

      const onUpdate = jest.fn();
      const result = await apiClient.getForecastLocations(onUpdate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockForecastData);
      expect(storageService.setCachedForecast).toHaveBeenCalledWith(mockForecastData);
    });

    it('should handle fetch errors when no cache exists', async () => {
      (storageService.getCachedForecast as jest.Mock).mockReturnValueOnce(null);
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const onUpdate = jest.fn();
      const result = await apiClient.getForecastLocations(onUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle HTTP errors when no cache exists', async () => {
      (storageService.getCachedForecast as jest.Mock).mockReturnValueOnce(null);
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const onUpdate = jest.fn();
      const result = await apiClient.getForecastLocations(onUpdate);

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404: Not Found');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      (storageService.getAuthToken as jest.Mock).mockReturnValueOnce('test-token');

      // Create new instance to pick up the mocked token
      const { apiClient: newClient } = require('./client');

      expect(newClient.isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear auth token', () => {
      apiClient.logout();

      expect(storageService.clearAuthToken).toHaveBeenCalled();
    });
  });

  describe('getWindgramUrl', () => {
    it('should generate correct URL with valid parameters', () => {
      // Mock the token
      (apiClient as any).token = 'test-token';

      const url = apiClient.getWindgramUrl('windgram-123', 0);

      expect(typeof url).toBe('string');
      expect(url).toContain('windgram-123');
      expect(url).toContain('test-token');
      expect(url).toContain('day=0');
    });

    it('should return error when not authenticated', () => {
      (apiClient as any).token = null;

      const result = apiClient.getWindgramUrl('windgram-123', 0);

      expect(typeof result).toBe('object');
      expect((result as any).name).toBe('Not authenticated');
      expect((result as any).message).toBe('Must be logged in');
    });

    it('should return error for invalid day parameter', () => {
      (apiClient as any).token = 'test-token';

      const result = apiClient.getWindgramUrl('windgram-123', -1);
      expect(typeof result).toBe('object');
      expect((result as any).name).toBe('Invalid day');

      const result2 = apiClient.getWindgramUrl('windgram-123', 5);
      expect(typeof result2).toBe('object');
      expect((result2 as any).name).toBe('Invalid day');
    });

    it('should handle all valid day values (0-4)', () => {
      (apiClient as any).token = 'test-token';

      for (let day = 0; day <= 4; day++) {
        const url = apiClient.getWindgramUrl('windgram-123', day);
        expect(typeof url).toBe('string');
        expect(url).toContain(`day=${day}`);
      }
    });
  });
});
