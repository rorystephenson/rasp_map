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
} as const;


export interface MapViewState {
  center: [number, number];
  zoom: number;
  timestamp?: number; // Unix timestamp in milliseconds
}

export interface FeatureFlags {
  betaFeatures: boolean;
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
   * Get cached forecast data
   * Returns null if no cache exists or if parsing fails
   */
  getCachedForecast(): any | null {
    try {
      const cachedData = localStorage.getItem(STORAGE_KEYS.FORECAST_CACHE);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.warn('Failed to load cached forecast from localStorage:', error);
      return null;
    }
  }

  /**
   * Save cached forecast data
   */
  setCachedForecast(data: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FORECAST_CACHE, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cached forecast to localStorage:', error);
    }
  }

  /**
   * Clear forecast cache
   */
  clearForecastCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.FORECAST_CACHE);
    } catch (error) {
      console.warn('Failed to clear forecast cache from localStorage:', error);
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
