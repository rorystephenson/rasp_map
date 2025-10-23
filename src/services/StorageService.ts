/**
 * Centralized service for all localStorage operations.
 * Handles reading, writing, and managing local storage with proper error handling.
 */

// Storage keys
const STORAGE_KEYS = {
  SEARCH_QUERY: 'search_query',
  SELECTED_DATE: 'selected_forecast_date',
  AUTH_TOKEN: 'auth_token',
  MAP_VIEW_STATE: 'map_view_state',
  FEATURE_FLAGS: 'feature_flags',
  FAVOURITES: 'favourite_spots',
  FORECAST_CACHE: 'forecast_locations_cache',
  FORECAST_ETAG: 'forecast_locations_etag',
  FORECAST_TIMESTAMP: 'forecast_locations_timestamp',
} as const;

// Prefix for windgram cache keys
const WINDGRAM_CACHE_PREFIX = 'windgram_cache_';

export interface MapViewState {
  center: [number, number];
  zoom: number;
  timestamp?: number; // Unix timestamp in milliseconds
}

export interface FeatureFlags {
  betaFeatures: boolean;
}

export interface CachedForecastData {
  data: any; // ForecastRegion[] from api/types
  etag: string;
  timestamp: number;
}

export interface WindgramCacheData {
  url: string;
  expiresAt: number; // Unix timestamp from server's Expires header or max-age
  lastModified?: string; // For potential If-Modified-Since support
  cachedAt: number; // When we cached it
}

class StorageService {
  /**
   * Get the last search query
   */
  getSearchQuery(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY) || '';
    } catch (error) {
      console.warn('Failed to load search query from localStorage:', error);
      return '';
    }
  }

  /**
   * Save the search query
   */
  setSearchQuery(query: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, query);
    } catch (error) {
      console.warn('Failed to save search query to localStorage:', error);
    }
  }

  /**
   * Clear the search query
   */
  clearSearchQuery(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_QUERY);
    } catch (error) {
      console.warn('Failed to clear search query from localStorage:', error);
    }
  }

  /**
   * Get the selected forecast date
   */
  getSelectedDate(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.SELECTED_DATE);
    } catch (error) {
      console.warn('Failed to load selected date from localStorage:', error);
      return null;
    }
  }

  /**
   * Save the selected forecast date
   */
  setSelectedDate(dateString: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_DATE, dateString);
    } catch (error) {
      console.warn('Failed to save selected date to localStorage:', error);
    }
  }

  /**
   * Clear the selected forecast date
   */
  clearSelectedDate(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_DATE);
    } catch (error) {
      console.warn('Failed to clear selected date from localStorage:', error);
    }
  }

  /**
   * Get the authentication token
   */
  getAuthToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.warn('Failed to load auth token from localStorage:', error);
      return null;
    }
  }

  /**
   * Save the authentication token
   */
  setAuthToken(token: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (error) {
      console.warn('Failed to save auth token to localStorage:', error);
    }
  }

  /**
   * Clear the authentication token
   */
  clearAuthToken(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (error) {
      console.warn('Failed to clear auth token from localStorage:', error);
    }
  }

  /**
   * Get the map view state
   * Returns null if no state is saved or if parsing/validation fails
   */
  getMapViewState(): MapViewState | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAP_VIEW_STATE);
      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved);

      // Validate the loaded state
      if (parsed.center && Array.isArray(parsed.center) &&
          parsed.center.length === 2 &&
          typeof parsed.zoom === 'number') {
        return parsed;
      }

      console.warn('Invalid map view state structure');
      return null;
    } catch (error) {
      console.warn('Failed to load map view state from localStorage:', error);
      return null;
    }
  }

  /**
   * Save the map view state
   * Automatically adds timestamp and checks for race conditions with other tabs
   */
  setMapViewState(state: Omit<MapViewState, 'timestamp'>): void {
    try {
      const timestamp = Date.now();
      const stateWithTimestamp: MapViewState = { ...state, timestamp };

      // Check if there's a newer save already in localStorage (from another tab)
      const existing = localStorage.getItem(STORAGE_KEYS.MAP_VIEW_STATE);
      if (existing) {
        const existingState = JSON.parse(existing);
        if (existingState.timestamp && existingState.timestamp > timestamp) {
          // Skip save - another tab has a newer state
          return;
        }
      }

      localStorage.setItem(STORAGE_KEYS.MAP_VIEW_STATE, JSON.stringify(stateWithTimestamp));
    } catch (error) {
      console.warn('Failed to save map view state to localStorage:', error);
    }
  }

  /**
   * Clear the map view state
   */
  clearMapViewState(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.MAP_VIEW_STATE);
    } catch (error) {
      console.warn('Failed to clear map view state from localStorage:', error);
    }
  }

  /**
   * Get feature flags
   * Returns null if no flags are saved or if parsing fails
   * Merges saved flags with defaults to handle new flags
   */
  getFeatureFlags(): FeatureFlags | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FEATURE_FLAGS);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);

      // Validate that parsed is an object
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('Invalid feature flags structure');
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error);
      return null;
    }
  }

  /**
   * Save feature flags
   */
  setFeatureFlags(flags: FeatureFlags): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(flags));
    } catch (error) {
      console.warn('Failed to save feature flags to localStorage:', error);
    }
  }

  /**
   * Clear feature flags
   */
  clearFeatureFlags(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.FEATURE_FLAGS);
    } catch (error) {
      console.warn('Failed to clear feature flags from localStorage:', error);
    }
  }

  /**
   * Get favourites list
   * Returns empty array if no favourites are saved or if parsing fails
   */
  getFavourites(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAVOURITES);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);

      // Validate that parsed is an array
      if (!Array.isArray(parsed)) {
        console.warn('Invalid favourites structure - expected array');
        return [];
      }

      return parsed;
    } catch (error) {
      console.warn('Failed to load favourites from localStorage:', error);
      return [];
    }
  }

  /**
   * Save favourites list
   */
  setFavourites(favourites: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(favourites));
    } catch (error) {
      console.warn('Failed to save favourites to localStorage:', error);
    }
  }

  /**
   * Clear all favourites
   */
  clearFavourites(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.FAVOURITES);
    } catch (error) {
      console.warn('Failed to clear favourites from localStorage:', error);
    }
  }

  /**
   * Get cached forecast data with etag and timestamp
   * Returns null if no cache exists or if parsing fails
   */
  getCachedForecast(): CachedForecastData | null {
    try {
      const cachedData = localStorage.getItem(STORAGE_KEYS.FORECAST_CACHE);
      const etag = localStorage.getItem(STORAGE_KEYS.FORECAST_ETAG);
      const timestamp = localStorage.getItem(STORAGE_KEYS.FORECAST_TIMESTAMP);

      if (cachedData && etag && timestamp) {
        const parsed = JSON.parse(cachedData);
        return {
          data: parsed,
          etag,
          timestamp: parseInt(timestamp, 10)
        };
      }
      return null;
    } catch (error) {
      console.warn('Failed to load cached forecast from localStorage:', error);
      return null;
    }
  }

  /**
   * Save cached forecast data with etag and timestamp
   */
  setCachedForecast(data: any, etag: string): void {
    try {
      const timestamp = Date.now();
      localStorage.setItem(STORAGE_KEYS.FORECAST_CACHE, JSON.stringify(data));
      localStorage.setItem(STORAGE_KEYS.FORECAST_ETAG, etag);
      localStorage.setItem(STORAGE_KEYS.FORECAST_TIMESTAMP, timestamp.toString());
    } catch (error) {
      console.warn('Failed to save cached forecast to localStorage:', error);
    }
  }

  /**
   * Check if forecast cache is valid (less than 24 hours old)
   */
  isForecastCacheValid(): boolean {
    try {
      const timestamp = localStorage.getItem(STORAGE_KEYS.FORECAST_TIMESTAMP);
      if (!timestamp) return false;

      const cacheTime = parseInt(timestamp, 10);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000; // 24 hours

      return (now - cacheTime) < oneDay;
    } catch (error) {
      console.warn('Failed to check forecast cache validity:', error);
      return false;
    }
  }

  /**
   * Clear forecast cache
   */
  clearForecastCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.FORECAST_CACHE);
      localStorage.removeItem(STORAGE_KEYS.FORECAST_ETAG);
      localStorage.removeItem(STORAGE_KEYS.FORECAST_TIMESTAMP);
    } catch (error) {
      console.warn('Failed to clear forecast cache from localStorage:', error);
    }
  }

  /**
   * Calculate forecast date from day offset
   * @param dayOffset 0 = today, 1 = tomorrow, etc.
   */
  private getForecastDate(dayOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
  }

  /**
   * Get windgram cache key for a specific windgram and day offset
   */
  private getWindgramCacheKey(windgramId: string, dayOffset: number): string {
    const forecastDate = this.getForecastDate(dayOffset);
    return `${WINDGRAM_CACHE_PREFIX}${windgramId}_${forecastDate}`;
  }

  /**
   * Get cached windgram data
   * Returns null if no cache exists or if expired
   */
  getCachedWindgram(windgramId: string, dayOffset: number): WindgramCacheData | null {
    try {
      const key = this.getWindgramCacheKey(windgramId, dayOffset);
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed: WindgramCacheData = JSON.parse(cached);

      // Validate structure
      if (!parsed.url || !parsed.expiresAt || !parsed.cachedAt) {
        console.warn(`Invalid windgram cache structure for ${windgramId}_${dayOffset}`);
        return null;
      }

      return parsed;
    } catch (error) {
      console.warn(`Failed to load cached windgram for ${windgramId}_${dayOffset}:`, error);
      return null;
    }
  }

  /**
   * Save cached windgram data with expiration from server
   */
  setCachedWindgram(windgramId: string, dayOffset: number, data: WindgramCacheData): void {
    try {
      const key = this.getWindgramCacheKey(windgramId, dayOffset);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to save cached windgram for ${windgramId}_${dayOffset}:`, error);
    }
  }

  /**
   * Check if windgram cache is valid (not expired according to server's expiration)
   */
  isWindgramCacheValid(windgramId: string, dayOffset: number): boolean {
    try {
      const cached = this.getCachedWindgram(windgramId, dayOffset);
      if (!cached) return false;

      const now = Date.now();
      return now < cached.expiresAt;
    } catch (error) {
      console.warn(`Failed to check windgram cache validity for ${windgramId}_${dayOffset}:`, error);
      return false;
    }
  }

  /**
   * Clear a specific windgram cache
   */
  clearWindgramCache(windgramId: string, dayOffset: number): void {
    try {
      const key = this.getWindgramCacheKey(windgramId, dayOffset);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear windgram cache for ${windgramId}_${dayOffset}:`, error);
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
