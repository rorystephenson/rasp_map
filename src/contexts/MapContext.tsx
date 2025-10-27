import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { ForecastRegion, ForecastLocation } from '../api/types';

interface MapContextType {
  regions: ForecastRegion[];
  mapInstance: any | null;
  isLoading: boolean;
  error: string | null;
  setMapInstance: (instance: any) => void;
  findLocationById: (id: string) => ForecastLocation | null;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};

interface MapProviderProps {
  children: ReactNode;
  onLogout: () => void;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children, onLogout }) => {
  const [regions, setRegions] = useState<ForecastRegion[]>([]);
  const [mapInstance, setMapInstance] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const findLocationById = useCallback((id: string): ForecastLocation | null => {
    for (const region of regions) {
      const location = region.windgram_list.find(loc => loc.windgram_id === id);
      if (location) {
        return location;
      }
    }
    return null;
  }, [regions]);

  useEffect(() => {
    const loadForecastLocations = async () => {
      try {
        const result = await apiClient.getForecastLocations((updatedForecastLocations) => {
          setRegions(updatedForecastLocations);
        });

        if (result.success && result.data) {
          setRegions(result.data);
        } else {
          setError(result.error || 'Failed to load forecast locations');
          if (result.error?.includes('401') || result.error?.includes('403')) {
            apiClient.clearAuthOnError();
            onLogout();
          }
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadForecastLocations();
  }, []);

  const value: MapContextType = {
    regions,
    mapInstance,
    isLoading,
    error,
    setMapInstance,
    findLocationById
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};
