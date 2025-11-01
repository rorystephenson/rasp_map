import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { getDayTranslationKey, saveSelectedDate, getInitialDayOffset } from '../utils/dateUtils';
import { toggleFavourite, useIsFavourite } from '../utils/favourites';
import { useI18n } from '../i18n/I18nContext';
import { Overlay } from './Overlay';
import { useMapContext } from '../contexts/MapContext';

interface SpotOverlayProps {
  windgramId: string;
}

export const SpotOverlay: React.FC<SpotOverlayProps> = ({ windgramId }) => {
  const { t } = useI18n();
  const { findLocationById } = useMapContext();
  const location = findLocationById(windgramId);

  const [windgramUrl, setWindgramUrl] = useState<string>('');
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => getInitialDayOffset());
  const isFavourited = useIsFavourite(windgramId);

  useEffect(() => {
    // Load the persistent day selection when opening overlay
    const initialDay = getInitialDayOffset();
    setSelectedDay(initialDay);
  }, [windgramId]);

  useEffect(() => {
    if (!location) return;

    const loadWindgram = () => {
      setWindgramUrl(''); // Clear previous image immediately
      setImageLoading(true);
      setImageError(false);

      try {
        const result = apiClient.getWindgramUrl(windgramId, selectedDay);
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
  }, [location, windgramId, selectedDay]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleRetry = () => {
    setWindgramUrl('');
    setImageLoading(true);
    setImageError(false);

    try {
      const result = apiClient.getWindgramUrl(windgramId, selectedDay);
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

  if (!location) {
    return (
      <Overlay
        title={t('spot.error')}
        className="spot-error-overlay"
        zIndex={2100}
        alignItems="center"
      >
        <div className="windgram-error">
          <p>{t('spot.notFound')}</p>
          <p>ID: {windgramId}</p>
        </div>
      </Overlay>
    );
  }

  const lat = parseFloat(location.coord.lat);
  const lng = parseFloat(location.coord.lng);

  const favouriteButton = (
    <button
      className="favourite-toggle"
      onClick={() => toggleFavourite(windgramId)}
      title={isFavourited ? t('favourites.remove') : t('favourites.add')}
    >
      <img
        src={isFavourited ? "/heart_filled_icon.svg" : "/heart_outline_icon.svg"}
        alt={isFavourited ? t('favourites.remove') : t('favourites.add')}
        width="24"
        height="24"
      />
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
              {t(getDayTranslationKey(day))}
            </button>
          ))}
        </div>

        <div className="forecast-content-container">
          {/* RASP Windgram */}
          <div className="spot-overlay-content">
            {imageLoading && (
              <div className="windgram-loading">
                <p>{t('spot.loading')}</p>
              </div>
            )}

            {imageError && (
              <div className="windgram-error">
                <p>{t('spot.loadError')}</p>
                <p>{t('spot.coordinates', { lat: location.coord.lat, lng: location.coord.lng })}</p>
                <button onClick={handleRetry} className="retry-button">
                  {t('spot.retry')}
                </button>
              </div>
            )}

            {windgramUrl && !imageError && (
              <img
                src={windgramUrl}
                alt={t('ui.windgramFor', { name: location.windgram_name })}
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
              title={t('ui.openWindy')}
            >
              <img
                src="/windy_logo.png"
                alt="Windy"
                className="forecast-link-logo"
              />
              <span className="forecast-link-text">Windy Airgram</span>
              <img src="/external_link_icon.svg" alt={t('ui.externalLink')} width="16" height="16" className="external-link-icon" />
            </a>
            <a
              href={`https://meteo-parapente.com/#/${lat},${lng},11`}
              target="_blank"
              rel="noopener noreferrer"
              className="external-forecast-link"
              title={t('ui.openMeteoParapente')}
            >
              <img
                src="/meteo_parapente_logo.png"
                alt="Meteo-Parapente"
                className="forecast-link-logo meteo-logo"
              />
              <span className="forecast-link-text">Meteo-Parapente</span>
              <img src="/external_link_icon.svg" alt={t('ui.externalLink')} width="16" height="16" className="external-link-icon" />
            </a>
          </div>
        </div>
      </>
    </Overlay>
  );
};