import React, { useState, useEffect, useRef } from 'react';
import { ForecastLocation, ForecastRegion, LocationWithRegion } from '../api/types';
import { SearchService, SearchResult } from '../services/SearchService';
import { storageService } from '../services/StorageService';
import { useIsFavourite, toggleFavourite } from '../utils/favourites';

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavourited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        className="search-result-view"
        onClick={() => onLocationView(location)}
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
  );
};

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  regions: ForecastRegion[];
  onLocationSelect: (location: ForecastLocation) => void;
  onLocationView: (location: ForecastLocation) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ 
  isOpen, 
  onClose, 
  regions, 
  onLocationSelect,
  onLocationView
}) => {
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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
    // Convert to ForecastLocation by removing region_name
    const { region_name, ...forecastLocation } = location;
    onLocationSelect(forecastLocation);
    onClose();
    // Keep search query for next time
  };

  const handleLocationView = (location: LocationWithRegion) => {
    // Convert to ForecastLocation by removing region_name
    const { region_name, ...forecastLocation } = location;
    onLocationView(forecastLocation);
    // Don't close search overlay, keep it open behind forecast overlay
  };

  const handleClose = () => {
    onClose();
    // Keep search query for next time
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay-backdrop" onClick={handleClose}>
      <div className="search-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="search-overlay-header">
          <h2>Search Locations</h2>
          <button 
            onClick={handleClose} 
            className="spot-overlay-close"
            title="Close search"
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
      </div>
    </div>
  );
};