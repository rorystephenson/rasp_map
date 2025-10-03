import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { apiClient } from '../api/client';
import { ForecastRegion, ForecastLocation } from '../api/types';
import 'leaflet/dist/leaflet.css';

interface MapPageProps {
  onLogout: () => void;
}

// Windsock icon for paragliding spots
const windsockIcon = new DivIcon({
  html: `<div class="windsock-marker">
    <div class="windsock-highlight"></div>
    <img src="/windsock_icon.svg" alt="Windsock" class="windsock-icon" />
  </div>`,
  className: 'windsock-container',
  iconSize: [32, 32],
  iconAnchor: [16, 16], // Center the icon on the coordinates
  popupAnchor: [0, -16],
});

// Current location marker icon (Google Maps style)
const currentLocationIcon = new DivIcon({
  html: `<div class="current-location-dot"></div>`,
  className: 'current-location-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

interface UserLocation {
  lat: number;
  lng: number;
}

// Component to handle map interactions
const MapController: React.FC<{ 
  userLocation: UserLocation | null;
  onZoomChange: (zoom: number) => void;
}> = ({ userLocation, onZoomChange }) => {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [map, userLocation]);

  useEffect(() => {
    const handleZoom = () => {
      onZoomChange(map.getZoom());
    };

    map.on('zoomend', handleZoom);
    handleZoom(); // Set initial zoom

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onZoomChange]);
  
  return null;
};

export const MapPage: React.FC<MapPageProps> = ({ onLogout }) => {
  const [regions, setRegions] = useState<ForecastRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [currentZoom, setCurrentZoom] = useState(6);

  useEffect(() => {
    const loadForecastLocations = async () => {
      try {
        const result = await apiClient.getForecastLocations();
        
        if (result.success && result.data) {
          setRegions(result.data);
        } else {
          setError(result.error || 'Failed to load forecast locations');
          if (result.error?.includes('401') || result.error?.includes('403')) {
            apiClient.clearAuthOnError();
            onLogout();
          }
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadForecastLocations();
  }, [onLogout]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLocating(false);
        setLocationError('');
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied by user');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out');
            break;
          default:
            setLocationError('An unknown error occurred');
            break;
        }
      },
      options
    );
  };

  const getAllLocations = (): ForecastLocation[] => {
    return regions.flatMap(region => region.windgram_list);
  };

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="loading-container">
          <h2>Loading forecast locations...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="map-error">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const allLocations = getAllLocations();

  return (
    <div className="map-page">
      <div className="map-header">
        <h1>Paragliding Forecast Locations</h1>
        <div className="map-controls">
          <span>{allLocations.length} locations</span>
          <button 
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="location-button"
            title="Go to my location"
          >
            {isLocating ? '📍...' : '📍'}
          </button>
          <button onClick={onLogout} className="logout-button">
            Sign Out
          </button>
        </div>
      </div>
      
      {locationError && (
        <div className="location-error">
          {locationError}
        </div>
      )}
      
      <div className="map-container">
        <MapContainer
          center={[42.5, 12.5]} // Center on Italy
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController 
            userLocation={userLocation} 
            onZoomChange={setCurrentZoom}
          />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={currentLocationIcon}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                }
              }}
            />
          )}
          
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={(cluster: any) => {
              return new DivIcon({
                html: `<div class="cluster-icon">
                  <span>${cluster.getChildCount()}</span>
                </div>`,
                className: 'custom-marker-cluster',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
              });
            }}
          >
            {allLocations.map((location) => (
              <Marker
                key={location.windgram_id}
                position={[parseFloat(location.coord.lat), parseFloat(location.coord.lng)]}
                icon={windsockIcon}
              >
                {currentZoom >= 10 && (
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -20]}
                    className="location-name-tooltip"
                  >
                    {location.windgram_name}
                  </Tooltip>
                )}
                <Popup>
                  <div className="location-popup">
                    <strong>{location.windgram_name}</strong>
                    <br />
                    <small>
                      {location.coord.lat}, {location.coord.lng}
                    </small>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </div>
  );
};