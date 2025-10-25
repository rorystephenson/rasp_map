import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LocationWithRegion } from '../api/types';
import { useFavourites } from '../utils/favourites';
import { useMapContext } from '../contexts/MapContext';
import { Overlay } from './Overlay';


export const FavouritesOverlay: React.FC = () => {
  const [, setLocation] = useLocation();
  const { regions, mapInstance } = useMapContext();
  const favouriteIds = useFavourites();
  const [favouriteLocations, setFavouriteLocations] = useState<LocationWithRegion[]>([]);

  // Load and populate favourite locations
  useEffect(() => {
    if (regions.length > 0) {

      // Create a map of all locations by ID for quick lookup
      const locationMap = new Map<string, LocationWithRegion>();
      regions.forEach(region => {
        region.windgram_list.forEach(location => {
          locationMap.set(location.windgram_id, {
            ...location,
            region_name: region.region_name
          });
        });
      });

      // Get full location data for each favourite ID
      const locations = favouriteIds
        .map(id => locationMap.get(id))
        .filter((loc): loc is LocationWithRegion => loc !== undefined);

      // Sort alphabetically by name (case-insensitive, locale-aware)
      locations.sort((a, b) =>
        a.windgram_name.localeCompare(b.windgram_name, 'it', { sensitivity: 'base' })
      );

      setFavouriteLocations(locations);
    }
  }, [regions, favouriteIds]);

  const handleLocationClick = (location: LocationWithRegion) => {
    // Pan map to location if map instance available
    if (mapInstance) {
      const lat = parseFloat(location.coord.lat);
      const lng = parseFloat(location.coord.lng);
      mapInstance.flyTo([lat, lng], 12, {
        duration: 0.5
      });
    }
    // Close favourites overlay by going back in history
    window.history.back();
  };

  const handleLocationView = (location: LocationWithRegion) => {
    // Navigate to spot overlay while keeping favourites open
    // Use relative path within nested context
    setLocation(`/spot/${location.windgram_id}`);
  };

  return (
    <Overlay
      title="Preferiti"
      className="search-overlay"
      alignItems="flex-start"
      zIndex={2000}
    >
      <div className="search-overlay-content">
        <div className="search-results">
          {favouriteLocations.length > 0 ? (
            <>
              <div className="search-results-header">
                {favouriteLocations.length} preferit{favouriteLocations.length !== 1 ? 'i' : 'o'}
              </div>
              <div className="search-results-list">
                {favouriteLocations.map((location) => (
                  <div key={location.windgram_id} className="search-result-item">
                    <button
                      className="search-result-main"
                      onClick={() => handleLocationClick(location)}
                    >
                      <div className="search-result-name">{location.windgram_name}</div>
                      <div className="search-result-region">{location.region_name}</div>
                    </button>
                    <button
                      className="search-result-view"
                      onClick={() => handleLocationView(location)}
                      title="Mostra previsioni"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="search-no-results">
              <p>Nessun preferito salvato</p>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
};
