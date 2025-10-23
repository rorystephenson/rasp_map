/**
 * Tests for StorageService
 */

import { storageService, MapViewState, FeatureFlags } from './StorageService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('StorageService', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('search query', () => {
    it('should return empty string when no query is saved', () => {
      expect(storageService.getSearchQuery()).toBe('');
    });

    it('should save and retrieve search query', () => {
      storageService.setSearchQuery('test query');
      expect(storageService.getSearchQuery()).toBe('test query');
    });

    it('should update existing search query', () => {
      storageService.setSearchQuery('first query');
      storageService.setSearchQuery('second query');
      expect(storageService.getSearchQuery()).toBe('second query');
    });

    it('should save empty string', () => {
      storageService.setSearchQuery('test');
      storageService.setSearchQuery('');
      expect(storageService.getSearchQuery()).toBe('');
    });

    it('should clear search query', () => {
      storageService.setSearchQuery('test query');
      storageService.clearSearchQuery();
      expect(storageService.getSearchQuery()).toBe('');
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getSearchQuery()).toBe('');

      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.setSearchQuery('test')).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save search query to localStorage:',
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage removeItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.clearSearchQuery()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to clear search query from localStorage:',
        expect.any(Error)
      );

      localStorageMock.removeItem = originalRemoveItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle special characters in query', () => {
      const specialQuery = 'test & <query> "with" \'quotes\'';
      storageService.setSearchQuery(specialQuery);
      expect(storageService.getSearchQuery()).toBe(specialQuery);
    });

    it('should handle unicode characters', () => {
      const unicodeQuery = 'città montagna 🏔️';
      storageService.setSearchQuery(unicodeQuery);
      expect(storageService.getSearchQuery()).toBe(unicodeQuery);
    });

    it('should handle very long queries', () => {
      const longQuery = 'a'.repeat(1000);
      storageService.setSearchQuery(longQuery);
      expect(storageService.getSearchQuery()).toBe(longQuery);
    });
  });

  describe('selected date', () => {
    it('should return null when no date is saved', () => {
      expect(storageService.getSelectedDate()).toBe(null);
    });

    it('should save and retrieve selected date', () => {
      storageService.setSelectedDate('2023-09-10');
      expect(storageService.getSelectedDate()).toBe('2023-09-10');
    });

    it('should update existing selected date', () => {
      storageService.setSelectedDate('2023-09-10');
      storageService.setSelectedDate('2023-09-11');
      expect(storageService.getSelectedDate()).toBe('2023-09-11');
    });

    it('should handle date format YYYY-MM-DD', () => {
      const testDate = '2024-02-29'; // Leap year date
      storageService.setSelectedDate(testDate);
      expect(storageService.getSelectedDate()).toBe(testDate);
    });

    it('should clear selected date', () => {
      storageService.setSelectedDate('2023-09-10');
      storageService.clearSelectedDate();
      expect(storageService.getSelectedDate()).toBe(null);
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getSelectedDate()).toBe(null);

      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.setSelectedDate('2023-09-10')).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save selected date to localStorage:',
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage removeItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.clearSelectedDate()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to clear selected date from localStorage:',
        expect.any(Error)
      );

      localStorageMock.removeItem = originalRemoveItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle various date formats', () => {
      const dates = [
        '2023-01-01', // Start of year
        '2023-12-31', // End of year
        '2024-02-29', // Leap year
        '2023-09-30', // End of month
      ];

      dates.forEach(date => {
        storageService.setSelectedDate(date);
        expect(storageService.getSelectedDate()).toBe(date);
      });
    });
  });

  describe('auth token', () => {
    it('should return null when no token is saved', () => {
      expect(storageService.getAuthToken()).toBe(null);
    });

    it('should save and retrieve auth token', () => {
      storageService.setAuthToken('test-token-123');
      expect(storageService.getAuthToken()).toBe('test-token-123');
    });

    it('should update existing auth token', () => {
      storageService.setAuthToken('first-token');
      storageService.setAuthToken('second-token');
      expect(storageService.getAuthToken()).toBe('second-token');
    });

    it('should handle token format XXXX-XXXX-XXXX-XXXX', () => {
      const token = '1234-5678-9012-3456';
      storageService.setAuthToken(token);
      expect(storageService.getAuthToken()).toBe(token);
    });

    it('should clear auth token', () => {
      storageService.setAuthToken('test-token');
      storageService.clearAuthToken();
      expect(storageService.getAuthToken()).toBe(null);
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getAuthToken()).toBe(null);

      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.setAuthToken('test-token')).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save auth token to localStorage:',
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage removeItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.clearAuthToken()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to clear auth token from localStorage:',
        expect.any(Error)
      );

      localStorageMock.removeItem = originalRemoveItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle various token formats', () => {
      const tokens = [
        'simple-token',
        '1234-5678-9012-3456',
        'very-long-token-with-many-characters-' + 'a'.repeat(100),
        'token_with_underscores',
        'token.with.dots',
      ];

      tokens.forEach(token => {
        storageService.setAuthToken(token);
        expect(storageService.getAuthToken()).toBe(token);
      });
    });
  });

  describe('map view state', () => {
    const validState: Omit<MapViewState, 'timestamp'> = {
      center: [42.5, 12.5],
      zoom: 6
    };

    it('should return null when no state is saved', () => {
      expect(storageService.getMapViewState()).toBe(null);
    });

    it('should save and retrieve map view state', () => {
      storageService.setMapViewState(validState);
      const retrieved = storageService.getMapViewState();

      expect(retrieved).not.toBe(null);
      expect(retrieved?.center).toEqual([42.5, 12.5]);
      expect(retrieved?.zoom).toBe(6);
      expect(retrieved?.timestamp).toBeDefined();
      expect(typeof retrieved?.timestamp).toBe('number');
    });

    it('should update existing map view state', () => {
      storageService.setMapViewState(validState);
      storageService.setMapViewState({ center: [45, 10], zoom: 8 });

      const retrieved = storageService.getMapViewState();
      expect(retrieved?.center).toEqual([45, 10]);
      expect(retrieved?.zoom).toBe(8);
    });

    it('should automatically add timestamp', () => {
      const beforeTime = Date.now();
      storageService.setMapViewState(validState);
      const afterTime = Date.now();

      const retrieved = storageService.getMapViewState();
      expect(retrieved?.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(retrieved?.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should clear map view state', () => {
      storageService.setMapViewState(validState);
      storageService.clearMapViewState();
      expect(storageService.getMapViewState()).toBe(null);
    });

    it('should validate center is array with 2 elements', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Manually set invalid data
      localStorageMock.setItem('map_view_state', JSON.stringify({
        center: [42.5], // Invalid - only 1 element
        zoom: 6
      }));

      expect(storageService.getMapViewState()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid map view state structure');

      consoleWarnSpy.mockRestore();
    });

    it('should validate zoom is a number', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Manually set invalid data
      localStorageMock.setItem('map_view_state', JSON.stringify({
        center: [42.5, 12.5],
        zoom: 'invalid' // Invalid - not a number
      }));

      expect(storageService.getMapViewState()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid map view state structure');

      consoleWarnSpy.mockRestore();
    });

    it('should handle malformed JSON', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      localStorageMock.setItem('map_view_state', 'invalid json{');

      expect(storageService.getMapViewState()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getMapViewState()).toBe(null);

      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.setMapViewState(validState)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save map view state to localStorage:',
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle various coordinate values', () => {
      const testCases = [
        { center: [0, 0], zoom: 1 },
        { center: [90, 180], zoom: 20 },
        { center: [-90, -180], zoom: 0 },
        { center: [42.123456, 12.654321], zoom: 10.5 },
      ] as Array<Omit<MapViewState, 'timestamp'>>;

      testCases.forEach(state => {
        storageService.setMapViewState(state);
        const retrieved = storageService.getMapViewState();
        expect(retrieved?.center).toEqual(state.center);
        expect(retrieved?.zoom).toBe(state.zoom);
      });
    });

    it('should not save if existing timestamp is newer (race condition)', () => {
      // Save initial state with current timestamp
      storageService.setMapViewState(validState);
      const firstSave = storageService.getMapViewState();

      // Manually set a future timestamp
      const futureState: MapViewState = {
        center: [50, 15],
        zoom: 10,
        timestamp: Date.now() + 10000 // 10 seconds in the future
      };
      localStorageMock.setItem('map_view_state', JSON.stringify(futureState));

      // Try to save a new state - should be rejected due to newer timestamp
      storageService.setMapViewState({ center: [40, 8], zoom: 5 });

      // Should still have the future state
      const retrieved = storageService.getMapViewState();
      expect(retrieved?.center).toEqual([50, 15]);
      expect(retrieved?.zoom).toBe(10);
    });
  });

  describe('feature flags', () => {
    const validFlags: FeatureFlags = {
      betaFeatures: true
    };

    it('should return null when no flags are saved', () => {
      expect(storageService.getFeatureFlags()).toBe(null);
    });

    it('should save and retrieve feature flags', () => {
      storageService.setFeatureFlags(validFlags);
      const retrieved = storageService.getFeatureFlags();

      expect(retrieved).not.toBe(null);
      expect(retrieved?.betaFeatures).toBe(true);
    });

    it('should update existing feature flags', () => {
      storageService.setFeatureFlags({ betaFeatures: true });
      storageService.setFeatureFlags({ betaFeatures: false });

      const retrieved = storageService.getFeatureFlags();
      expect(retrieved?.betaFeatures).toBe(false);
    });

    it('should clear feature flags', () => {
      storageService.setFeatureFlags(validFlags);
      storageService.clearFeatureFlags();
      expect(storageService.getFeatureFlags()).toBe(null);
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getFeatureFlags()).toBe(null);

      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.setFeatureFlags(validFlags)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save feature flags to localStorage:',
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage removeItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalRemoveItem = localStorageMock.removeItem;
      localStorageMock.removeItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.clearFeatureFlags()).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to clear feature flags from localStorage:',
        expect.any(Error)
      );

      localStorageMock.removeItem = originalRemoveItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle malformed JSON', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      localStorageMock.setItem('feature_flags', 'invalid json{');

      expect(storageService.getFeatureFlags()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should validate flags is an object', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Manually set invalid data (string instead of object)
      localStorageMock.setItem('feature_flags', JSON.stringify('invalid'));

      expect(storageService.getFeatureFlags()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid feature flags structure');

      consoleWarnSpy.mockRestore();
    });

    it('should validate flags is not null', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      localStorageMock.setItem('feature_flags', JSON.stringify(null));

      expect(storageService.getFeatureFlags()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid feature flags structure');

      consoleWarnSpy.mockRestore();
    });

    it('should handle betaFeatures as false', () => {
      storageService.setFeatureFlags({ betaFeatures: false });
      const retrieved = storageService.getFeatureFlags();
      expect(retrieved?.betaFeatures).toBe(false);
    });

    it('should preserve unknown flag properties', () => {
      // Set flags with an additional property
      const extendedFlags = { betaFeatures: true, unknownFlag: 'test' } as any;
      localStorageMock.setItem('feature_flags', JSON.stringify(extendedFlags));

      const retrieved = storageService.getFeatureFlags();
      expect(retrieved?.betaFeatures).toBe(true);
      expect((retrieved as any)?.unknownFlag).toBe('test');
    });
  });

  describe('favourites', () => {
    it('should return empty array when no favourites are saved', () => {
      expect(storageService.getFavourites()).toEqual([]);
    });

    it('should save and retrieve favourites', () => {
      const favourites = ['spot1', 'spot2', 'spot3'];
      storageService.setFavourites(favourites);
      expect(storageService.getFavourites()).toEqual(favourites);
    });

    it('should update existing favourites', () => {
      storageService.setFavourites(['spot1', 'spot2']);
      storageService.setFavourites(['spot3', 'spot4', 'spot5']);
      expect(storageService.getFavourites()).toEqual(['spot3', 'spot4', 'spot5']);
    });

    it('should clear favourites', () => {
      storageService.setFavourites(['spot1', 'spot2']);
      storageService.clearFavourites();
      expect(storageService.getFavourites()).toEqual([]);
    });

    it('should handle empty array', () => {
      storageService.setFavourites([]);
      expect(storageService.getFavourites()).toEqual([]);
    });

    it('should handle localStorage getItem errors gracefully', () => {
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getFavourites()).toEqual([]);

      localStorageMock.getItem = originalGetItem;
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('localStorage error');
      };

      expect(() => storageService.setFavourites(['spot1'])).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save favourites to localStorage:',
        expect.any(Error)
      );

      localStorageMock.setItem = originalSetItem;
      consoleWarnSpy.mockRestore();
    });

    it('should handle malformed JSON', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      localStorageMock.setItem('favourite_spots', 'invalid json{');

      expect(storageService.getFavourites()).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should validate favourites is an array', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Manually set invalid data (object instead of array)
      localStorageMock.setItem('favourite_spots', JSON.stringify({ invalid: 'data' }));

      expect(storageService.getFavourites()).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid favourites structure - expected array');

      consoleWarnSpy.mockRestore();
    });

    it('should handle various spot ID formats', () => {
      const spotIds = [
        'simple-id',
        '123-numeric',
        'id_with_underscores',
        'id.with.dots',
        'UPPERCASE',
      ];

      storageService.setFavourites(spotIds);
      expect(storageService.getFavourites()).toEqual(spotIds);
    });

    it('should preserve order of favourites', () => {
      const ordered = ['z-spot', 'a-spot', 'm-spot'];
      storageService.setFavourites(ordered);
      expect(storageService.getFavourites()).toEqual(ordered);
    });
  });

  describe('forecast cache', () => {
    it('should return null when no forecast cache exists', () => {
      expect(storageService.getCachedForecast()).toBe(null);
    });

    it('should save and retrieve forecast cache', () => {
      const testData = [{ id: 1, name: 'Test Region' }];
      const etag = 'test-etag-123';

      storageService.setCachedForecast(testData, etag);
      const cached = storageService.getCachedForecast();

      expect(cached).not.toBe(null);
      expect(cached?.data).toEqual(testData);
      expect(cached?.etag).toBe(etag);
      expect(cached?.timestamp).toBeGreaterThan(0);
    });

    it('should validate cache is less than 24 hours old', () => {
      const testData = [{ id: 1, name: 'Test' }];
      storageService.setCachedForecast(testData, 'etag');

      expect(storageService.isForecastCacheValid()).toBe(true);
    });

    it('should return false for expired cache (25 hours old)', () => {
      const testData = [{ id: 1, name: 'Test' }];
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      localStorageMock.setItem('forecast_locations_cache', JSON.stringify(testData));
      localStorageMock.setItem('forecast_locations_etag', 'etag');
      localStorageMock.setItem('forecast_locations_timestamp', oldTimestamp.toString());

      expect(storageService.isForecastCacheValid()).toBe(false);
    });

    it('should return false for missing timestamp', () => {
      expect(storageService.isForecastCacheValid()).toBe(false);
    });

    it('should clear forecast cache', () => {
      const testData = [{ id: 1, name: 'Test' }];
      storageService.setCachedForecast(testData, 'etag');

      storageService.clearForecastCache();

      expect(storageService.getCachedForecast()).toBe(null);
      expect(storageService.isForecastCacheValid()).toBe(false);
    });

    it('should handle missing parts of cache data', () => {
      // Only set data, missing etag and timestamp
      localStorageMock.setItem('forecast_locations_cache', JSON.stringify([{ id: 1 }]));
      expect(storageService.getCachedForecast()).toBe(null);
    });

    it('should handle malformed JSON in cache', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      localStorageMock.setItem('forecast_locations_cache', 'invalid json{');
      localStorageMock.setItem('forecast_locations_etag', 'etag');
      localStorageMock.setItem('forecast_locations_timestamp', Date.now().toString());

      expect(storageService.getCachedForecast()).toBe(null);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('localStorage error');
      };

      expect(storageService.getCachedForecast()).toBe(null);
      expect(storageService.isForecastCacheValid()).toBe(false);

      localStorageMock.getItem = originalGetItem;
      consoleWarnSpy.mockRestore();
    });
  });

});

