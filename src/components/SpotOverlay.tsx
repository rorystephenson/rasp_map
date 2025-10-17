import React, { useState, useEffect } from 'react';
import { ForecastLocation } from '../api/types';
import { apiClient } from '../api/client';
import { getItalianDayAbbreviation, saveSelectedDate, getInitialDayOffset } from '../utils/dateUtils';
import { isBetaEnabled } from '../utils/featureFlags';
import { WindyEmbed } from './WindyEmbed';

interface SpotOverlayProps {
  location: ForecastLocation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SpotOverlay: React.FC<SpotOverlayProps> = ({ location, isOpen, onClose }) => {
  const [windgramUrl, setWindgramUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => getInitialDayOffset());
  const betaEnabled = isBetaEnabled();

  useEffect(() => {
    if (location && isOpen) {
      // Load the persistent day selection when opening overlay
      const initialDay = getInitialDayOffset();
      setSelectedDay(initialDay);
    }
  }, [location, isOpen]);

  useEffect(() => {
    if (location && isOpen) {
      const loadWindgram = async () => {
        setWindgramUrl(''); // Clear previous image immediately
        setImageLoading(true);
        setImageError(false);
        
        try {
          const result = await apiClient.getWindgram(location.windgram_id, selectedDay);
          if (result.success && result.imageUrl) {
            setWindgramUrl(result.imageUrl);
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
  }, [location, selectedDay, isOpen]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  if (!isOpen || !location) {
    return null;
  }

  const lat = parseFloat(location.coord.lat);
  const lng = parseFloat(location.coord.lng);

  return (
    <div className="spot-overlay-backdrop" onClick={onClose}>
      <div className="spot-overlay" onClick={(e) => e.stopPropagation()}>
        <div className="spot-overlay-header">
          <h2>{location.windgram_name}</h2>
          <button className="spot-overlay-close" onClick={onClose}>
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

          {/* Windy Embed - compact fixed height below RASP when beta enabled */}
          {betaEnabled && (
            <div className="windy-overlay-content">
              <WindyEmbed latitude={lat} longitude={lng} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};