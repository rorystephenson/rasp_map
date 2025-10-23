import { AuthResponse, ForecastResponse, ForecastRegion } from './types';
import { storageService } from '../services/StorageService';

const BASE_URL = 'https://www.cumulus.it/php';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = storageService.getAuthToken();
  }


  async authenticate(userKey: string): Promise<AuthResponse> {
    try {
      const url = `${BASE_URL}/rasp_mobile.php?key=${encodeURIComponent(userKey)}&req=reg`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Origin': 'https://mobilerasp-5b91a.web.app',
        },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const text = await response.text();

      if (text.trim() === 'OK') {
        this.token = userKey;
        storageService.setAuthToken(userKey);
        return { success: true, token: userKey };
      } else {
        return { success: false, error: 'Invalid authentication key' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  async getForecastLocations(): Promise<ForecastResponse> {
    try {
      // Check if we have valid cached data
      const cachedData = storageService.getCachedForecast();
      if (cachedData && storageService.isForecastCacheValid()) {
        console.log('Using cached forecast data');
        return { success: true, data: cachedData.data };
      }

      const url = `${BASE_URL}/ajax.new.php?type=v-windgrams`;
      const headers: Record<string, string> = {
        'Accept': '*/*',
        'Origin': 'https://mobilerasp-5b91a.web.app',
      };

      // Note: Can't use If-None-Match header due to CORS restrictions
      // Relying on time-based caching instead

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        // If we have cached data but got an error, use cached data as fallback
        if (cachedData) {
          console.warn('API request failed, using cached data as fallback');
          return { success: true, data: cachedData.data };
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data: ForecastRegion[] = await response.json();

      // Cache the new data (no ETag due to CORS restrictions)
      const timestamp = Date.now().toString();
      storageService.setCachedForecast(data, timestamp);

      console.log('Fetched fresh forecast data and cached it');
      return { success: true, data };
    } catch (error) {
      // If we have cached data, use it as fallback on network errors
      const cachedData = storageService.getCachedForecast();
      if (cachedData) {
        console.warn('Network error, using cached data as fallback');
        return { success: true, data: cachedData.data };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  logout(): void {
    this.token = null;
    storageService.clearAuthToken();
    // Optionally clear cache on logout
    // storageService.clearForecastCache();
  }

  clearAuthOnError(): void {
    this.logout();
  }

  // Method to manually clear cache if needed
  clearForecastCache(): void {
    storageService.clearForecastCache();
  }

  // Get windgram image URL
  // Browser handles all caching via HTTP cache headers (Cache-Control, Expires, etc.)
  getWindgramUrl(windgramId: string, day: number = 0): Error | String {
    if (!this.token) {
      return { name: 'Not authenticated', message: 'Must be logged in' };
    }

    if (day < 0 || day > 4) {
      return { name: 'Invalid day', message: 'Day must be between 0 and 4' };
    }

    // Simply construct and return the URL
    // The browser's <img> tag will handle caching based on server's cache headers
    const params = new URLSearchParams({
      type: 'WINDGRAMS',
      key: this.token,
      secret: windgramId,
      day: day.toString()
    });

    return`https://www.cumulus.it/rasp/publicwg.php?${params.toString()}`;
  }
}

export const apiClient = new ApiClient();