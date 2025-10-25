import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { LocationWithRegion } from '../api/types';
import { SearchService, SearchResult } from '../services/SearchService';
import { storageService } from '../services/StorageService';
import { useIsFavourite, toggleFavourite } from '../utils/favourites';
import { useMapContext } from '../contexts/MapContext';
import { Overlay } from './Overlay';

interface SearchResultItemProps {
  location: LocationWithRegion;
  onLocationClick: (location: LocationWithRegion) => void;
  onLocationView: (location: LocationWithRegion) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ location, onLocationClick, onLocationView }) => {
  const isFavourited = useIsFavourite(location.windgram_id);

  const handleToggleFavourite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavourite(location.windgram_id);
  };

  return (
    <div className="search-result-item">
      <button
        className="search-result-main"
        onClick={() => onLocationClick(location)}
      >
        <div className="search-result-name">{location.windgram_name}</div>
        <div className="search-result-region">{location.region_name}</div>
      </button>
      <button
        className="search-result-favourite"
        onClick={handleToggleFavourite}
        title={isFavourited ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
      >
        <img
          src={isFavourited ? "/heart_filled_icon.svg" : "/heart_outline_icon.svg"}
          alt={isFavourited ? "Remove from favourites" : "Add to favourites"}
          width="20"
          height="20"
        />
      </button>
      <button
        className="search-result-view"
        onClick={() => onLocationView(location)}
        title="Mostra previsioni"
      >
        <img src="/eye_icon.svg" alt="View" width="20" height="20" />
      </button>
    </div>
  );
};

interface SearchOverlayProps {
}

export const SearchOverlay: React.FC<SearchOverlayProps> = () => {
  const [, setLocation] = useLocation();
  const { regions, mapInstance } = useMapContext();
  const [query, setQuery] = useState(() => {
    // Load saved search query from storage service
    return storageService.getSearchQuery();
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchService] = useState(() => new SearchService());
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search service when regions change
  useEffect(() => {
    if (regions.length > 0) {
      searchService.setRegions(regions);
    }
  }, [regions, searchService]);

  // Focus input when overlay opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Save query to storage service whenever it changes
  useEffect(() => {
    storageService.setSearchQuery(query);
  }, [query]);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchService.search(query, { maxResults: 20 });
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query, searchService]);

  const handleLocationClick = (location: LocationWithRegion) => {
    // Pan map to location if map instance available
    if (mapInstance) {
      const lat = parseFloat(location.coord.lat);
      const lng = parseFloat(location.coord.lng);
      mapInstance.flyTo([lat, lng], 12, {
        duration: 0.5
      });
    }
    // Close search overlay by going back in history
    window.history.back();
    // Keep search query for next time
  };

  const handleLocationView = (location: LocationWithRegion) => {
    // Navigate to spot overlay while keeping search open
    // Use relative path within nested context
    setLocation(`/spot/${location.windgram_id}`);
  };

  return (
    <Overlay
      title="Search Locations"
      className="search-overlay"
      alignItems="flex-start"
      zIndex={2000}
    >
      <div className="search-overlay-content">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search forecast locations..."
            className="search-input"
          />
        </div>

        <div className="search-results">
          {query.trim() === '' ? (
            <div className="search-placeholder">
              <p>Enter a location name to search {searchService.getLocationCount()} forecast locations</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="search-results-header">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              <div className="search-results-list">
                {results.map(({ location }) => (
                  <SearchResultItem
                    key={location.windgram_id}
                    location={location}
                    onLocationClick={handleLocationClick}
                    onLocationView={handleLocationView}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="search-no-results">
              <p>No locations found for "{query}"</p>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
};