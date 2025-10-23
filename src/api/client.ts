import { AuthResponse, ForecastResponse, ForecastRegion } from './types';
import { storageService } from '../services/StorageService';

const BASE_URL = 'https://www.cumulus.it/php';

interface WindgramResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

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

  // Get windgram image with proper caching using server's Expires header
  async getWindgram(windgramId: string, day: number = 0): Promise<WindgramResponse> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }

    if (day < 0 || day > 4) {
      return { success: false, error: 'Day must be between 0 and 4' };
    }

    try {
      // Check if we have valid cached data
      const cached = storageService.getCachedWindgram(windgramId, day);
      if (cached && storageService.isWindgramCacheValid(windgramId, day)) {
        console.log(`Using cached windgram for ${windgramId} day ${day}`);
        return { success: true, imageUrl: cached.url };
      }

      const params = new URLSearchParams({
        type: 'WINDGRAMS',
        key: this.token,
        secret: windgramId,
        day: day.toString()
      });

      const url = `https://www.cumulus.it/rasp/publicwg.php?${params.toString()}`;
      const headers: Record<string, string> = {
        'Accept': 'image/*',
        'Origin': 'https://mobilerasp-5b91a.web.app',
      };

      const response = await fetch(url, { headers });

      if (!response.ok) {
        // If we have cached data but got an error, use cached data as fallback
        if (cached) {
          console.warn(`Windgram API request failed for ${windgramId} day ${day}, using cached data as fallback`);
          return { success: true, imageUrl: cached.url };
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // Parse cache headers from response
      const expiresHeader = response.headers.get('expires');
      const cacheControlHeader = response.headers.get('cache-control');
      const lastModifiedHeader = response.headers.get('last-modified');

      // Calculate expiration time
      let expiresAt = Date.now() + (30 * 60 * 1000); // Default: 30 minutes

      if (cacheControlHeader) {
        const maxAgeMatch = cacheControlHeader.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          expiresAt = Date.now() + (parseInt(maxAgeMatch[1], 10) * 1000);
        }
      } else if (expiresHeader) {
        const expiresDate = new Date(expiresHeader);
        if (!isNaN(expiresDate.getTime())) {
          expiresAt = expiresDate.getTime();
        }
      }

      // Cache the windgram data
      storageService.setCachedWindgram(windgramId, day, {
        url,
        expiresAt,
        lastModified: lastModifiedHeader || undefined,
        cachedAt: Date.now()
      });

      console.log(`Fetched fresh windgram for ${windgramId} day ${day} and cached until ${new Date(expiresAt).toISOString()}`);
      return { success: true, imageUrl: url };

    } catch (error) {
      // If we have cached data, use it as fallback on network errors
      const cached = storageService.getCachedWindgram(windgramId, day);
      if (cached) {
        console.warn(`Network error for windgram ${windgramId} day ${day}, using cached data as fallback`);
        return { success: true, imageUrl: cached.url };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Legacy method for backwards compatibility (returns URL directly)
  getWindgramUrl(windgramId: string, day: number = 0): string {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    if (day < 0 || day > 4) {
      throw new Error('Day must be between 0 and 4');
    }

    const params = new URLSearchParams({
      type: 'WINDGRAMS',
      key: this.token,
      secret: windgramId,
      day: day.toString()
    });

    return `https://www.cumulus.it/rasp/publicwg.php?${params.toString()}`;
  }
}

export const apiClient = new ApiClient();