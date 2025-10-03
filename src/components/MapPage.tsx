import React, { useEffect, useState, useCallback } from 'react';
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

interface MapViewState {
  center: [number, number];
  zoom: number;
}

const MAP_STATE_KEY = 'map_view_state';
const DEFAULT_MAP_STATE: MapViewState = {
  center: [42.5, 12.5], // Center on Italy
  zoom: 6
};

// Helper functions for map state persistence
const saveMapState = (state: MapViewState): void => {
  try {
    localStorage.setItem(MAP_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save map state:', error);
  }
};

const loadMapState = (): MapViewState => {
  try {
    const saved = localStorage.getItem(MAP_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the loaded state
      if (parsed.center && Array.isArray(parsed.center) && 
          parsed.center.length === 2 && 
          typeof parsed.zoom === 'number') {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load map state:', error);
  }
  return DEFAULT_MAP_STATE;
};

// Component to handle map interactions
const MapController: React.FC<{ 
  userLocation: UserLocation | null;
  onZoomChange: (zoom: number) => void;
  onMapStateChange: (state: MapViewState) => void;
}> = ({ userLocation, onZoomChange, onMapStateChange }) => {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [map, userLocation]);

  useEffect(() => {
    const handleMapChange = () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      const newState: MapViewState = {
        center: [center.lat, center.lng],
        zoom: zoom
      };
      
      onZoomChange(zoom);
      onMapStateChange(newState);
    };

    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);
    handleMapChange(); // Set initial state

    return () => {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);
    };
  }, [map, onZoomChange, onMapStateChange]);
  
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
  const [mapState, setMapState] = useState<MapViewState>(() => loadMapState());

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

  const handleMapStateChange = useCallback((newState: MapViewState) => {
    setMapState(newState);
    saveMapState(newState);
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setCurrentZoom(zoom);
  }, []);

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
        {/* Floating location control */}
        <div className="map-location-control">
          <button 
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="location-control-button"
            title="Go to my location"
          >
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={isLocating ? "location-icon-loading" : "location-icon"}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <MapContainer
          center={mapState.center}
          zoom={mapState.zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController 
            userLocation={userLocation} 
            onZoomChange={handleZoomChange}
            onMapStateChange={handleMapStateChange}
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
            animate={false}
            animateAddingMarkers={false}
            disableClusteringAtZoom={15}
            maxClusterRadius={50}
            spiderfyOnMaxZoom={false}
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
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -20]}
                  className={`location-name-tooltip ${currentZoom >= 10 ? 'tooltip-visible' : 'tooltip-hidden'}`}
                >
                  {location.windgram_name}
                </Tooltip>
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