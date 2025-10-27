import { AuthResponse, ForecastResponse, ForecastRegion } from './types';
import { storageService } from '../services/StorageService';

const BASE_URL = 'https://www.cumulus.it/php';
const REQUEST_ORIGIN = 'https://rasp.balanci.ng'

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
          'Origin': REQUEST_ORIGIN,
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

  async getForecastLocations(onUpdate: (data: ForecastRegion[]) => void): Promise<ForecastResponse> {
    // Load cache immediately if it exists (for fast initial render)
    const cachedData = storageService.getCachedForecast();

    if (cachedData) {
      console.log('Returning cached forecast data immediately');

      // Start background fetch to revalidate
      this.revalidateForecastCache(cachedData, onUpdate);

      return { success: true, data: cachedData };
    }

    // No cache - fetch from server and wait
    return this.fetchFreshForecastLocations();
  }

  private async revalidateForecastCache(cachedData:  ForecastRegion[], onUpdate: ((data: ForecastRegion[]) => void)): Promise<void> {
    const forecastLocationsResponse = await this.fetchForecastLocations();
    const {success, data, error} = forecastLocationsResponse;

    if (!success || !data) {
      console.log(`Forecast data revalidation failed: ${error}`);
      return;
    }

    // Compare with cache - only update if data has changed
    const dataChanged = JSON.stringify(cachedData) !== JSON.stringify(data);
    if (dataChanged) {
      console.log('Forecast data changed during revalidation, updating cache');
      storageService.setCachedForecast(data);
      onUpdate(data);
    } else {
      console.log('Forecast data unchanged during revalidation');
    }
  }

  private async fetchFreshForecastLocations(): Promise<ForecastResponse> {
    const forecastLocationsResponse = await this.fetchForecastLocations();
    const {success, data} = forecastLocationsResponse;

    if (success && data) {
      console.log('Caching fresh forecast data');
      storageService.setCachedForecast(data);
    }

    return forecastLocationsResponse;
  }

  private async fetchForecastLocations(): Promise<ForecastResponse> {
    try {
      const url = `${BASE_URL}/ajax.new.php?type=v-windgrams`;
      const headers: Record<string, string> = {
        'Accept': '*/*',
        'Origin': REQUEST_ORIGIN,
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const freshData: ForecastRegion[] = await response.json();

      return { success: true, data: freshData };
    } catch (error) {
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
  }

  clearAuthOnError(): void {
    this.logout();
  }

  // Get windgram image URL
  // Browser handles all caching via HTTP cache headers (Cache-Control, Expires, etc.)
  // when this url is used with an <img> tag.
  getWindgramUrl(windgramId: string, day: number = 0): Error | String {
    if (!this.token) {
      return { name: 'Not authenticated', message: 'Must be logged in' };
    }

    if (day < 0 || day > 4) {
      return { name: 'Invalid day', message: 'Day must be between 0 and 4' };
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