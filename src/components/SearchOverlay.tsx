import React, { useState, useEffect, useRef } from 'react';
import { ForecastLocation, ForecastRegion } from '../api/types';
import { SearchService, SearchResult } from '../services/SearchService';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  regions: ForecastRegion[];
  onLocationSelect: (location: ForecastLocation) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ 
  isOpen, 
  onClose, 
  regions, 
  onLocationSelect 
}) => {
  const [query, setQuery] = useState('');
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

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      const searchResults = searchService.search(query, { maxResults: 20 });
      setResults(searchResults);
    } else {
      setResults([]);
    }
  }, [query, searchService]);

  const handleLocationClick = (location: ForecastLocation) => {
    onLocationSelect(location);
    onClose();
    setQuery(''); // Clear search
  };

  const handleClose = () => {
    onClose();
    setQuery(''); // Clear search when closing
  };

  if (!isOpen) return null;

  return (
    <div className="search-overlay-backdrop" onClick={handleClose}>
      <div className="search-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="search-overlay-header">
          <h2>Search Locations</h2>
          <button 
            onClick={handleClose} 
            className="search-overlay-close"
            title="Close search"
          >
            <span className="close-icon-desktop">✕</span>
            <span className="close-icon-mobile">← Back</span>
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
                    <button
                      key={location.windgram_id}
                      className="search-result-item"
                      onClick={() => handleLocationClick(location)}
                    >
                      <div className="search-result-name">{location.windgram_name}</div>
                      <div className="search-result-region">
                        {location.region_name}
                      </div>
                    </button>
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