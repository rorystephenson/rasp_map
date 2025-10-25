export interface UserLocation {
  lat: number;
  lng: number;
}

export class GeolocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeolocationError';
  }
}

export class GeolocationService {
  private static readonly DEFAULT_OPTIONS: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
  };

  static async getCurrentLocation(
    options: PositionOptions = this.DEFAULT_OPTIONS
  ): Promise<UserLocation> {
    if (!navigator.geolocation) {
      throw new GeolocationError('Geolocation is not supported by this browser');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ lat: latitude, lng: longitude });
        },
        (error) => {
          let errorMessage: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred';
              break;
          }
          reject(new GeolocationError(errorMessage));
        },
        options
      );
    });
  }
}
