import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import { DivIcon, Control, DomUtil, DomEvent } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useLocation } from 'wouter';
import { ForecastLocation } from '../api/types';
import { useMapContext } from '../contexts/MapContext';
import { storageService, MapViewState } from '../services/StorageService';
import { UserLocation } from '../services/GeolocationService';
import { useGeolocation } from '../hooks/useGeolocation';
import 'leaflet/dist/leaflet.css';

interface MapPageProps {
  onLogout: () => void;
}


// Current location marker icon (Google Maps style)
const currentLocationIcon = new DivIcon({
  html: `<div class="current-location-dot"></div>`,
  className: 'current-location-marker',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const DEFAULT_MAP_STATE: MapViewState = {
  center: [42.5, 12.5], // Center on Italy
  zoom: 6
};

// Map boundaries based on actual forecast locations (Italy + nearby countries)
// Extra buffer so outermost spots appear in center when panning to edges
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [34.4516, 3.3907], // Southwest corner (2 degrees extra buffer)
  [49.9639, 19.7863]  // Northeast corner (2 degrees extra buffer)
];

// Load initial map state before component renders to avoid race conditions
const INITIAL_MAP_STATE = storageService.getMapViewState() || DEFAULT_MAP_STATE;

// Custom Leaflet control for location button
interface LocationControlOptions {
  onLocationClick: () => void;
  isLocating?: boolean;
}

class LocationControl extends Control {
  private onLocationClick: () => void;
  private isLocating: boolean = false;
  private button!: HTMLAnchorElement;

  constructor(options: LocationControlOptions) {
    super({ position: 'topleft' });
    this.onLocationClick = options.onLocationClick;
    this.isLocating = options.isLocating || false;
  }

  onAdd() {
    const container = DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    this.button = DomUtil.create('a', '', container);
    this.button.href = '#';
    this.button.title = 'Go to my location';
    this.updateIcon();
    this.button.style.width = '30px';
    this.button.style.height = '30px';
    this.button.style.display = 'flex';
    this.button.style.alignItems = 'center';
    this.button.style.justifyContent = 'center';
    this.button.style.textDecoration = 'none';

    DomEvent.on(this.button, 'click', DomEvent.stopPropagation)
      .on(this.button, 'click', DomEvent.preventDefault)
      .on(this.button, 'click', this.onLocationClick);

    return container;
  }

  updateLoadingState(isLocating: boolean) {
    this.isLocating = isLocating;
    this.updateIcon();
  }

  private updateIcon() {
    if (!this.button) return;

    const animationClass = this.isLocating ? 'location-pulse' : '';
    this.button.className = animationClass;
    this.button.innerHTML = `
      <img src="/location_icon.svg" alt="Location" width="18" height="18" style="display: block; margin: auto;" />
    `;
  }
}

// Component to handle map interactions
// Module-level flag to track if map is ready (persists across remounts)
let isMapReadyFlag = false;

const MapController: React.FC<{
  userLocation: UserLocation | null;
  onMapStateChange: (state: MapViewState) => void;
  onLocationRequest: () => void;
  isLocating: boolean;
  onMapReady?: (map: any) => void;
}> = ({ userLocation, onMapStateChange, onLocationRequest, isLocating, onMapReady }) => {
  const map = useMap();

  useEffect(() => {
    // Only set up whenReady callback if not already ready
    if (!isMapReadyFlag) {
      map.whenReady(() => {
        isMapReadyFlag = true;
      });
    }

    // Always call onMapReady if provided
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);
  
  useEffect(() => {
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 12);
    }
  }, [map, userLocation]);

  useEffect(() => {
    const handleMapChange = () => {
      // Only save state after map is ready
      if (!isMapReadyFlag) {
        return;
      }

      const zoom = map.getZoom();
      const center = map.getCenter();
      const newState: Omit<MapViewState, 'timestamp'> = {
        center: [center.lat, center.lng],
        zoom: zoom
      };

      onMapStateChange(newState);
    };

    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);

    return () => {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);
    };
  }, [map, onMapStateChange]);

  useEffect(() => {
    const locationControl = new LocationControl({ 
      onLocationClick: onLocationRequest,
      isLocating: isLocating 
    });
    map.addControl(locationControl);

    return () => {
      map.removeControl(locationControl);
    };
  }, [map, onLocationRequest, isLocating]);
  
  return null;
};

export const MapPage: React.FC<MapPageProps> = ({ onLogout }) => {
  const [, setLocation] = useLocation();
  const { regions, setMapInstance, isLoading, error } = useMapContext();
  const { userLocation, isLocating, locationError, getCurrentLocation } = useGeolocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const handleMapStateChange = useCallback((newState: Omit<MapViewState, 'timestamp'>) => {
    // Just save to storage service, don't store in React state to avoid re-renders
    storageService.setMapViewState(newState);
  }, []);


  const handleMapReady = useCallback((map: any) => {
    setMapInstance(map);
  }, [setMapInstance]);

  const allLocations = useMemo((): ForecastLocation[] => {
    return regions.flatMap(region => region.windgram_list);
  }, [regions]);

  const memoizedMarkers = useMemo(() =>
    allLocations.map((location) => {
      const iconSize = 32; // Windsock icon size - this defines the clickable area

      // Center the icon
      const anchorX = iconSize / 2;
      const anchorY = iconSize / 2;

      const markerIcon = new DivIcon({
        html: `<div class="windsock-marker">
          <div class="windsock-highlight"></div>
          <img src="/windsock_icon.svg" alt="Windsock" class="windsock-icon" />
        </div>`,
        className: 'windsock-container',
        iconSize: [iconSize, iconSize],
        iconAnchor: [anchorX, anchorY],
        popupAnchor: [0, -anchorY],
      });

      return (
        <Marker
          key={location.windgram_id}
          position={[parseFloat(location.coord.lat), parseFloat(location.coord.lng)]}
          icon={markerIcon}
          eventHandlers={{
            click: () => setLocation(`/spot/${location.windgram_id}`)
          }}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -16]}
            className="marker-tooltip"
          >
            {location.windgram_name}
          </Tooltip>
        </Marker>
      );
    }), [allLocations, setLocation]
  );

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


  return (
    <div className="map-page">
      {locationError && (
        <div className="location-error">
          {locationError}
        </div>
      )}

      <div className="map-container">
        <MapContainer
          center={INITIAL_MAP_STATE.center}
          zoom={INITIAL_MAP_STATE.zoom}
          maxBounds={MAP_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
        >
          <MapController
            userLocation={userLocation}
            onMapStateChange={handleMapStateChange}
            onLocationRequest={getCurrentLocation}
            isLocating={isLocating}
            onMapReady={handleMapReady}
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
            {memoizedMarkers}
          </MarkerClusterGroup>
        </MapContainer>

        <button onClick={() => setLocation('/favourites')} className="favourites-button-overlay" title="Preferiti">
          <img src="/heart_filled_icon.svg" alt="Preferiti" width="20" height="20" />
        </button>

        <button onClick={() => setLocation('/search')} className="search-button-overlay" title="Search locations">
          <img src="/search_icon.svg" alt="Search" width="20" height="20" />
        </button>

        <div className="menu-container">
          <button onClick={() => setIsMenuOpen(prev => !prev)} className="menu-button-overlay" title="Menu">
            <img src="/menu_icon.svg" alt="Menu" width="20" height="20" />
          </button>

          {isMenuOpen && (
            <div className="menu-dropdown">
              <button onClick={() => { setLocation('/logout'); setIsMenuOpen(false); }} className="menu-item">
                <img src="/logout_icon.svg" alt="Logout" width="18" height="18" />
                Esci
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};