import React, { useState, useEffect } from 'react';
import { Route, Router } from 'wouter';
import './App.css';
import { apiClient } from './api/client';
import { AuthPage } from './components/AuthPage';
import { MapPage } from './components/MapPage';
import { SearchOverlay } from './components/SearchOverlay';
import { FavouritesOverlay } from './components/FavouritesOverlay';
import { SpotOverlay } from './components/SpotOverlay';
import { LogoutConfirmationOverlay } from './components/LogoutConfirmationOverlay';
import { MapProvider, useMapContext } from './contexts/MapContext';

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  return (
    <MapProvider onLogout={onLogout}>
      <Route path="/" nest>
        <MapPage onLogout={onLogout} />

        {/* Nested overlay routes */}
        <Route path="/search" nest>
          <SearchOverlay />

          <Route path="/spot/:windgramId">
            {(params) => <SpotOverlayWrapper windgramId={params.windgramId} />}
          </Route>
        </Route>

        <Route path="/favourites" nest>
          <FavouritesOverlay />

          <Route path="/spot/:windgramId">
            {(params) => <SpotOverlayWrapper windgramId={params.windgramId} />}
          </Route>
        </Route>

        <Route path="/spot/:windgramId">
          {(params) => <SpotOverlayWrapper windgramId={params.windgramId} />}
        </Route>

        <Route path="/logout">
          <LogoutConfirmationOverlay onLogout={onLogout} />
        </Route>
      </Route>
    </MapProvider>
  );
}

// Wrapper to look up location from context
function SpotOverlayWrapper({ windgramId }: { windgramId: string }) {
  const { findLocationById } = useMapContext();
  const location = findLocationById(windgramId);

  if (!location) return null;

  return <SpotOverlay location={location} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(apiClient.isAuthenticated());
    setIsLoading(false);
  }, []);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <AuthenticatedApp onLogout={handleLogout} />
      </div>
    </Router>
  );
}

export default App;