import { AuthResponse, ForecastResponse, ForecastRegion } from './types';

const BASE_URL = 'https://www.cumulus.it/php';
const CACHE_KEY = 'forecast_locations_cache';
const CACHE_ETAG_KEY = 'forecast_locations_etag';
const CACHE_TIMESTAMP_KEY = 'forecast_locations_timestamp';

interface CachedForecastData {
  data: ForecastRegion[];
  etag: string;
  timestamp: number;
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

      // Add If-None-Match header if we have an ETag from cache
      if (cachedData?.etag) {
        headers['If-None-Match'] = cachedData.etag;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      // If 304 Not Modified, use cached data and update timestamp
      if (response.status === 304 && cachedData) {
        console.log('Data not modified, refreshing cache timestamp');
        this.setCachedData(cachedData.data, cachedData.etag);
        return { success: true, data: cachedData.data };
      }

      if (!response.ok) {
        // If we have cached data but got an error, use cached data as fallback
        if (cachedData) {
          console.warn('API request failed, using cached data as fallback');
          return { success: true, data: cachedData.data };
        }
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data: ForecastRegion[] = await response.json();
      
      // Cache the new data with ETag if available
      const etag = response.headers.get('ETag') || response.headers.get('etag') || Date.now().toString();
      this.setCachedData(data, etag);
      
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
}

export const apiClient = new ApiClient();