import React, { useState, useEffect } from 'react';
import { ForecastRegion, LocationWithRegion } from '../api/types';
import { useFavourites } from '../utils/favourites';

interface FavouritesOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  regions: ForecastRegion[];
  onLocationSelect: (location: LocationWithRegion) => void;
  onLocationView: (location: LocationWithRegion) => void;
}

export const FavouritesOverlay: React.FC<FavouritesOverlayProps> = ({
  isOpen,
  onClose,
  regions,
  onLocationSelect,
  onLocationView
}) => {
  const favouriteIds = useFavourites();
  const [favouriteLocations, setFavouriteLocations] = useState<LocationWithRegion[]>([]);

  // Load and populate favourite locations
  useEffect(() => {
    if (isOpen && regions.length > 0) {

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
  }, [isOpen, regions, favouriteIds]);

  const handleLocationClick = (location: LocationWithRegion) => {
    onLocationSelect(location);
    onClose();
  };

  const handleLocationView = (location: LocationWithRegion) => {
    onLocationView(location);
    // Don't close favourites overlay, keep it open behind forecast overlay
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay-backdrop" onClick={handleClose}>
      <div className="search-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="search-overlay-header">
          <h2>Preferiti</h2>
          <button
            onClick={handleClose}
            className="spot-overlay-close"
            title="Chiudi preferiti"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="close-icon-desktop">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="close-icon-mobile">
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

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
      </div>
    </div>
  );
};
