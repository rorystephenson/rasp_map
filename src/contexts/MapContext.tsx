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
  retryLoad: () => void;
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

  const loadForecastLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiClient.getForecastLocations((updatedForecastLocations) => {
        setRegions(updatedForecastLocations);
      });

      if (result.success && result.data) {
        setRegions(result.data);
        setError(null); // Only clear error on success
      } else {
        setError(result.error || 'Impossibile caricare le località');
      }
    } catch (err) {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecastLocations();
  }, [loadForecastLocations]);

  const value: MapContextType = {
    regions,
    mapInstance,
    isLoading,
    error,
    setMapInstance,
    findLocationById,
    retryLoad: loadForecastLocations
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};
