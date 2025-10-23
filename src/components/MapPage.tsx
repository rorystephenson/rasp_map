import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import { DivIcon, Control, DomUtil, DomEvent } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { apiClient } from '../api/client';
import { ForecastRegion, ForecastLocation } from '../api/types';
import { SpotOverlay } from './SpotOverlay';
import { SearchOverlay } from './SearchOverlay';
import { FavouritesOverlay } from './FavouritesOverlay';
import { LogoutConfirmationOverlay } from './LogoutConfirmationOverlay';
import { storageService, MapViewState } from '../services/StorageService';
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

interface UserLocation {
  lat: number;
  lng: number;
}

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
    this.button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#333" style="display: block; margin: auto;">
        <circle cx="12" cy="12" r="4" class="${animationClass}"/>
        <path d="M13 4.069V2h-2v2.069A8.01 8.01 0 0 0 4.069 11H2v2h2.069A8.008 8.008 0 0 0 11 19.931V22h2v-2.069A8.007 8.007 0 0 0 19.931 13H22v-2h-2.069A8.008 8.008 0 0 0 13 4.069zM12 18c-3.309 0-6-2.691-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"/>
      </svg>
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
  const [regions, setRegions] = useState<ForecastRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<ForecastLocation | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFavouritesOpen, setIsFavouritesOpen] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

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


  const handleMarkerClick = useCallback((location: ForecastLocation) => {
    setSelectedLocation(location);
    setIsOverlayOpen(true);
  }, []);

  const handleSearchLocationSelect = useCallback((location: ForecastLocation) => {
    // Animate map to location (main tap behavior)
    if (mapInstance) {
      const lat = parseFloat(location.coord.lat);
      const lng = parseFloat(location.coord.lng);
      mapInstance.setView([lat, lng], 12, { animate: true, duration: 1 });
    }
    // Don't open forecast overlay for main tap, just animate map
  }, [mapInstance]);

  const handleSearchLocationView = useCallback((location: ForecastLocation) => {
    // Open forecast overlay but keep search open (eye icon tap)
    setSelectedLocation(location);
    setIsOverlayOpen(true);
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setIsOverlayOpen(false);
    setSelectedLocation(null);
  }, []);

  const handleSearchClick = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleFavouritesClick = useCallback(() => {
    setIsFavouritesOpen(true);
  }, []);

  const handleCloseFavourites = useCallback(() => {
    setIsFavouritesOpen(false);
  }, []);

  const handleMapReady = useCallback((map: any) => {
    setMapInstance(map);
  }, []);

  const handleMenuClick = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const handleLogoutClick = useCallback(() => {
    setIsLogoutConfirmOpen(true);
    setIsMenuOpen(false);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    apiClient.logout();
    onLogout();
    setIsLogoutConfirmOpen(false);
  }, [onLogout]);

  const handleLogoutCancel = useCallback(() => {
    setIsLogoutConfirmOpen(false);
  }, []);

  const getCurrentLocation = useCallback(() => {
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
        
        // Clear location error after 5 seconds
        setTimeout(() => {
          setLocationError('');
        }, 5000);
      },
      options
    );
  }, []);

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
            click: () => handleMarkerClick(location)
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
    }), [allLocations, handleMarkerClick]
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

        <button onClick={handleFavouritesClick} className="favourites-button-overlay" title="Preferiti">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>

        <button onClick={handleSearchClick} className="search-button-overlay" title="Search locations">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>

        <div className="menu-container">
          <button onClick={handleMenuClick} className="menu-button-overlay" title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>

          {isMenuOpen && (
            <div className="menu-dropdown">
              <button onClick={handleLogoutClick} className="menu-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                Esci
              </button>
            </div>
          )}
        </div>
      </div>
      
      <SpotOverlay 
        location={selectedLocation}
        isOpen={isOverlayOpen}
        onClose={handleCloseOverlay}
      />
      
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={handleCloseSearch}
        regions={regions}
        onLocationSelect={handleSearchLocationSelect}
        onLocationView={handleSearchLocationView}
      />

      <FavouritesOverlay
        isOpen={isFavouritesOpen}
        onClose={handleCloseFavourites}
        regions={regions}
        onLocationSelect={handleSearchLocationSelect}
        onLocationView={handleSearchLocationView}
      />

      <LogoutConfirmationOverlay
        isOpen={isLogoutConfirmOpen}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </div>
  );
};