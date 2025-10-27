import { useState } from 'react';
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

// Wrapper to look up location from context
function SpotOverlayWrapper({ windgramId }: { windgramId: string }) {
  const { findLocationById } = useMapContext();
  const location = findLocationById(windgramId);

  if (!location) return null;

  return <SpotOverlay location={location} />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(apiClient.isAuthenticated());

  const handleLogout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Router>
      <div className="app">
        <MapProvider onLogout={handleLogout}>
          <Route path="/" nest>
            <MapPage onLogout={handleLogout} />

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
              <LogoutConfirmationOverlay onLogout={handleLogout} />
            </Route>
          </Route>
        </MapProvider>
      </div>
    </Router>
  );
}

export default App;