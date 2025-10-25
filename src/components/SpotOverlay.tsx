import React, { useState, useEffect } from 'react';
import { ForecastLocation } from '../api/types';
import { apiClient } from '../api/client';
import { getItalianDayAbbreviation, saveSelectedDate, getInitialDayOffset } from '../utils/dateUtils';
import { toggleFavourite, useIsFavourite } from '../utils/favourites';
import { Overlay } from './Overlay';

interface SpotOverlayProps {
  location: ForecastLocation | null;
}

export const SpotOverlay: React.FC<SpotOverlayProps> = ({ location }) => {
  const [windgramUrl, setWindgramUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => getInitialDayOffset());
  const isFavourited = useIsFavourite(location?.windgram_id);

  useEffect(() => {
    if (location) {
      // Load the persistent day selection when opening overlay
      const initialDay = getInitialDayOffset();
      setSelectedDay(initialDay);
    }
  }, [location]);

  useEffect(() => {
    if (location) {
      const loadWindgram = () => {
        setWindgramUrl(''); // Clear previous image immediately
        setImageLoading(true);
        setImageError(false);
        
        try {
          const result = apiClient.getWindgramUrl(location.windgram_id, selectedDay);
          if (typeof result === 'string') {
            setWindgramUrl(result);
          } else {
            setImageError(true);
            setImageLoading(false);
          }
        } catch (error) {
          console.error('Failed to load windgram:', error);
          setImageError(true);
          setImageLoading(false);
        }
      };

      loadWindgram();
    }
  }, [location, selectedDay]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleToggleFavourite = () => {
    if (location) {
      toggleFavourite(location.windgram_id);
    }
  };

  if (!location) {
    return null;
  }

  const lat = parseFloat(location.coord.lat);
  const lng = parseFloat(location.coord.lng);

  const favouriteButton = (
    <button
      className="favourite-toggle"
      onClick={handleToggleFavourite}
      title={isFavourited ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={isFavourited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );

  return (
    <Overlay
      title={location.windgram_name}
      className="spot-overlay"
      actionButtons={favouriteButton}
      zIndex={2100}
      alignItems="center"
    >
      <>
        <div className="day-selector">
          {[0, 1, 2, 3, 4].map((day) => (
            <button
              key={day}
              className={`day-button ${selectedDay === day ? 'day-button-active' : ''}`}
              onClick={() => {
                setSelectedDay(day);
                saveSelectedDate(day); // Persist the selection
              }}
            >
              {getItalianDayAbbreviation(day)}
            </button>
          ))}
        </div>

        <div className="forecast-content-container">
          {/* RASP Windgram */}
          <div className="spot-overlay-content">
            {imageLoading && (
              <div className="windgram-loading">
                <p>Loading forecast...</p>
              </div>
            )}

            {imageError && (
              <div className="windgram-error">
                <p>Failed to load forecast image</p>
                <p>Coordinates: {location.coord.lat}, {location.coord.lng}</p>
              </div>
            )}

            {windgramUrl && !imageError && (
              <img
                src={windgramUrl}
                alt={`Windgram for ${location.windgram_name}`}
                className="windgram-image"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            )}
          </div>

          {/* External forecast links */}
          <div className="external-links-section">
            <a
              href={`https://www.windy.com/${lat}/${lng}/airgram?${lat},${lng},11`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-forecast-link"
              title="Open Airgram in Windy"
            >
              <img
                src="/windy_logo.png"
                alt="Windy"
                className="forecast-link-logo"
              />
              <span className="forecast-link-text">Windy Airgram</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="external-link-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <a
              href={`https://meteo-parapente.com/#/${lat},${lng},11`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-forecast-link"
              title="Open Meteo-Parapente"
            >
              <img
                src="/meteo_parapente_logo.png"
                alt="Meteo-Parapente"
                className="forecast-link-logo meteo-logo"
              />
              <span className="forecast-link-text">Meteo-Parapente</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="external-link-icon">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </>
    </Overlay>
  );
};