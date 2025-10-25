import { useState, useCallback } from 'react';
import { GeolocationService, UserLocation } from '../services/GeolocationService';

interface UseGeolocationReturn {
  userLocation: UserLocation | null;
  isLocating: boolean;
  locationError: string;
  getCurrentLocation: () => Promise<void>;
}

export const useGeolocation = (): UseGeolocationReturn => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const getCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError('');

    try {
      const location = await GeolocationService.getCurrentLocation();
      setUserLocation(location);
      setIsLocating(false);
      setLocationError('');
    } catch (error) {
      setIsLocating(false);
      if (error instanceof Error) {
        setLocationError(error.message);
      } else {
        setLocationError('An unknown error occurred');
      }

      // Clear location error after 5 seconds
      setTimeout(() => {
        setLocationError('');
      }, 5000);
    }
  }, []);

  return {
    userLocation,
    isLocating,
    locationError,
    getCurrentLocation,
  };
};
