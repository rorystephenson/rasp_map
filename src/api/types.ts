export interface ForecastLocation {
  windgram_id: string;
  windgram_name: string;
  coord: {
    lat: string;
    lng: string;
  };
}

export interface ForecastRegion {
  region_id: string;
  region_name: string;
  windgram_list: ForecastLocation[];
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface ForecastResponse {
  success: boolean;
  data?: ForecastRegion[];
  error?: string;
}