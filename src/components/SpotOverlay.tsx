import React, { useState, useEffect } from 'react';
import { ForecastLocation } from '../api/types';
import { apiClient } from '../api/client';
import { getItalianDayAbbreviation, saveSelectedDate, getInitialDayOffset } from '../utils/dateUtils';
import { WindyEmbed } from './WindyEmbed';

interface SpotOverlayProps {
  location: ForecastLocation | null;
  isOpen: boolean;
  onClose: () => void;
}

const WINDY_COLLAPSED_KEY = 'windy_section_collapsed';

const getWindyCollapsedState = (): boolean => {
  try {
    const stored = localStorage.getItem(WINDY_COLLAPSED_KEY);
    return stored === 'true';
  } catch (error) {
    console.warn('Failed to load Windy collapsed state:', error);
    return false;
  }
};

const setWindyCollapsedState = (collapsed: boolean): void => {
  try {
    localStorage.setItem(WINDY_COLLAPSED_KEY, collapsed.toString());
  } catch (error) {
    console.warn('Failed to save Windy collapsed state:', error);
  }
};

export const SpotOverlay: React.FC<SpotOverlayProps> = ({ location, isOpen, onClose }) => {
  const [windgramUrl, setWindgramUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => getInitialDayOffset());
  const [windyCollapsed, setWindyCollapsed] = useState(() => getWindyCollapsedState());

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

  const toggleWindySection = () => {
    const newState = !windyCollapsed;
    setWindyCollapsed(newState);
    setWindyCollapsedState(newState);
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

          {/* Windy Section - collapsible */}
          <div className="windy-section">
            <div className="windy-section-header">
              <button className="windy-section-toggle" onClick={toggleWindySection}>
                <div className="windy-section-title">
                  <img
                    src="https://cdn.brandfetch.io/idRnsbaAMF/w/400/h/400/theme/dark/icon.jpeg?c=1bxid64Mup7aczewSAYMX&t=1760092724025"
                    alt="Windy"
                    className="windy-section-logo"
                  />
                  <span className="windy-section-label">Windy</span>
                </div>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`collapse-icon ${windyCollapsed ? 'collapsed' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              <a
                href={`https://www.windy.com/${lat}/${lng}/airgram?${lat},${lng},11`}
                target="_blank"
                rel="noopener noreferrer"
                className="windy-airgram-button"
                title="Open Airgram in Windy"
              >
                <span>Apri Airgram</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="external-link-icon">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
            {!windyCollapsed && (
              <div className="windy-overlay-content">
                <WindyEmbed latitude={lat} longitude={lng} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};