import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../router/RouterContext';
import { LocationWithRegion } from '../api/types';
import { SearchService, SearchResult } from '../services/SearchService';
import { storageService } from '../services/StorageService';
import { useIsFavourite, toggleFavourite } from '../utils/favourites';
import { useMapContext } from '../contexts/MapContext';
import { useI18n } from '../i18n/I18nContext';
import { Overlay } from './Overlay';

interface SearchResultItemProps {
  location: LocationWithRegion;
  onLocationClick: (location: LocationWithRegion) => void;
  onLocationView: (location: LocationWithRegion) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ location, onLocationClick, onLocationView }) => {
  const { t } = useI18n();
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
        title={isFavourited ? t('favourites.remove') : t('favourites.add')}
      >
        <img
          src={isFavourited ? "/heart_filled_icon.svg" : "/heart_outline_icon.svg"}
          alt={isFavourited ? t('favourites.remove') : t('favourites.add')}
          width="20"
          height="20"
        />
      </button>
      <button
        className="search-result-view"
        onClick={() => onLocationView(location)}
        title={t('search.viewForecast')}
      >
        <img src="/eye_icon.svg" alt={t('search.viewForecast')} width="20" height="20" />
      </button>
    </div>
  );
};

interface SearchOverlayProps {
}

export const SearchOverlay: React.FC<SearchOverlayProps> = () => {
  const { t } = useI18n();
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
    // Navigate to spot overlay from search context
    setLocation('/search/spot/:id', { params: { id: location.windgram_id } });
  };

  return (
    <Overlay
      title={t('search.title')}
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
            placeholder={t('search.placeholder')}
            className="search-input"
          />
        </div>

        <div className="search-results">
          {query.trim() === '' ? (
            <div className="search-placeholder">
              <p>{t('search.emptyState', { count: searchService.getLocationCount() })}</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="search-results-header">
                {t('search.resultsFound', { count: results.length })}
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
              <p>{t('search.noResults', { query })}</p>
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
};