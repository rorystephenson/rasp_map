import { AuthResponse, ForecastResponse, ForecastRegion } from './types';

const BASE_URL = 'https://www.cumulus.it/php';
const CACHE_KEY = 'forecast_locations_cache';
const CACHE_ETAG_KEY = 'forecast_locations_etag';
const CACHE_TIMESTAMP_KEY = 'forecast_locations_timestamp';
const WINDGRAM_CACHE_PREFIX = 'windgram_cache_';
const WINDGRAM_ETAG_PREFIX = 'windgram_etag_';
const WINDGRAM_TIMESTAMP_PREFIX = 'windgram_timestamp_';

interface CachedForecastData {
  data: ForecastRegion[];
  etag: string;
  timestamp: number;
}

interface WindgramResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  private isCacheValid(): boolean {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    return (now - cacheTime) < oneDay;
  }

  private getCachedData(): CachedForecastData | null {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const etag = localStorage.getItem(CACHE_ETAG_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (cachedData && etag && timestamp) {
        return {
          data: JSON.parse(cachedData),
          etag,
          timestamp: parseInt(timestamp, 10)
        };
      }
    } catch (error) {
      console.warn('Failed to parse cached forecast data:', error);
    }
    return null;
  }

  private setCachedData(data: ForecastRegion[], etag: string): void {
    try {
      const timestamp = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_ETAG_KEY, etag);
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
    } catch (error) {
      console.warn('Failed to cache forecast data:', error);
    }
  }

  private clearCache(): void {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_ETAG_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
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
        localStorage.setItem('auth_token', userKey);
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
      const cachedData = this.getCachedData();
      if (cachedData && this.isCacheValid()) {
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
      this.setCachedData(data, timestamp);
      
      console.log('Fetched fresh forecast data and cached it');
      return { success: true, data };
    } catch (error) {
      // If we have cached data, use it as fallback on network errors
      const cachedData = this.getCachedData();
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
    localStorage.removeItem('auth_token');
    // Optionally clear cache on logout
    // this.clearCache();
  }

  clearAuthOnError(): void {
    this.logout();
  }

  // Method to manually clear cache if needed
  clearForecastCache(): void {
    this.clearCache();
  }

  private getWindgramCacheKey(windgramId: string, day: number): string {
    return `${WINDGRAM_CACHE_PREFIX}${windgramId}_${day}`;
  }

  private getWindgramEtagKey(windgramId: string, day: number): string {
    return `${WINDGRAM_ETAG_PREFIX}${windgramId}_${day}`;
  }

  private getWindgramTimestampKey(windgramId: string, day: number): string {
    return `${WINDGRAM_TIMESTAMP_PREFIX}${windgramId}_${day}`;
  }

  private isWindgramCacheValid(windgramId: string, day: number): boolean {
    const timestamp = localStorage.getItem(this.getWindgramTimestampKey(windgramId, day));
    if (!timestamp) return false;
    
    const cacheTime = parseInt(timestamp, 10);
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds (windgrams update every few hours)
    
    return (now - cacheTime) < sixHours;
  }

  // Get windgram image with proper caching and ETag support
  async getWindgram(windgramId: string, day: number = 0): Promise<WindgramResponse> {
    if (!this.token) {
      return { success: false, error: 'Not authenticated' };
    }
    
    if (day < 0 || day > 4) {
      return { success: false, error: 'Day must be between 0 and 4' };
    }

    try {
      const cacheKey = this.getWindgramCacheKey(windgramId, day);
      const etagKey = this.getWindgramEtagKey(windgramId, day);
      const timestampKey = this.getWindgramTimestampKey(windgramId, day);

      // Check if we have valid cached data
      const cachedUrl = localStorage.getItem(cacheKey);
      const cachedEtag = localStorage.getItem(etagKey);
      if (cachedUrl && this.isWindgramCacheValid(windgramId, day)) {
        console.log(`Using cached windgram for ${windgramId}_${day}`);
        return { success: true, imageUrl: cachedUrl };
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

      // Note: Can't use If-None-Match header due to CORS restrictions
      // Relying on time-based caching instead

      const response = await fetch(url, { headers });

      if (!response.ok) {
        // If we have cached data but got an error, use cached data as fallback
        if (cachedUrl) {
          console.warn(`Windgram API request failed for ${windgramId}_${day}, using cached data as fallback`);
          return { success: true, imageUrl: cachedUrl };
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      // For images, we return the URL and cache it
      // Cache the URL and metadata (no ETag due to CORS restrictions)
      localStorage.setItem(cacheKey, url);
      localStorage.setItem(timestampKey, Date.now().toString());
      
      console.log(`Fetched fresh windgram for ${windgramId}_${day} and cached it`);
      return { success: true, imageUrl: url };

    } catch (error) {
      // If we have cached data, use it as fallback on network errors
      const cachedUrl = localStorage.getItem(this.getWindgramCacheKey(windgramId, day));
      if (cachedUrl) {
        console.warn(`Network error for windgram ${windgramId}_${day}, using cached data as fallback`);
        return { success: true, imageUrl: cachedUrl };
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